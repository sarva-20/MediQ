from datetime import datetime

from pydantic import BaseModel

from app.models.enums import VisitSource, VisitStatus


class VisitOut(BaseModel):
    """Shared representation of a visit, returned by booking, walk-in, and lifecycle
    endpoints. Never includes patient contact details beyond what the caller's role
    is entitled to — the public status endpoint uses PublicStatusOut instead."""

    id: int
    patient_id: int
    provider_id: int
    service_id: int
    slot_id: int | None
    source: VisitSource
    token_no: str
    status: VisitStatus
    scheduled_start: datetime | None
    checked_in_at: datetime | None
    started_at: datetime | None
    completed_at: datetime | None
    delay_minutes: int
    delay_reason: str | None
    priority_flag: bool
    priority_reason: str | None
    estimated_start: datetime | None
    estimated_wait_min: int | None
    eta_reason: str | None
    created_at: datetime
