from datetime import datetime

from sqlmodel import Field, SQLModel

from app.models.timestamps import utcnow

SIM_CLOCK_ROW_ID = 1


class SimClock(SQLModel, table=True):
    """Single-row demo clock. Effective time = (frozen_at if is_frozen else real
    wall-clock time) + offset_minutes. frozen_at is set when the clock is frozen so
    that time genuinely stops for the demo instead of only shifting; see
    app.core.clock.now()."""

    __tablename__ = "sim_clock"

    id: int = Field(default=SIM_CLOCK_ROW_ID, primary_key=True)
    offset_minutes: int = 0
    is_frozen: bool = False
    frozen_at: datetime | None = None
    updated_at: datetime = Field(default_factory=utcnow)
