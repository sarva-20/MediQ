"""Plain dataclasses in, plain dataclasses out — no DB session, no wall clock,
no FastAPI/SQLModel import. `app.models.enums` is imported because it is itself
framework-free (just `enum.StrEnum`); nothing here touches app.models tables."""

from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum

from app.models.enums import VisitSource, VisitStatus


class PlacementCause(StrEnum):
    PRIORITY = "priority"
    ANCHORED = "anchored"
    GAP_FILL = "gap_fill"
    TAIL = "tail"


@dataclass(frozen=True)
class EngineSettings:
    noshow_grace_minutes: int


@dataclass(frozen=True)
class ServiceDurationInput:
    """What the engine needs to know to estimate a visit's duration."""

    default_duration_min: int
    prep_time_min: int
    ewma_minutes: float | None
    sample_count: int


@dataclass(frozen=True)
class InServiceVisit:
    id: int
    started_at: datetime
    delay_minutes: int
    duration: ServiceDurationInput


@dataclass(frozen=True)
class WaitingVisit:
    """A CHECKED_IN or BOOKED visit that hasn't started yet."""

    id: int
    source: VisitSource
    status: VisitStatus
    scheduled_start: datetime | None  # appointments only
    created_at: datetime  # walk-ins' arrival anchor
    priority_flag: bool
    priority_set_at: datetime | None
    delay_minutes: int
    delay_reason: str | None
    previous_estimated_start: datetime | None
    duration: ServiceDurationInput

    @property
    def anchor_time(self) -> datetime:
        """The time this visit is "supposed" to be seen from: its appointment
        slot, or its walk-in arrival, whichever applies."""
        return self.scheduled_start if self.scheduled_start is not None else self.created_at


@dataclass(frozen=True)
class EngineInput:
    now: datetime
    settings: EngineSettings
    in_service: InServiceVisit | None
    waiting: list[WaitingVisit]


@dataclass(frozen=True)
class VisitPlacement:
    visit_id: int
    position: int
    estimated_start: datetime
    estimated_end: datetime
    estimated_wait_min: int
    expected_delay_min: int
    cause: PlacementCause
    eta_reason: str


@dataclass(frozen=True)
class EngineResult:
    placements: list[VisitPlacement]
    expired_visit_ids: list[int]  # BOOKED, past scheduled_start + grace: caller marks NO_SHOW
    in_service_overrun: bool
    in_service_overrun_minutes: int
