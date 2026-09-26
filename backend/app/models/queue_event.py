from datetime import datetime
from typing import Any

from sqlalchemy import JSON, Column
from sqlmodel import Field, SQLModel

from app.models.enums import QueueEventType
from app.models.timestamps import utcnow


class QueueEvent(SQLModel, table=True):
    """Append-only audit log. Every mutation to a Visit is recorded here before
    engine.recompute() runs, so "why did the ETA change" is always answerable by
    replaying events for a provider. sim_time is the effective (possibly simulated)
    clock reading when the event happened; created_at is the real wall-clock
    insert time, kept for ordering even if the sim clock is rewound."""

    __tablename__ = "queue_events"

    id: int | None = Field(default=None, primary_key=True)
    visit_id: int | None = Field(default=None, foreign_key="visits.id", index=True)
    provider_id: int = Field(foreign_key="providers.id", index=True)
    type: QueueEventType
    payload: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    sim_time: datetime
    actor_user_id: int | None = Field(default=None, foreign_key="users.id")
    created_at: datetime = Field(default_factory=utcnow)
