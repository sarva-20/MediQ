from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.api.deps import (
    ensure_visit_provider_scope,
    get_visit_or_404,
    not_implemented,
    require_roles,
)
from app.core.db import get_session
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.lifecycle import DelayRequest, PriorityRequest
from app.schemas.visit import VisitOut

router = APIRouter(prefix="/visits", tags=["lifecycle"])

require_provider = require_roles(UserRole.PROVIDER)
require_provider_or_receptionist = require_roles(UserRole.PROVIDER, UserRole.RECEPTIONIST)
require_staff = require_roles(UserRole.RECEPTIONIST, UserRole.ADMIN)


@router.post("/{visit_id}/start", response_model=VisitOut)
def start_visit(
    visit_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_provider),
) -> VisitOut:
    visit = get_visit_or_404(visit_id, session)
    ensure_visit_provider_scope(current_user, visit)
    raise not_implemented("Module M6 - Lifecycle events and recompute")


@router.post("/{visit_id}/delay", response_model=VisitOut)
def delay_visit(
    visit_id: int,
    body: DelayRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_provider_or_receptionist),
) -> VisitOut:
    visit = get_visit_or_404(visit_id, session)
    ensure_visit_provider_scope(current_user, visit)
    raise not_implemented("Module M6 - Lifecycle events and recompute")


@router.post("/{visit_id}/complete", response_model=VisitOut)
def complete_visit(
    visit_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_provider),
) -> VisitOut:
    visit = get_visit_or_404(visit_id, session)
    ensure_visit_provider_scope(current_user, visit)
    raise not_implemented("Module M6 - Lifecycle events and recompute")


@router.post("/{visit_id}/no-show", response_model=VisitOut)
def mark_no_show(
    visit_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_provider_or_receptionist),
) -> VisitOut:
    visit = get_visit_or_404(visit_id, session)
    ensure_visit_provider_scope(current_user, visit)
    raise not_implemented("Module M6 - Lifecycle events and recompute")


@router.post("/{visit_id}/priority", response_model=VisitOut)
def set_priority(
    visit_id: int,
    body: PriorityRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_staff),
) -> VisitOut:
    """Staff only. See PriorityRequest — no symptom/clinical field exists here."""
    get_visit_or_404(visit_id, session)
    raise not_implemented("Module M6 - Lifecycle events and recompute")
