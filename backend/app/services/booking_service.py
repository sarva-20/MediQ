"""Appointment booking. Capacity is enforced with a single atomic
`UPDATE ... WHERE booked_count < effective_capacity`, so two concurrent
bookings against the same slot can never both succeed past the limit — the
loser's UPDATE simply matches zero rows. Everything (the capacity claim, the
token allocation, the Visit insert) happens in one transaction, committed once."""

from sqlalchemy import update
from sqlmodel import Session, select

from app.core import clock
from app.models.department import Department
from app.models.enums import QueueEventType, VisitSource, VisitStatus
from app.models.patient import Patient
from app.models.provider import Provider
from app.models.queue_event import QueueEvent
from app.models.service import Service
from app.models.slot import Slot
from app.models.user import User
from app.models.visit import Visit
from app.services import queue_service
from app.services.errors import ConflictError, NotFoundError
from app.services.slot_service import effective_overbook_limit
from app.services.tokens import create_visit_with_token


def create_appointment(
    session: Session, actor: User, patient_id: int, provider_id: int, service_id: int, slot_id: int
) -> Visit:
    patient = session.get(Patient, patient_id)
    if patient is None:
        raise NotFoundError("Patient not found.")
    provider = session.get(Provider, provider_id)
    if provider is None or not provider.is_active:
        raise NotFoundError("Provider not found.")
    service = session.get(Service, service_id)
    if service is None:
        raise NotFoundError("Service not found.")
    if service.department_id != provider.department_id:
        raise ConflictError("This service is not offered by this provider's department.")
    slot = session.get(Slot, slot_id)
    if slot is None:
        raise NotFoundError("Slot not found.")
    if slot.provider_id != provider_id:
        raise ConflictError("This slot does not belong to this provider.")

    now = clock.now(session)
    if slot.end_at <= now:
        raise ConflictError("This slot has already ended.")

    overlap = session.exec(
        select(Visit)
        .join(Slot, Slot.id == Visit.slot_id)
        .where(
            Visit.patient_id == patient_id,
            Visit.status.in_((VisitStatus.BOOKED, VisitStatus.CHECKED_IN, VisitStatus.IN_SERVICE)),
            Slot.start_at < slot.end_at,
            Slot.end_at > slot.start_at,
        )
    ).first()
    if overlap is not None:
        raise ConflictError("This patient already has an active visit during this time.")

    settings = queue_service.get_settings(session)
    overbook = effective_overbook_limit(provider, settings.default_overbook_limit)
    effective_capacity = slot.capacity + overbook

    result = session.exec(
        update(Slot)
        .where(Slot.id == slot_id, Slot.booked_count < effective_capacity)
        .values(booked_count=Slot.booked_count + 1)
    )
    if result.rowcount == 0:
        session.rollback()
        raise ConflictError("This slot is fully booked.")
    session.refresh(slot)
    is_overbooked = slot.booked_count > slot.capacity

    department = session.get(Department, provider.department_id)

    def build(token_no: str) -> Visit:
        return Visit(
            patient_id=patient_id,
            provider_id=provider_id,
            service_id=service_id,
            slot_id=slot_id,
            source=VisitSource.APPOINTMENT,
            token_no=token_no,
            status=VisitStatus.BOOKED,
            scheduled_start=slot.start_at,
            is_overbooked=is_overbooked,
        )

    visit = create_visit_with_token(
        session, build, department.code, VisitSource.APPOINTMENT, slot.start_at
    )
    session.add(
        QueueEvent(
            visit_id=visit.id,
            provider_id=provider_id,
            type=QueueEventType.BOOK,
            payload={"slot_id": slot_id, "is_overbooked": is_overbooked},
            sim_time=now,
            actor_user_id=actor.id,
        )
    )
    session.commit()
    session.refresh(visit)

    queue_service.recompute_provider(session, provider_id)
    return visit
