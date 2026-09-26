from datetime import datetime

from pydantic import BaseModel


class ProviderLoadOut(BaseModel):
    provider_id: int
    provider_name: str
    department_code: str
    load: int
    delayed_count: int
    utilization_pct: float
    avg_wait_min: float
    learned_avg_duration_min: float | None
    default_duration_min: int


class DepartmentRollupOut(BaseModel):
    department_id: int
    department_code: str
    waiting_count: int
    in_service_count: int
    delayed_count: int
    avg_wait_min: float


class MetricsOut(BaseModel):
    """Clinic-wide snapshot for GET /api/metrics. `average_waiting_minutes` /
    `total_delayed_cases` / `total_active_visits` are the original Module M6
    fields (kept for compatibility); the rest were added in Module M5."""

    generated_at: datetime
    average_waiting_minutes: float
    total_delayed_cases: int
    total_active_visits: int
    provider_load: list[ProviderLoadOut]

    avg_waiting_time_min: float | None
    current_avg_estimated_wait_min: float
    delayed_cases: int
    waiting_count: int
    in_service_count: int
    completed_today: int
    no_show_count: int
    cancelled_count: int
    walkin_count: int
    appointment_count: int
    per_department: list[DepartmentRollupOut]
