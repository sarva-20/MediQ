"""Table-driven unit tests for the pure queue engine (app/engine/). No DB, no
FastAPI — plain dataclasses in, plain dataclasses out."""

from datetime import UTC, datetime, timedelta

from app.engine import (
    EngineInput,
    EngineSettings,
    InServiceVisit,
    PlacementCause,
    ServiceDurationInput,
    WaitingVisit,
    ewma_update,
    run,
)
from app.engine.durations import expected_duration_minutes

NOW = datetime(2026, 9, 26, 9, 0, tzinfo=UTC)
SETTINGS = EngineSettings(noshow_grace_minutes=10)


def duration(default_min: int, prep_min: int = 0) -> ServiceDurationInput:
    return ServiceDurationInput(
        default_duration_min=default_min, prep_time_min=prep_min, ewma_minutes=None, sample_count=0
    )


def appointment(
    id: int,
    scheduled_start: datetime,
    *,
    status="checked_in",
    delay_minutes: int = 0,
    delay_reason: str | None = None,
    priority_flag: bool = False,
    priority_set_at: datetime | None = None,
    previous_estimated_start: datetime | None = None,
    dur: ServiceDurationInput | None = None,
) -> WaitingVisit:
    from app.models.enums import VisitSource, VisitStatus

    return WaitingVisit(
        id=id,
        source=VisitSource.APPOINTMENT,
        status=VisitStatus(status),
        scheduled_start=scheduled_start,
        created_at=scheduled_start - timedelta(hours=1),
        priority_flag=priority_flag,
        priority_set_at=priority_set_at,
        delay_minutes=delay_minutes,
        delay_reason=delay_reason,
        previous_estimated_start=previous_estimated_start,
        duration=dur or duration(15),
    )


def walkin(
    id: int,
    created_at: datetime,
    *,
    delay_minutes: int = 0,
    priority_flag: bool = False,
    priority_set_at: datetime | None = None,
    previous_estimated_start: datetime | None = None,
    dur: ServiceDurationInput | None = None,
) -> WaitingVisit:
    from app.models.enums import VisitSource, VisitStatus

    return WaitingVisit(
        id=id,
        source=VisitSource.WALKIN,
        status=VisitStatus.CHECKED_IN,
        scheduled_start=None,
        created_at=created_at,
        priority_flag=priority_flag,
        priority_set_at=priority_set_at,
        delay_minutes=delay_minutes,
        delay_reason=None,
        previous_estimated_start=previous_estimated_start,
        duration=dur or duration(15),
    )


def in_service(
    id: int, started_at: datetime, *, delay_minutes: int = 0, dur=None
) -> InServiceVisit:
    return InServiceVisit(
        id=id, started_at=started_at, delay_minutes=delay_minutes, duration=dur or duration(15)
    )


def test_empty_queue_has_no_placements_and_no_expired() -> None:
    result = run(EngineInput(now=NOW, settings=SETTINGS, in_service=None, waiting=[]))

    assert result.placements == []
    assert result.expired_visit_ids == []
    assert not result.in_service_overrun


def test_one_in_service_sets_cursor_and_no_one_is_waiting() -> None:
    started = NOW - timedelta(minutes=5)
    result = run(
        EngineInput(now=NOW, settings=SETTINGS, in_service=in_service(1, started), waiting=[])
    )

    assert result.placements == []
    assert not result.in_service_overrun


def test_anchored_appointments_are_ordered_by_scheduled_time() -> None:
    v1 = appointment(1, NOW + timedelta(minutes=30))
    v2 = appointment(2, NOW + timedelta(minutes=10))
    result = run(EngineInput(now=NOW, settings=SETTINGS, in_service=None, waiting=[v1, v2]))

    order = [p.visit_id for p in result.placements]
    assert order == [2, 1]
    p2 = next(p for p in result.placements if p.visit_id == 2)
    assert p2.estimated_start == NOW + timedelta(minutes=10)


def test_walkin_fills_a_gap_between_appointments() -> None:
    # Appointment at +30 (15 min) leaves a gap from now to +30 that a walk-in fits into.
    appt = appointment(1, NOW + timedelta(minutes=30))
    wi = walkin(2, NOW - timedelta(minutes=1))
    result = run(EngineInput(now=NOW, settings=SETTINGS, in_service=None, waiting=[appt, wi]))

    walkin_placement = next(p for p in result.placements if p.visit_id == 2)
    appt_placement = next(p for p in result.placements if p.visit_id == 1)
    assert walkin_placement.cause is PlacementCause.GAP_FILL
    assert walkin_placement.estimated_start == NOW
    assert walkin_placement.estimated_end <= appt_placement.estimated_start


def test_walkin_goes_after_last_block_when_no_gap_fits() -> None:
    # Appointment starts immediately (no gap at all) — the walk-in must trail it.
    appt = appointment(1, NOW)
    wi = walkin(2, NOW - timedelta(minutes=1))
    result = run(EngineInput(now=NOW, settings=SETTINGS, in_service=None, waiting=[appt, wi]))

    walkin_placement = next(p for p in result.placements if p.visit_id == 2)
    appt_placement = next(p for p in result.placements if p.visit_id == 1)
    assert walkin_placement.cause is PlacementCause.TAIL
    assert walkin_placement.estimated_start == appt_placement.estimated_end


def test_priority_visit_is_placed_first_regardless_of_schedule() -> None:
    appt = appointment(1, NOW)
    priority_wi = walkin(2, NOW - timedelta(minutes=30), priority_flag=True, priority_set_at=NOW)
    result = run(
        EngineInput(now=NOW, settings=SETTINGS, in_service=None, waiting=[appt, priority_wi])
    )

    assert result.placements[0].visit_id == 2
    assert result.placements[0].cause is PlacementCause.PRIORITY
    assert result.placements[0].estimated_start == NOW
    assert "Priority patient" in result.placements[0].eta_reason


def test_in_service_overrun_extends_the_cursor() -> None:
    # Started 60 min ago for a 15-min visit, no explicit delay -> organically overrunning.
    svc = in_service(1, NOW - timedelta(minutes=60))
    wi = walkin(2, NOW - timedelta(minutes=1))
    result = run(EngineInput(now=NOW, settings=SETTINGS, in_service=svc, waiting=[wi]))

    assert result.in_service_overrun
    placement = result.placements[0]
    assert placement.estimated_start > NOW
    assert "overran" in placement.eta_reason


def test_delay_on_in_service_pushes_everyone_waiting() -> None:
    svc = in_service(1, NOW - timedelta(minutes=5), delay_minutes=20)
    wi = walkin(2, NOW - timedelta(minutes=1))
    result = run(EngineInput(now=NOW, settings=SETTINGS, in_service=svc, waiting=[wi]))

    placement = result.placements[0]
    # started 5 min ago; 15 min duration + 20 min delay = ends 35 min after
    # start, i.e. +30 min from now
    assert placement.estimated_start == NOW - timedelta(minutes=5) + timedelta(minutes=35)
    assert "delay logged by provider" in placement.eta_reason


def test_delay_on_a_waiting_visit_defers_its_own_start() -> None:
    delayed_appt = appointment(2, NOW, delay_minutes=15, previous_estimated_start=NOW)
    result = run(EngineInput(now=NOW, settings=SETTINGS, in_service=None, waiting=[delayed_appt]))

    placement = result.placements[0]
    assert placement.estimated_start == NOW + timedelta(minutes=15)
    assert "delay logged" in placement.eta_reason


def test_no_show_frees_time_and_later_visits_move_up() -> None:
    grace = SETTINGS.noshow_grace_minutes
    expired_appt = appointment(1, NOW - timedelta(minutes=grace + 5), status="booked")
    later = appointment(
        2, NOW + timedelta(minutes=5), previous_estimated_start=NOW + timedelta(minutes=20)
    )
    result = run(
        EngineInput(now=NOW, settings=SETTINGS, in_service=None, waiting=[expired_appt, later])
    )

    assert result.expired_visit_ids == [1]
    placement = next(p for p in result.placements if p.visit_id == 2)
    assert placement.estimated_start == NOW + timedelta(minutes=5)
    assert "no-show" in placement.eta_reason


def test_booked_within_grace_still_holds_its_place() -> None:
    appt = appointment(1, NOW - timedelta(minutes=5), status="booked")
    result = run(EngineInput(now=NOW, settings=SETTINGS, in_service=None, waiting=[appt]))

    assert result.expired_visit_ids == []
    assert len(result.placements) == 1


def test_running_behind_schedule_describes_current_truth_not_a_seed_delta() -> None:
    # No previous estimate, no in-service/priority/own-delay cause — this must
    # not fall back to a delta-based message (there's nothing real to diff
    # against), and must not silently describe a badly overdue visit as if it
    # were merely "next in line".
    overdue = appointment(1, NOW - timedelta(minutes=66), status="checked_in")
    result = run(EngineInput(now=NOW, settings=SETTINGS, in_service=None, waiting=[overdue]))

    placement = result.placements[0]
    assert placement.expected_delay_min == 66
    assert placement.eta_reason == "Running 66 min behind schedule"


def test_on_time_visit_with_no_previous_estimate_reads_on_schedule() -> None:
    on_time = appointment(1, NOW, status="checked_in")
    result = run(EngineInput(now=NOW, settings=SETTINGS, in_service=None, waiting=[on_time]))

    placement = result.placements[0]
    assert placement.expected_delay_min == 0
    assert placement.eta_reason == "On schedule"


def test_ewma_update_blends_old_and_actual() -> None:
    assert ewma_update(old=20.0, actual=30.0, alpha=0.3) == 23.0
    assert ewma_update(old=10.0, actual=10.0, alpha=0.5) == 10.0


def test_radiology_service_adds_prep_time_to_duration() -> None:
    ct_scan = duration(default_min=30, prep_min=15)
    assert expected_duration_minutes(ct_scan) == 45


def test_learned_duration_used_once_enough_samples() -> None:
    learned = ServiceDurationInput(
        default_duration_min=15, prep_time_min=0, ewma_minutes=22.0, sample_count=3
    )
    not_yet = ServiceDurationInput(
        default_duration_min=15, prep_time_min=0, ewma_minutes=22.0, sample_count=2
    )
    assert expected_duration_minutes(learned) == 22.0
    assert expected_duration_minutes(not_yet) == 15
