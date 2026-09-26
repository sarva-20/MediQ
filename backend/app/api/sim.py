from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.api.deps import require_roles
from app.core import clock
from app.core.db import get_session
from app.models.enums import UserRole
from app.models.sim_clock import SimClock
from app.schemas.sim import AdvanceRequest, SimClockOut
from app.seed.run import seed
from app.services import queue_service

router = APIRouter(
    prefix="/sim", tags=["simulation"], dependencies=[Depends(require_roles(UserRole.ADMIN))]
)


def _clock_out(session: Session, sim_clock: SimClock) -> SimClockOut:
    return SimClockOut(
        effective_time=clock.now(session),
        offset_minutes=sim_clock.offset_minutes,
        is_frozen=sim_clock.is_frozen,
    )


@router.get("/clock", response_model=SimClockOut)
def get_sim_clock(session: Session = Depends(get_session)) -> SimClockOut:
    return _clock_out(session, clock.get_or_create_clock(session))


@router.post("/advance", response_model=SimClockOut)
def advance_sim_clock(body: AdvanceRequest, session: Session = Depends(get_session)) -> SimClockOut:
    sim_clock = clock.advance(session, body.minutes)
    queue_service.recompute_all(session)  # applies no-shows, refreshes every estimate
    return _clock_out(session, sim_clock)


@router.post("/freeze", response_model=SimClockOut)
def freeze_sim_clock(session: Session = Depends(get_session)) -> SimClockOut:
    return _clock_out(session, clock.freeze(session))


@router.post("/resume", response_model=SimClockOut)
def resume_sim_clock(session: Session = Depends(get_session)) -> SimClockOut:
    return _clock_out(session, clock.unfreeze(session))


@router.post("/reset", response_model=SimClockOut)
def reset_sim_clock(session: Session = Depends(get_session)) -> SimClockOut:
    sim_clock = clock.reset(session)
    queue_service.recompute_all(session)
    return _clock_out(session, sim_clock)


@router.post("/seed", status_code=202)
def reseed_demo_data(session: Session = Depends(get_session)) -> None:
    seed(session, reset=True)
