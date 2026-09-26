from datetime import UTC, datetime, timedelta

from sqlmodel import Session

from app.models.sim_clock import SIM_CLOCK_ROW_ID, SimClock

# All engine/service code must call now(session) instead of datetime.now() directly,
# so the same code path runs against real time in normal operation and against the
# simulated clock in a demo (docs/architecture.md § Simulated clock).


def _real_now() -> datetime:
    return datetime.now(UTC)


def get_or_create_clock(session: Session) -> SimClock:
    clock = session.get(SimClock, SIM_CLOCK_ROW_ID)
    if clock is None:
        clock = SimClock(id=SIM_CLOCK_ROW_ID)
        session.add(clock)
        session.commit()
        session.refresh(clock)
    return clock


def now(session: Session) -> datetime:
    clock = get_or_create_clock(session)
    base = clock.frozen_at if clock.is_frozen and clock.frozen_at is not None else _real_now()
    return base + timedelta(minutes=clock.offset_minutes)


def advance(session: Session, minutes: int) -> SimClock:
    clock = get_or_create_clock(session)
    clock.offset_minutes += minutes
    clock.updated_at = _real_now()
    session.add(clock)
    session.commit()
    session.refresh(clock)
    return clock


def freeze(session: Session) -> SimClock:
    """Stops wall time from advancing the clock further, keeping the current
    offset. Useful for a demo pause; advance() still works while frozen."""
    clock = get_or_create_clock(session)
    if not clock.is_frozen:
        clock.is_frozen = True
        clock.frozen_at = _real_now()
        clock.updated_at = _real_now()
        session.add(clock)
        session.commit()
        session.refresh(clock)
    return clock


def unfreeze(session: Session) -> SimClock:
    clock = get_or_create_clock(session)
    if clock.is_frozen:
        clock.is_frozen = False
        clock.frozen_at = None
        clock.updated_at = _real_now()
        session.add(clock)
        session.commit()
        session.refresh(clock)
    return clock


def reset(session: Session) -> SimClock:
    clock = get_or_create_clock(session)
    clock.offset_minutes = 0
    clock.is_frozen = False
    clock.frozen_at = None
    clock.updated_at = _real_now()
    session.add(clock)
    session.commit()
    session.refresh(clock)
    return clock
