from fastapi import APIRouter

from app.api.deps import not_implemented
from app.schemas.sim import AdvanceRequest, SimClockOut

router = APIRouter(prefix="/sim", tags=["simulation"])


@router.get("/clock", response_model=SimClockOut)
def get_sim_clock() -> SimClockOut:
    raise not_implemented("Module M8 - Simulator dashboard")


@router.post("/advance", response_model=SimClockOut)
def advance_sim_clock(body: AdvanceRequest) -> SimClockOut:
    raise not_implemented("Module M8 - Simulator dashboard")


@router.post("/reset", response_model=SimClockOut)
def reset_sim_clock() -> SimClockOut:
    raise not_implemented("Module M8 - Simulator dashboard")


@router.post("/seed", status_code=202)
def reseed_demo_data() -> None:
    raise not_implemented("Module M8 - Simulator dashboard")
