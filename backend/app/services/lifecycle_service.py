"""Validates and applies lifecycle transitions on a Visit, then triggers a
recompute. Each function here backs one POST /api/visits/{id}/... (or
/appointments/{id}/cancel) endpoint; app.api.lifecycle/booking handle auth and
call straight into here."""

from datetime import datetime

from sqlmodel import Session, select

from app.core import clock
from app.engine.durations import ewma_update
from app.models.enums import QueueEventType, VisitStatus
from app.models.queue_event import QueueEvent
from app.models.service import Service
from app.models.service_duration_stat import ServiceDurationStat
from app.models.slot import Slot
from app.models.user import User
from app.models.visit import Visit
from app.services import queue_service
from app.services.events_bus import QueueEventMessage, publish


class InvalidTransitionError(Exception):
    """Raised for an illegal state transition; the API layer maps this to a
    409 in the standard error envelope."""


def _finish(
    session: Session,
    visit: Visit,
    actor: User,
    event_type: QueueEventType,
    now: datetime,
    **payload: object,
) -> queue_service.QueueSnapshot:
    session.add(visit)
    session.add(
        QueueEvent(
            visit_id=visit.id,
            provider_id=visit.provider_id,
            type=event_type,
            payload=payload,
            sim_time=now,
            actor_user_id=actor.id,
        )
    )
    session.commit()
    snapshot = queue_service.recompute_provider(session, visit.provider_id)
    publish(
        QueueEventMessage(
            provider_id=visit.provider_id,
            event_type=event_type.value,
            payload={"visit_id": visit.id},
        )
    )
    return snapshot


def check_in(session: Session, visit: Visit, actor: User) -> queue_service.QueueSnapshot:
    if visit.status is not VisitStatus.BOOKED:
        raise InvalidTransitionError(f"Cannot check in a visit with status '{visit.status}'.")
    now = clock.now(session)
    visit.status = VisitStatus.CHECKED_IN
    visit.checked_in_at = now
    return _finish(session, visit, actor, QueueEventType.CHECK_IN, now)


def start(session: Session, visit: Visit, actor: User) -> queue_service.QueueSnapshot:
    if visit.status not in (VisitStatus.CHECKED_IN, VisitStatus.BOOKED):
        raise InvalidTransitionError(f"Cannot start a visit with status '{visit.status}'.")

    other_in_service = session.exec(
        select(Visit).where(
            Visit.provider_id == visit.provider_id, Visit.status == VisitStatus.IN_SERVICE
        )
    ).first()
    if other_in_service is not None and other_in_service.id != visit.id:
        raise InvalidTransitionError("This provider already has a visit in service.")

    now = clock.now(session)
    auto_checked_in = visit.status is VisitStatus.BOOKED
    if auto_checked_in:
        visit.checked_in_at = now
    visit.status = VisitStatus.IN_SERVICE
    visit.started_at = now
    return _finish(
        session, visit, actor, QueueEventType.START, now, auto_checked_in=auto_checked_in
    )


def delay(
    session: Session, visit: Visit, actor: User, minutes: int, reason: str
) -> queue_service.QueueSnapshot:
    if visit.status not in (VisitStatus.IN_SERVICE, VisitStatus.CHECKED_IN, VisitStatus.BOOKED):
        raise InvalidTransitionError(f"Cannot delay a visit with status '{visit.status}'.")
    now = clock.now(session)
    visit.delay_minutes += minutes
    visit.delay_reason = reason
    return _finish(session, visit, actor, QueueEventType.DELAY, now, minutes=minutes, reason=reason)


def complete(session: Session, visit: Visit, actor: User) -> queue_service.QueueSnapshot:
    if visit.status is not VisitStatus.IN_SERVICE:
        raise InvalidTransitionError(f"Cannot complete a visit with status '{visit.status}'.")
    now = clock.now(session)
    visit.status = VisitStatus.COMPLETED
    visit.completed_at = now

    service = session.get(Service, visit.service_id)
    # started_at..now includes any prep time; subtract the service's configured
    # prep_time_min so the learned average stays comparable to default_duration_min
    # (engine.expected_duration_minutes adds prep_time_min back on top of it).
    actual_total = (now - visit.started_at).total_seconds() / 60
    actual_base = max(0.0, actual_total - service.prep_time_min)

    stat = session.get(ServiceDurationStat, (visit.provider_id, visit.service_id))
    if stat is None:
        stat = ServiceDurationStat(provider_id=visit.provider_id, service_id=visit.service_id)
    settings = queue_service.get_settings(session)
    stat.ewma_minutes = (
        actual_base
        if stat.sample_count == 0
        else ewma_update(stat.ewma_minutes, actual_base, settings.ewma_alpha)
    )
    stat.sample_count += 1
    session.add(stat)

    return _finish(
        session, visit, actor, QueueEventType.COMPLETE, now, actual_minutes=round(actual_total, 1)
    )


def mark_no_show(session: Session, visit: Visit, actor: User) -> queue_service.QueueSnapshot:
    if visit.status not in (VisitStatus.BOOKED, VisitStatus.CHECKED_IN):
        raise InvalidTransitionError(
            f"Cannot mark a visit with status '{visit.status}' as no-show."
        )
    now = clock.now(session)
    visit.status = VisitStatus.NO_SHOW
    visit.estimated_start = None
    visit.estimated_wait_min = None
    visit.eta_reason = None
    return _finish(session, visit, actor, QueueEventType.NO_SHOW, now, manual=True)


def cancel(session: Session, visit: Visit, actor: User) -> queue_service.QueueSnapshot:
    if visit.status not in (VisitStatus.BOOKED, VisitStatus.CHECKED_IN):
        raise InvalidTransitionError(f"Cannot cancel a visit with status '{visit.status}'.")
    now = clock.now(session)
    visit.status = VisitStatus.CANCELLED
    visit.estimated_start = None
    visit.estimated_wait_min = None
    visit.eta_reason = None

    if visit.slot_id is not None:
        slot = session.get(Slot, visit.slot_id)
        if slot is not None and slot.start_at > now:
            slot.booked_count = max(0, slot.booked_count - 1)
            session.add(slot)

    return _finish(session, visit, actor, QueueEventType.CANCEL, now)


def set_priority(
    session: Session, visit: Visit, actor: User, flag: bool, reason: str
) -> queue_service.QueueSnapshot:
    if visit.status not in (VisitStatus.BOOKED, VisitStatus.CHECKED_IN):
        raise InvalidTransitionError(
            f"Cannot change priority on a visit with status '{visit.status}'."
        )
    now = clock.now(session)
    visit.priority_flag = flag
    visit.priority_reason = reason
    visit.priority_set_by_user_id = actor.id
    visit.priority_set_at = now if flag else None
    return _finish(
        session, visit, actor, QueueEventType.PRIORITY_SET, now, flag=flag, reason=reason
    )
