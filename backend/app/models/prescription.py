from datetime import datetime

from sqlmodel import Field, SQLModel

from app.models.timestamps import utcnow


class Prescription(SQLModel, table=True):
    """A provider's written prescription for one visit. Visible to the patient
    (their own) and to staff; never editable after creation (append-only,
    matching the rest of the clinical audit trail)."""

    __tablename__ = "prescriptions"

    id: int | None = Field(default=None, primary_key=True)
    visit_id: int = Field(foreign_key="visits.id", index=True)
    patient_id: int = Field(foreign_key="patients.id", index=True)
    provider_id: int = Field(foreign_key="providers.id", index=True)
    medications: str = Field(max_length=2000)
    notes: str | None = Field(default=None, max_length=2000)
    created_at: datetime = Field(default_factory=utcnow)
