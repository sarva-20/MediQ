from datetime import datetime, time

from sqlmodel import Field, SQLModel

from app.models.timestamps import utcnow

SETTINGS_ROW_ID = 1


class ClinicSettings(SQLModel, table=True):
    """Single-row configuration table. Callers must always read/write the row with
    id=SETTINGS_ROW_ID (enforced by convention in app.core, not a DB constraint —
    SQLite has no native "exactly one row" check).

    in_patient_window_*/out_patient_window_* bound which slot start-times each
    Patient.patient_type may book — see services/booking_service.py."""

    __tablename__ = "clinic_settings"

    id: int = Field(default=SETTINGS_ROW_ID, primary_key=True)
    noshow_grace_minutes: int = 10
    default_overbook_limit: int = 0
    ewma_alpha: float = 0.3
    walkin_routing_enabled: bool = True
    in_patient_window_start: time = time(7, 0)
    in_patient_window_end: time = time(11, 0)
    out_patient_window_start: time = time(11, 0)
    out_patient_window_end: time = time(19, 0)
    lunch_break_start: time = time(13, 0)
    lunch_break_end: time = time(14, 0)
    updated_at: datetime = Field(default_factory=utcnow)
