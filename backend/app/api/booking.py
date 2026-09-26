from datetime import UTC, datetime, time, timedelta
from datetime import date as date_type

from fastapi import APIRouter, Depends
from sqlmodel import Session, func, select

from app.api.deps import (
    conflict,
    ensure_patient_scope,
    ensure_visit_patient_scope,
    forbidden,
    get_visit_or_404,
    not_found,
    require_roles,
)
from app.core.db import get_session
from app.models.enums import UserRole, VisitStatus
from app.models.patient import Patient
from app.models.provider import Provider
from app.models.service import Service
from app.models.user import User
from app.models.visit import Visit
from app.schemas.booking import AppointmentCreate
from app.schemas.common import Page
from app.schemas.visit import VisitOut
from app.services import booking_service, lifecycle_service
from app.services.errors import ConflictError, NotFoundError
from app.services.lifecycle_service import InvalidTransitionError

router = APIRouter(tags=["booking"])

require_booker = require_roles(UserRole.PATIENT, UserRole.RECEPTIONIST)
require_appointment_viewer = require_roles(
    UserRole.PATIENT, UserRole.RECEPTIONIST, UserRole.PROVIDER, UserRole.ADMIN
)
require_canceller = require_roles(UserRole.PATIENT, UserRole.RECEPTIONIST, UserRole.ADMIN)
require_checkin = require_roles(UserRole.RECEPTIONIST, UserRole.ADMIN)

MAX_PAGE_SIZE = 200


@router.post(
    "/appointments",
    response_model=VisitOut,
    status_code=201,
    responses={
        409: {"description": "Slot full, already ended, or the patient has an overlapping visit."}
    },
)
def create_appointment(
    body: AppointmentCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_booker),
) -> VisitOut:
    ensure_patient_scope(current_user, body.patient_id)
    try:
        visit = booking_service.create_appointment(
            session, current_user, body.patient_id, body.provider_id, body.service_id, body.slot_id
        )
    except NotFoundError as exc:
        raise not_found(str(exc)) from exc
    except ConflictError as exc:
        raise conflict(str(exc)) from exc
    return VisitOut.model_validate(visit)


def _enrich_visit_out(session: Session, visit: Visit, include_phone: bool) -> VisitOut:
    service = session.get(Service, visit.service_id)
    provider = session.get(Provider, visit.provider_id)
    out = VisitOut.model_validate(visit)
    out.service_name = service.name if service else None
    out.department_id = provider.department_id if provider else None
    if include_phone:
        patient = session.get(Patient, visit.patient_id)
        out.phone = patient.phone if patient else None
    return out


@router.get("/appointments", response_model=Page[VisitOut])
def list_appointments(
    page: int = 1,
    page_size: int = 20,
    provider_id: int | None = None,
    department_id: int | None = None,
    date: date_type | None = None,
    status: VisitStatus | None = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_appointment_viewer),
) -> Page[VisitOut]:
    page_size = min(page_size, MAX_PAGE_SIZE)
    query = select(Visit)
    include_phone = current_user.role in (UserRole.RECEPTIONIST, UserRole.PROVIDER, UserRole.ADMIN)

    if current_user.role is UserRole.PATIENT:
        query = query.where(Visit.patient_id == current_user.patient_id)
    elif current_user.role is UserRole.PROVIDER:
        if provider_id is not None and provider_id != current_user.provider_id:
            raise forbidden("You may only view your own provider's visits.")
        query = query.where(Visit.provider_id == current_user.provider_id)
    elif provider_id is not None:
        query = query.where(Visit.provider_id == provider_id)

    if department_id is not None:
        query = query.join(Provider, Provider.id == Visit.provider_id).where(
            Provider.department_id == department_id
        )
    if date is not None:
        day_start = datetime.combine(date, time.min, tzinfo=UTC)
        day_end = day_start + timedelta(days=1)
        query = query.where(Visit.scheduled_start >= day_start, Visit.scheduled_start < day_end)
    if status is not None:
        query = query.where(Visit.status == status)

    total = session.exec(select(func.count()).select_from(query.subquery())).one()
    items = session.exec(
        query.order_by(Visit.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    ).all()
    return Page(
        items=[_enrich_visit_out(session, v, include_phone) for v in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post(
    "/appointments/{visit_id}/cancel",
    response_model=VisitOut,
    responses={409: {"description": "Visit has already started, completed, or no-showed."}},
)
def cancel_appointment(
    visit_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_canceller),
) -> VisitOut:
    visit = get_visit_or_404(visit_id, session)
    ensure_visit_patient_scope(current_user, visit)
    try:
        lifecycle_service.cancel(session, visit, current_user)
    except InvalidTransitionError as exc:
        raise conflict(str(exc)) from exc
    return VisitOut.model_validate(visit)


@router.post(
    "/visits/{visit_id}/check-in",
    response_model=VisitOut,
    responses={409: {"description": "Visit isn't in BOOKED status."}},
)
def check_in_visit(
    visit_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_checkin),
) -> VisitOut:
    visit = get_visit_or_404(visit_id, session)
    try:
        lifecycle_service.check_in(session, visit, current_user)
    except InvalidTransitionError as exc:
        raise conflict(str(exc)) from exc
    return VisitOut.model_validate(visit)
