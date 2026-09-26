from datetime import datetime

from pydantic import BaseModel

from app.models.enums import VisitSource, VisitStatus


class QueueVisitOut(BaseModel):
    """One entry in a provider's live queue, as returned inside QueueSnapshotOut."""

    visit_id: int
    token_no: str
    patient_name: str
    status: VisitStatus
    source: VisitSource
    position: int
    estimated_start: datetime | None
    estimated_wait_min: int | None
    eta_reason: str | None
    priority_flag: bool


class QueueSnapshotOut(BaseModel):
    """Full live state of one provider's queue. Returned by
    GET /api/queue/providers/{id} and pushed over SSE on every recompute."""

    provider_id: int
    provider_name: str
    department_code: str
    current_token: str | None
    next_tokens: list[str]
    load: int
    delayed_count: int
    queue: list[QueueVisitOut]


class ProviderQueueSummaryOut(BaseModel):
    """One row of GET /api/queue/overview — summary only, no per-visit detail."""

    provider_id: int
    provider_name: str
    department_code: str
    current_token: str | None
    load: int
    delayed_count: int


class QueueOverviewOut(BaseModel):
    providers: list[ProviderQueueSummaryOut]


class PublicStatusOut(BaseModel):
    """Response for the public, no-login token lookup. Deliberately excludes
    patient_name/phone and any other provider's queue state."""

    token_no: str
    department_code: str
    provider_name: str
    status: VisitStatus
    position: int | None
    estimated_start: datetime | None
    estimated_wait_min: int | None
    eta_reason: str | None
