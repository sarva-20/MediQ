from fastapi import APIRouter

from app.api.deps import not_implemented
from app.schemas.booking import AppointmentCreate
from app.schemas.common import Page
from app.schemas.visit import VisitOut

router = APIRouter(tags=["booking"])


@router.post("/appointments", response_model=VisitOut, status_code=201)
def create_appointment(body: AppointmentCreate) -> VisitOut:
    raise not_implemented("Module M3 - Slots and booking")


@router.get("/appointments", response_model=Page[VisitOut])
def list_appointments(page: int = 1, page_size: int = 20) -> Page[VisitOut]:
    raise not_implemented("Module M3 - Slots and booking")


@router.post("/appointments/{visit_id}/cancel", response_model=VisitOut)
def cancel_appointment(visit_id: int) -> VisitOut:
    raise not_implemented("Module M6 - Lifecycle events and recompute")


@router.post("/visits/{visit_id}/check-in", response_model=VisitOut)
def check_in_visit(visit_id: int) -> VisitOut:
    raise not_implemented("Module M6 - Lifecycle events and recompute")
