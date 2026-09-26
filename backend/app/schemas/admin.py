from datetime import time

from pydantic import BaseModel

from app.models.enums import ProviderKind


class ClinicSettingsOut(BaseModel):
    noshow_grace_minutes: int
    default_overbook_limit: int
    ewma_alpha: float
    walkin_routing_enabled: bool


class ClinicSettingsUpdate(BaseModel):
    noshow_grace_minutes: int | None = None
    default_overbook_limit: int | None = None
    ewma_alpha: float | None = None
    walkin_routing_enabled: bool | None = None


class ServiceUpdate(BaseModel):
    name: str | None = None
    default_duration_min: int | None = None
    prep_time_min: int | None = None
    is_active: bool | None = None


class ProviderCreate(BaseModel):
    department_id: int
    name: str
    kind: ProviderKind
    room_label: str
    shift_start: time
    shift_end: time
    slot_length_min: int
    slot_capacity: int = 1
    overbook_limit: int = 0


class ProviderUpdate(BaseModel):
    name: str | None = None
    room_label: str | None = None
    is_active: bool | None = None
    shift_start: time | None = None
    shift_end: time | None = None
    slot_length_min: int | None = None
    slot_capacity: int | None = None
    overbook_limit: int | None = None
