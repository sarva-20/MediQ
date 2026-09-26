from datetime import datetime

from pydantic import BaseModel


class ProviderLoadOut(BaseModel):
    provider_id: int
    provider_name: str
    department_code: str
    load: int
    delayed_count: int


class MetricsOut(BaseModel):
    """Clinic-wide snapshot for GET /api/metrics."""

    generated_at: datetime
    average_waiting_minutes: float
    total_delayed_cases: int
    total_active_visits: int
    provider_load: list[ProviderLoadOut]
