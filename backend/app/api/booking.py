from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.api.deps import (
    conflict,
    ensure_visit_patient_scope,
    get_visit_or_404,
    not_implemented,
    require_roles,
)
from app.core.db import get_session
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.booking import AppointmentCreate
from app.schemas.common import Page
from app.schemas.visit import VisitOut
from app.services import lifecycle_service
from app.services.lifecycle_service import InvalidTransitionError

router = APIRouter(tags=["booking"])

require_booker = require_roles(UserRole.PATIENT, UserRole.RECEPTIONIST)
require_appointment_viewer = require_roles(UserRole.PATIENT, UserRole.RECEPTIONIST, UserRole.ADMIN)
require_canceller = require_roles(UserRole.PATIENT, UserRole.RECEPTIONIST, UserRole.ADMIN)
require_checkin = require_roles(UserRole.RECEPTIONIST, UserRole.ADMIN)


@router.post("/appointments", response_model=VisitOut, status_code=201)
def create_appointment(
    body: AppointmentCreate,
    current_user: User = Depends(require_booker),
) -> VisitOut:
    raise not_implemented("Module M3 - Slots and booking")


@router.get("/appointments", response_model=Page[VisitOut])
def list_appointments(
    page: int = 1,
    page_size: int = 20,
    current_user: User = Depends(require_appointment_viewer),
) -> Page[VisitOut]:
    # A patient must only see their own visits — filtering by current_user.patient_id
    # happens in the real query once Module M3 implements it.
    raise not_implemented("Module M3 - Slots and booking")


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
