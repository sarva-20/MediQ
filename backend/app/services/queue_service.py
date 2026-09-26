"""Bridges the pure engine (app.engine, no DB) to SQLModel: loads a provider's
current state, runs the engine, and persists the result. This is the only
place that calls app.engine — lifecycle endpoints call recompute_provider()
after every state change; app.api.sim calls recompute_all() after the clock
advances so no-shows apply and estimates update without a lifecycle event."""

from dataclasses import dataclass

from sqlmodel import Session, select

from app.core import clock
from app.engine import (
    EngineInput,
    EngineSettings,
    InServiceVisit,
    ServiceDurationInput,
    VisitPlacement,
    WaitingVisit,
)
from app.engine import run as run_engine
from app.models.clinic_settings import SETTINGS_ROW_ID, ClinicSettings
from app.models.enums import QueueEventType, VisitStatus
from app.models.provider import Provider
from app.models.queue_event import QueueEvent
from app.models.service import Service
from app.models.service_duration_stat import ServiceDurationStat
from app.models.visit import Visit
from app.services.events_bus import QueueEventMessage, publish

# A visit reads as "delayed" in queue summaries if it was explicitly delayed,
# or if its own estimate has drifted more than this many minutes past its
# original schedule — distinct from ClinicSettings.noshow_grace_minutes, which
# happens to also be 10 right now but governs a different rule (auto-no-show).
DELAYED_THRESHOLD_MINUTES = 10


@dataclass
class QueueSnapshot:
    provider: Provider
    in_service_visit: Visit | None
    in_service_overrun: bool
    placements: list[VisitPlacement]  # position-ordered; waiting visits only
    visits_by_id: dict[int, Visit]  # every visit referenced by `placements`


def get_settings(session: Session) -> ClinicSettings:
    settings = session.get(ClinicSettings, SETTINGS_ROW_ID)
    if settings is None:
        settings = ClinicSettings()
        session.add(settings)
        session.commit()
        session.refresh(settings)
    return settings


def _duration_input(session: Session, provider_id: int, service: Service) -> ServiceDurationInput:
    stat = session.get(ServiceDurationStat, (provider_id, service.id))
    return ServiceDurationInput(
        default_duration_min=service.default_duration_min,
        prep_time_min=service.prep_time_min,
        ewma_minutes=stat.ewma_minutes if stat else None,
        sample_count=stat.sample_count if stat else 0,
    )


def is_delayed(visit: Visit, placement: VisitPlacement | None) -> bool:
    if visit.delay_minutes > 0:
        return True
    return placement is not None and placement.expected_delay_min > DELAYED_THRESHOLD_MINUTES


def load(snapshot: QueueSnapshot) -> int:
    return len(snapshot.placements) + (1 if snapshot.in_service_visit else 0)


def delayed_count(snapshot: QueueSnapshot) -> int:
    in_service_delayed = snapshot.in_service_visit is not None and (
        snapshot.in_service_visit.delay_minutes > 0 or snapshot.in_service_overrun
    )
    waiting_delayed = sum(
        1
        for placement in snapshot.placements
        if is_delayed(snapshot.visits_by_id[placement.visit_id], placement)
    )
    return waiting_delayed + (1 if in_service_delayed else 0)


def recompute_provider(session: Session, provider_id: int) -> QueueSnapshot:
    provider = session.get(Provider, provider_id)
    if provider is None:
        raise ValueError(f"Unknown provider_id={provider_id}")

    now = clock.now(session)
    settings = get_settings(session)

    in_service_visit = session.exec(
        select(Visit).where(
            Visit.provider_id == provider_id, Visit.status == VisitStatus.IN_SERVICE
        )
    ).first()
    waiting_visits = list(
        session.exec(
            select(Visit).where(
                Visit.provider_id == provider_id,
                Visit.status.in_((VisitStatus.BOOKED, VisitStatus.CHECKED_IN)),
            )
        ).all()
    )

    services_by_id: dict[int, Service] = {}

    def service_for(service_id: int) -> Service:
        if service_id not in services_by_id:
            services_by_id[service_id] = session.get(Service, service_id)
        return services_by_id[service_id]

    engine_in_service = None
    if in_service_visit is not None:
        engine_in_service = InServiceVisit(
            id=in_service_visit.id,
            started_at=in_service_visit.started_at,
            delay_minutes=in_service_visit.delay_minutes,
            duration=_duration_input(
                session, provider_id, service_for(in_service_visit.service_id)
            ),
        )

    engine_waiting = [
        WaitingVisit(
            id=v.id,
            source=v.source,
            status=v.status,
            scheduled_start=v.scheduled_start,
            created_at=v.created_at,
            priority_flag=v.priority_flag,
            priority_set_at=v.priority_set_at,
            delay_minutes=v.delay_minutes,
            delay_reason=v.delay_reason,
            previous_estimated_start=v.estimated_start,
            duration=_duration_input(session, provider_id, service_for(v.service_id)),
        )
        for v in waiting_visits
    ]

    result = run_engine(
        EngineInput(
            now=now,
            settings=EngineSettings(noshow_grace_minutes=settings.noshow_grace_minutes),
            in_service=engine_in_service,
            waiting=engine_waiting,
        )
    )

    visits_by_id = {v.id: v for v in waiting_visits}

    for visit_id in result.expired_visit_ids:
        visit = visits_by_id[visit_id]
        visit.status = VisitStatus.NO_SHOW
        visit.estimated_start = None
        visit.estimated_wait_min = None
        visit.eta_reason = None
        session.add(visit)
        session.add(
            QueueEvent(
                visit_id=visit.id,
                provider_id=provider_id,
                type=QueueEventType.NO_SHOW,
                payload={"reason": "auto: past scheduled_start + grace period"},
                sim_time=now,
            )
        )

    for placement in result.placements:
        visit = visits_by_id[placement.visit_id]
        if visit.estimated_start != placement.estimated_start:
            session.add(
                QueueEvent(
                    visit_id=visit.id,
                    provider_id=provider_id,
                    type=QueueEventType.ETA_CHANGED,
                    payload={
                        "before": visit.estimated_start.isoformat()
                        if visit.estimated_start
                        else None,
                        "after": placement.estimated_start.isoformat(),
                        "reason": placement.eta_reason,
                    },
                    sim_time=now,
                )
            )
        visit.estimated_start = placement.estimated_start
        visit.estimated_wait_min = placement.estimated_wait_min
        visit.eta_reason = placement.eta_reason
        session.add(visit)

    session.commit()
    publish(QueueEventMessage(provider_id=provider_id, event_type="recompute", payload={}))

    if in_service_visit is not None:
        visits_by_id[in_service_visit.id] = in_service_visit

    return QueueSnapshot(
        provider=provider,
        in_service_visit=in_service_visit,
        in_service_overrun=result.in_service_overrun,
        placements=result.placements,
        visits_by_id=visits_by_id,
    )


def recompute_all(session: Session) -> list[QueueSnapshot]:
    provider_ids = [
        p.id for p in session.exec(select(Provider).where(Provider.is_active.is_(True))).all()
    ]
    return [recompute_provider(session, provider_id) for provider_id in provider_ids]
