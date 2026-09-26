from datetime import datetime

from sqlmodel import Field, SQLModel, UniqueConstraint

from app.models.timestamps import utcnow


class Slot(SQLModel, table=True):
    """A bookable time window generated from a provider's shift for a given date.
    capacity is normally provider.slot_capacity + provider.overbook_limit at
    generation time; booked_count tracks how many visits currently hold this slot."""

    __tablename__ = "slots"
    __table_args__ = (UniqueConstraint("provider_id", "start_at", name="uq_slot_provider_start"),)

    id: int | None = Field(default=None, primary_key=True)
    provider_id: int = Field(foreign_key="providers.id", index=True)
    start_at: datetime = Field(index=True)
    end_at: datetime
    capacity: int
    booked_count: int = 0
    created_at: datetime = Field(default_factory=utcnow)
