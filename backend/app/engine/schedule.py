"""The deterministic per-provider placement algorithm. See docs/architecture.md
§ Queue engine for the rule-by-rule explanation of what this implements."""

from dataclasses import dataclass, field
from datetime import datetime, timedelta

from app.engine.durations import expected_duration_minutes
from app.engine.models import (
    EngineInput,
    EngineResult,
    InServiceVisit,
    PlacementCause,
    VisitPlacement,
    WaitingVisit,
)
from app.engine.reasons import ReasonContext, generate_reason
from app.models.enums import VisitSource, VisitStatus

MIN_OVERRUN_MINUTES = 2
OVERRUN_FRACTION = 0.25


@dataclass
class _Block:
    visit: WaitingVisit
    start: datetime
    end: datetime
    cause: PlacementCause
    sequence: int


@dataclass
class _Gap:
    start: datetime
    end: datetime
    fill_cursor: datetime = field(init=False)

    def __post_init__(self) -> None:
        self.fill_cursor = self.start


def _resolve_cursor(now: datetime, in_service: InServiceVisit | None) -> tuple[datetime, bool, int]:
    """The in-service visit's expected end becomes the cursor everything else
    queues behind. If reality has already overrun that estimate, assume it
    finishes shortly (never less than 2 minutes, and at least a quarter of its
    own duration) rather than pretending it will end at some already-past time."""
    if in_service is None:
        return now, False, 0

    duration = expected_duration_minutes(in_service.duration)
    expected_end = in_service.started_at + timedelta(minutes=duration + in_service.delay_minutes)
    if now > expected_end:
        overrun_minutes = max(MIN_OVERRUN_MINUTES, OVERRUN_FRACTION * duration)
        return now + timedelta(minutes=overrun_minutes), True, round(overrun_minutes)
    return expected_end, False, 0


def _is_expired(visit: WaitingVisit, now: datetime, grace_minutes: int) -> bool:
    return (
        visit.status is VisitStatus.BOOKED
        and visit.scheduled_start is not None
        and now > visit.scheduled_start + timedelta(minutes=grace_minutes)
    )


def _place_anchored(
    cursor: datetime, priority: list[WaitingVisit], appointments: list[WaitingVisit]
) -> tuple[list[_Block], datetime]:
    """Priority visits first (each right at the cursor), then appointments
    anchored to their own scheduled time — both advance a single shared
    cursor, so nothing here can overlap another block."""
    blocks: list[_Block] = []
    sequence = 0

    for visit in priority:
        duration = expected_duration_minutes(visit.duration)
        start = cursor
        end = start + timedelta(minutes=duration)
        blocks.append(_Block(visit, start, end, PlacementCause.PRIORITY, sequence))
        cursor = end
        sequence += 1

    for visit in appointments:
        duration = expected_duration_minutes(visit.duration)
        earliest = visit.anchor_time + timedelta(minutes=visit.delay_minutes)
        start = max(cursor, earliest)
        end = start + timedelta(minutes=duration)
        blocks.append(_Block(visit, start, end, PlacementCause.ANCHORED, sequence))
        cursor = end
        sequence += 1

    return blocks, cursor


def _compute_gaps(initial_cursor: datetime, anchored: list[_Block]) -> list[_Gap]:
    gaps: list[_Gap] = []
    cursor = initial_cursor
    for block in anchored:
        if block.start > cursor:
            gaps.append(_Gap(start=cursor, end=block.start))
        cursor = block.end
    return gaps


def _place_walkins(
    walkins: list[WaitingVisit],
    gaps: list[_Gap],
    tail_cursor: datetime,
    sequence_start: int,
) -> list[_Block]:
    """Each walk-in, in arrival order, takes the earliest gap it fits in
    without spilling past that gap's end (which would push back whatever
    appointment the gap ends at) — otherwise it goes after the last block."""
    blocks: list[_Block] = []
    sequence = sequence_start
    for visit in walkins:
        duration = expected_duration_minutes(visit.duration)
        floor = visit.anchor_time + timedelta(minutes=visit.delay_minutes)
        placed = False
        for gap in gaps:
            start = max(gap.fill_cursor, floor)
            end = start + timedelta(minutes=duration)
            if end <= gap.end:
                blocks.append(_Block(visit, start, end, PlacementCause.GAP_FILL, sequence))
                gap.fill_cursor = end
                placed = True
                break
        if not placed:
            start = max(tail_cursor, floor)
            end = start + timedelta(minutes=duration)
            blocks.append(_Block(visit, start, end, PlacementCause.TAIL, sequence))
            tail_cursor = end
        sequence += 1
    return blocks


def run(engine_input: EngineInput) -> EngineResult:
    now = engine_input.now
    grace_minutes = engine_input.settings.noshow_grace_minutes

    expired = [v for v in engine_input.waiting if _is_expired(v, now, grace_minutes)]
    expired_ids = {v.id for v in expired}
    active = [v for v in engine_input.waiting if v.id not in expired_ids]

    priority = sorted(
        (v for v in active if v.priority_flag),
        key=lambda v: v.priority_set_at or v.created_at,
    )
    appointments = sorted(
        (v for v in active if not v.priority_flag and v.source is VisitSource.APPOINTMENT),
        key=lambda v: v.anchor_time,
    )
    walkins = sorted(
        (v for v in active if not v.priority_flag and v.source is VisitSource.WALKIN),
        key=lambda v: v.created_at,
    )

    initial_cursor, in_service_overrun, overrun_minutes = _resolve_cursor(
        now, engine_input.in_service
    )
    anchored_blocks, cursor_after_anchored = _place_anchored(initial_cursor, priority, appointments)
    gaps = _compute_gaps(initial_cursor, anchored_blocks)
    walkin_blocks = _place_walkins(walkins, gaps, cursor_after_anchored, len(anchored_blocks))

    all_blocks = sorted(anchored_blocks + walkin_blocks, key=lambda b: (b.start, b.sequence))

    ctx = ReasonContext(
        in_service_delay_minutes=(
            engine_input.in_service.delay_minutes if engine_input.in_service else 0
        ),
        in_service_overrun=in_service_overrun,
        has_priority_ahead=bool(priority),
        expired_count=len(expired),
        freed_at=expired[0].scheduled_start if expired else None,
    )

    placements = []
    for position, block in enumerate(all_blocks, start=1):
        expected_delay_min = (
            max(0, round((block.start - block.visit.scheduled_start).total_seconds() / 60))
            if block.visit.scheduled_start is not None
            else 0
        )
        placements.append(
            VisitPlacement(
                visit_id=block.visit.id,
                position=position,
                estimated_start=block.start,
                estimated_end=block.end,
                estimated_wait_min=max(0, round((block.start - now).total_seconds() / 60)),
                expected_delay_min=expected_delay_min,
                cause=block.cause,
                eta_reason=generate_reason(
                    block.visit, block.start, block.cause, expected_delay_min, ctx
                ),
            )
        )

    return EngineResult(
        placements=placements,
        expired_visit_ids=sorted(expired_ids),
        in_service_overrun=in_service_overrun,
        in_service_overrun_minutes=overrun_minutes,
    )
