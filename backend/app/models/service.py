from datetime import datetime

from sqlmodel import Field, SQLModel, UniqueConstraint

from app.models.timestamps import utcnow


class Service(SQLModel, table=True):
    """A bookable service within a department (e.g. "General Consultation", "CT Scan
    - Abdomen"). default_duration_min / prep_time_min are the configurable service
    assumptions the wait-time estimator uses (docs/architecture.md § Wait-time
    estimation approach)."""

    __tablename__ = "services"
    __table_args__ = (UniqueConstraint("department_id", "name", name="uq_service_department_name"),)

    id: int | None = Field(default=None, primary_key=True)
    department_id: int = Field(foreign_key="departments.id", index=True)
    name: str = Field(max_length=120)
    default_duration_min: int
    prep_time_min: int = 0
    is_active: bool = True
    created_at: datetime = Field(default_factory=utcnow)
