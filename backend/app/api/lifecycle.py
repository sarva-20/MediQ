from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.api.deps import (
    conflict,
    ensure_visit_provider_scope,
    get_visit_or_404,
    require_roles,
)
from app.core.db import get_session
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.lifecycle import DelayRequest, PriorityRequest
from app.schemas.visit import VisitOut
from app.services import lifecycle_service
from app.services.lifecycle_service import InvalidTransitionError

router = APIRouter(prefix="/visits", tags=["lifecycle"])

require_provider = require_roles(UserRole.PROVIDER, UserRole.ADMIN)
require_provider_or_receptionist = require_roles(
    UserRole.PROVIDER, UserRole.RECEPTIONIST, UserRole.ADMIN
)
require_staff = require_roles(UserRole.RECEPTIONIST, UserRole.ADMIN)


@router.post(
    "/{visit_id}/start",
    response_model=VisitOut,
    responses={
        409: {"description": "Not checked-in/booked, or provider already has someone in service."}
    },
)
def start_visit(
    visit_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_provider),
) -> VisitOut:
    visit = get_visit_or_404(visit_id, session)
    ensure_visit_provider_scope(current_user, visit)
    try:
        lifecycle_service.start(session, visit, current_user)
    except InvalidTransitionError as exc:
        raise conflict(str(exc)) from exc
    return VisitOut.model_validate(visit)


@router.post(
    "/{visit_id}/delay",
    response_model=VisitOut,
    responses={409: {"description": "Visit has already completed, been cancelled, or no-showed."}},
)
def delay_visit(
    visit_id: int,
    body: DelayRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_provider_or_receptionist),
) -> VisitOut:
    visit = get_visit_or_404(visit_id, session)
    ensure_visit_provider_scope(current_user, visit)
    try:
        lifecycle_service.delay(session, visit, current_user, body.minutes, body.reason)
    except InvalidTransitionError as exc:
        raise conflict(str(exc)) from exc
    return VisitOut.model_validate(visit)


@router.post(
    "/{visit_id}/complete",
    response_model=VisitOut,
    responses={409: {"description": "Visit isn't currently in service."}},
)
def complete_visit(
    visit_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_provider),
) -> VisitOut:
    visit = get_visit_or_404(visit_id, session)
    ensure_visit_provider_scope(current_user, visit)
    try:
        lifecycle_service.complete(session, visit, current_user)
    except InvalidTransitionError as exc:
        raise conflict(str(exc)) from exc
    return VisitOut.model_validate(visit)


@router.post(
    "/{visit_id}/no-show",
    response_model=VisitOut,
    responses={409: {"description": "Visit isn't booked or checked-in."}},
)
def mark_no_show(
    visit_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_provider_or_receptionist),
) -> VisitOut:
    visit = get_visit_or_404(visit_id, session)
    ensure_visit_provider_scope(current_user, visit)
    try:
        lifecycle_service.mark_no_show(session, visit, current_user)
    except InvalidTransitionError as exc:
        raise conflict(str(exc)) from exc
    return VisitOut.model_validate(visit)


@router.post(
    "/{visit_id}/priority",
    response_model=VisitOut,
    responses={
        409: {"description": "Visit has already started, completed, been cancelled, or no-showed."}
    },
)
def set_priority(
    visit_id: int,
    body: PriorityRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_staff),
) -> VisitOut:
    """Staff only. See PriorityRequest — no symptom/clinical field exists here."""
    visit = get_visit_or_404(visit_id, session)
    try:
        lifecycle_service.set_priority(session, visit, current_user, body.flag, body.reason)
    except InvalidTransitionError as exc:
        raise conflict(str(exc)) from exc
    return VisitOut.model_validate(visit)
