from datetime import UTC, datetime, time, timedelta
from datetime import date as date_type

from fastapi import APIRouter, Depends
from sqlmodel import Session, func, select

from app.api.deps import (
    conflict,
    ensure_patient_scope,
    ensure_visit_patient_scope,
    get_visit_or_404,
    not_found,
    require_roles,
)
from app.core.db import get_session
from app.models.enums import UserRole, VisitSource, VisitStatus
from app.models.provider import Provider
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
require_appointment_viewer = require_roles(UserRole.PATIENT, UserRole.RECEPTIONIST, UserRole.ADMIN)
require_canceller = require_roles(UserRole.PATIENT, UserRole.RECEPTIONIST, UserRole.ADMIN)
require_checkin = require_roles(UserRole.RECEPTIONIST, UserRole.ADMIN)

MAX_PAGE_SIZE = 100


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
    query = select(Visit).where(Visit.source == VisitSource.APPOINTMENT)
    if current_user.role is UserRole.PATIENT:
        query = query.where(Visit.patient_id == current_user.patient_id)
    if provider_id is not None:
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
        query.order_by(Visit.scheduled_start).offset((page - 1) * page_size).limit(page_size)
    ).all()
    return Page(
        items=[VisitOut.model_validate(v) for v in items],
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
