"""Walk-in creation with load-balanced routing. When no provider_id is given,
the pure engine (app.engine) is run once per active provider in the
department with a hypothetical walk-in appended to its queue, and whichever
provider gives the shortest hypothetical wait is chosen — nothing is written
to the database for the providers not chosen; only `run_engine` (pure) runs
against each candidate."""

from datetime import datetime

from sqlmodel import Session, func, select

from app.core import clock
from app.engine import WaitingVisit
from app.engine import run as run_engine
from app.models.department import Department
from app.models.enums import QueueEventType, VisitSource, VisitStatus
from app.models.patient import Patient
from app.models.provider import Provider
from app.models.queue_event import QueueEvent
from app.models.service import Service
from app.models.user import User
from app.models.visit import Visit
from app.schemas.walkin import WalkInCreate
from app.services import queue_service
from app.services.errors import BusinessValidationError, NotFoundError
from app.services.events_bus import QueueEventMessage, publish
from app.services.queue_service import QueueSnapshot
from app.services.tokens import create_visit_with_token

_HYPOTHETICAL_VISIT_ID = -1


def _active_visit_count(session: Session, provider_id: int) -> int:
    return session.exec(
        select(func.count())
        .select_from(Visit)
        .where(
            Visit.provider_id == provider_id,
            Visit.status.in_((VisitStatus.BOOKED, VisitStatus.CHECKED_IN, VisitStatus.IN_SERVICE)),
        )
    ).one()


def _hypothetical_wait_minutes(
    session: Session, provider: Provider, service: Service, now: datetime
) -> int:
    duration = queue_service.duration_input(session, provider.id, service)
    hypothetical = WaitingVisit(
        id=_HYPOTHETICAL_VISIT_ID,
        source=VisitSource.WALKIN,
        status=VisitStatus.CHECKED_IN,
        scheduled_start=None,
        created_at=now,
        priority_flag=False,
        priority_set_at=None,
        delay_minutes=0,
        delay_reason=None,
        previous_estimated_start=None,
        duration=duration,
    )
    engine_input, _, _ = queue_service.build_engine_input(
        session, provider.id, now, extra_waiting=[hypothetical]
    )
    result = run_engine(engine_input)
    placement = next(p for p in result.placements if p.visit_id == _HYPOTHETICAL_VISIT_ID)
    return placement.estimated_wait_min


def choose_provider(
    session: Session, department_id: int, service: Service, now: datetime
) -> tuple[Provider, str]:
    candidates = list(
        session.exec(
            select(Provider).where(
                Provider.department_id == department_id, Provider.is_active.is_(True)
            )
        ).all()
    )
    if not candidates:
        raise NotFoundError("No active providers in this department.")

    scored = sorted(
        (
            (
                _hypothetical_wait_minutes(session, provider, service, now),
                _active_visit_count(session, provider.id),
                provider.id,
                provider,
            )
            for provider in candidates
        ),
        key=lambda row: (row[0], row[1], row[2]),
    )
    best_wait = scored[0][0]
    best_provider = scored[0][3]
    if len(scored) > 1:
        runner_up_wait = scored[1][0]
        explanation = (
            f"Routed to {best_provider.name}: shortest wait "
            f"({best_wait} min vs {runner_up_wait} min)"
        )
    else:
        explanation = f"Routed to {best_provider.name}: only active provider in department"
    return best_provider, explanation


def _resolve_patient(session: Session, body: WalkInCreate) -> Patient:
    if body.patient_id is not None:
        patient = session.get(Patient, body.patient_id)
        if patient is None:
            raise NotFoundError("Patient not found.")
        return patient
    patient = Patient(full_name=body.full_name, phone=body.phone, is_simulated=True)
    session.add(patient)
    session.commit()
    session.refresh(patient)
    return patient


def create_walk_in(
    session: Session, actor: User, body: WalkInCreate
) -> tuple[Visit, str, QueueSnapshot]:
    now = clock.now(session)

    department = session.get(Department, body.department_id)
    if department is None:
        raise NotFoundError("Department not found.")
    service = session.get(Service, body.service_id)
    if service is None or service.department_id != body.department_id:
        raise BusinessValidationError("This service is not offered by this department.")

    patient = _resolve_patient(session, body)

    if body.provider_id is not None:
        provider = session.get(Provider, body.provider_id)
        if (
            provider is None
            or provider.department_id != body.department_id
            or not provider.is_active
        ):
            raise NotFoundError("Provider not found in this department.")
        explanation = f"Routed to {provider.name}: requested by receptionist"
    else:
        settings = queue_service.get_settings(session)
        if not settings.walkin_routing_enabled:
            raise BusinessValidationError(
                "provider_id is required: walk-in auto-routing is disabled in clinic settings."
            )
        provider, explanation = choose_provider(session, body.department_id, service, now)

    def build(token_no: str) -> Visit:
        return Visit(
            patient_id=patient.id,
            provider_id=provider.id,
            service_id=service.id,
            source=VisitSource.WALKIN,
            token_no=token_no,
            status=VisitStatus.CHECKED_IN,
            checked_in_at=now,
        )

    visit = create_visit_with_token(session, build, department.code, VisitSource.WALKIN, now)
    session.add(
        QueueEvent(
            visit_id=visit.id,
            provider_id=provider.id,
            type=QueueEventType.WALK_IN,
            payload={"routing": explanation},
            sim_time=now,
            actor_user_id=actor.id,
        )
    )
    session.commit()
    session.refresh(visit)

    snapshot = queue_service.recompute_provider(session, provider.id)
    publish(
        QueueEventMessage(
            provider_id=provider.id, event_type="walk_in", payload={"visit_id": visit.id}
        )
    )
    return visit, explanation, snapshot
