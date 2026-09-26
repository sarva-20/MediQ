from datetime import datetime, time

from sqlmodel import Field, SQLModel

from app.models.enums import ProviderKind
from app.models.timestamps import utcnow


class Provider(SQLModel, table=True):
    """A doctor (clinic departments) or a scanner (Radiology). shift_start/shift_end
    and slot_length_min drive slot generation; slot_capacity + overbook_limit bound
    how many visits a single slot may hold (docs/architecture.md § Wait-time
    estimation approach). Shift times are stored as UTC-naive wall-clock times; the
    UI is responsible for displaying them in Asia/Kolkata."""

    __tablename__ = "providers"

    id: int | None = Field(default=None, primary_key=True)
    department_id: int = Field(foreign_key="departments.id", index=True)
    name: str = Field(max_length=120)
    kind: ProviderKind
    room_label: str = Field(max_length=40)
    is_active: bool = True
    shift_start: time
    shift_end: time
    slot_length_min: int
    slot_capacity: int = 1
    # None falls back to ClinicSettings.default_overbook_limit at read/booking
    # time — see app.services.booking_service.effective_overbook_limit.
    overbook_limit: int | None = None
    created_at: datetime = Field(default_factory=utcnow)
