from datetime import datetime

from sqlmodel import Field, SQLModel

from app.models.timestamps import utcnow

SETTINGS_ROW_ID = 1


class ClinicSettings(SQLModel, table=True):
    """Single-row configuration table. Callers must always read/write the row with
    id=SETTINGS_ROW_ID (enforced by convention in app.core, not a DB constraint —
    SQLite has no native "exactly one row" check)."""

    __tablename__ = "clinic_settings"

    id: int = Field(default=SETTINGS_ROW_ID, primary_key=True)
    noshow_grace_minutes: int = 10
    default_overbook_limit: int = 2
    ewma_alpha: float = 0.3
    walkin_routing_enabled: bool = True
    updated_at: datetime = Field(default_factory=utcnow)
