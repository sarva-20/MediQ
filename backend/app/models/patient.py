from datetime import datetime

from sqlmodel import Field, SQLModel

from app.models.enums import PatientType
from app.models.timestamps import utcnow


class Patient(SQLModel, table=True):
    """Synthetic demo identity only. is_simulated is always True for seeded/demo data;
    no real patient data is collected or stored (see README § Known Limitations).
    patient_type governs which booking window (see ClinicSettings) applies."""

    __tablename__ = "patients"

    id: int | None = Field(default=None, primary_key=True)
    full_name: str = Field(max_length=120)
    phone: str = Field(max_length=20)
    patient_type: PatientType = Field(default=PatientType.OUT)
    is_simulated: bool = True
    created_at: datetime = Field(default_factory=utcnow)
