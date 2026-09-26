from fastapi import APIRouter, Depends

from app.api.deps import not_implemented, require_roles
from app.models.enums import UserRole
from app.schemas.sim import AdvanceRequest, SimClockOut

router = APIRouter(
    prefix="/sim", tags=["simulation"], dependencies=[Depends(require_roles(UserRole.ADMIN))]
)


@router.get("/clock", response_model=SimClockOut)
def get_sim_clock() -> SimClockOut:
    raise not_implemented("Module M8 - Simulator dashboard")


@router.post("/advance", response_model=SimClockOut)
def advance_sim_clock(body: AdvanceRequest) -> SimClockOut:
    raise not_implemented("Module M8 - Simulator dashboard")


@router.post("/freeze", response_model=SimClockOut)
def freeze_sim_clock() -> SimClockOut:
    """Wraps app.core.clock.freeze — added for the console's Freeze/Resume
    controls; the underlying clock logic is already implemented and unit-tested
    (see backend/tests/test_clock.py), only the HTTP surface is still M8."""
    raise not_implemented("Module M8 - Simulator dashboard")


@router.post("/resume", response_model=SimClockOut)
def resume_sim_clock() -> SimClockOut:
    raise not_implemented("Module M8 - Simulator dashboard")


@router.post("/reset", response_model=SimClockOut)
def reset_sim_clock() -> SimClockOut:
    raise not_implemented("Module M8 - Simulator dashboard")


@router.post("/seed", status_code=202)
def reseed_demo_data() -> None:
    raise not_implemented("Module M8 - Simulator dashboard")
