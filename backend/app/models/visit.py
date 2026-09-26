from datetime import datetime

from sqlmodel import Field, SQLModel

from app.models.enums import VisitSource, VisitStatus
from app.models.timestamps import utcnow

# Deliberately no symptom/clinical fields exist or may be added to this model.
# priority_flag/priority_reason may only be set by an authorized staff user
# (priority_set_by_user_id) or the demo simulator — never inferred from patient
# input. This is an operational scheduling system, not a triage system.


class Visit(SQLModel, table=True):
    """One pass through a provider's queue, whether booked in advance or a walk-in.
    token_no is the human-facing identifier (e.g. "GM-A012") shown to the patient
    and used for the public status lookup. estimated_start/estimated_wait_min/
    eta_reason are written by engine.recompute() and are stale the instant a new
    event fires for this provider — that's expected; they're refreshed on the next
    recompute, not read as a live guarantee."""

    __tablename__ = "visits"

    id: int | None = Field(default=None, primary_key=True)
    patient_id: int = Field(foreign_key="patients.id", index=True)
    provider_id: int = Field(foreign_key="providers.id", index=True)
    service_id: int = Field(foreign_key="services.id")
    slot_id: int | None = Field(default=None, foreign_key="slots.id")

    source: VisitSource
    token_no: str = Field(unique=True, index=True, max_length=20)
    status: VisitStatus = Field(default=VisitStatus.BOOKED, index=True)

    scheduled_start: datetime | None = None
    checked_in_at: datetime | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None

    delay_minutes: int = 0
    delay_reason: str | None = None

    priority_flag: bool = False
    priority_reason: str | None = None
    priority_set_by_user_id: int | None = Field(default=None, foreign_key="users.id")

    estimated_start: datetime | None = None
    estimated_wait_min: int | None = None
    eta_reason: str | None = None

    created_at: datetime = Field(default_factory=utcnow)
