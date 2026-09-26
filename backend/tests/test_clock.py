import time as wall_time
from datetime import timedelta

from sqlmodel import Session

from app.core import clock


def test_advance_moves_effective_time_forward(session: Session) -> None:
    before = clock.now(session)
    clock.advance(session, 30)
    after = clock.now(session)

    assert after - before >= timedelta(minutes=30)


def test_freeze_stops_effective_time(session: Session) -> None:
    clock.freeze(session)
    first = clock.now(session)
    wall_time.sleep(0.05)
    second = clock.now(session)

    assert first == second


def test_unfreeze_resumes_wall_time(session: Session) -> None:
    clock.freeze(session)
    frozen = clock.now(session)
    wall_time.sleep(0.05)
    clock.unfreeze(session)
    resumed = clock.now(session)

    assert resumed > frozen


def test_reset_clears_offset_and_freeze(session: Session) -> None:
    clock.advance(session, 60)
    clock.freeze(session)

    clock.reset(session)
    row = clock.get_or_create_clock(session)

    assert row.offset_minutes == 0
    assert row.is_frozen is False
    assert row.frozen_at is None
