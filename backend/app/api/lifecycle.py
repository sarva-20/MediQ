from fastapi import APIRouter

from app.api.deps import not_implemented
from app.schemas.lifecycle import DelayRequest, PriorityRequest
from app.schemas.visit import VisitOut

router = APIRouter(prefix="/visits", tags=["lifecycle"])


@router.post("/{visit_id}/start", response_model=VisitOut)
def start_visit(visit_id: int) -> VisitOut:
    raise not_implemented("Module M6 - Lifecycle events and recompute")


@router.post("/{visit_id}/delay", response_model=VisitOut)
def delay_visit(visit_id: int, body: DelayRequest) -> VisitOut:
    raise not_implemented("Module M6 - Lifecycle events and recompute")


@router.post("/{visit_id}/complete", response_model=VisitOut)
def complete_visit(visit_id: int) -> VisitOut:
    raise not_implemented("Module M6 - Lifecycle events and recompute")


@router.post("/{visit_id}/no-show", response_model=VisitOut)
def mark_no_show(visit_id: int) -> VisitOut:
    raise not_implemented("Module M6 - Lifecycle events and recompute")


@router.post("/{visit_id}/priority", response_model=VisitOut)
def set_priority(visit_id: int, body: PriorityRequest) -> VisitOut:
    """Staff only. See PriorityRequest — no symptom/clinical field exists here."""
    raise not_implemented("Module M6 - Lifecycle events and recompute")
