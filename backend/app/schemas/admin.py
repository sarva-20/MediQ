from datetime import time

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ProviderKind


class ClinicSettingsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    noshow_grace_minutes: int
    default_overbook_limit: int
    ewma_alpha: float
    walkin_routing_enabled: bool


class ClinicSettingsUpdate(BaseModel):
    noshow_grace_minutes: int | None = Field(default=None, ge=0)
    default_overbook_limit: int | None = Field(default=None, ge=0)
    ewma_alpha: float | None = Field(default=None, gt=0, le=1)
    walkin_routing_enabled: bool | None = None


class ServiceUpdate(BaseModel):
    name: str | None = None
    default_duration_min: int | None = Field(default=None, gt=0)
    prep_time_min: int | None = Field(default=None, ge=0)
    is_active: bool | None = None


class ProviderCreate(BaseModel):
    department_id: int
    name: str
    kind: ProviderKind
    room_label: str
    shift_start: time
    shift_end: time
    slot_length_min: int = Field(gt=0)
    slot_capacity: int = Field(default=1, gt=0)
    overbook_limit: int = Field(default=0, ge=0)


class ProviderUpdate(BaseModel):
    name: str | None = None
    room_label: str | None = None
    is_active: bool | None = None
    shift_start: time | None = None
    shift_end: time | None = None
    slot_length_min: int | None = Field(default=None, gt=0)
    slot_capacity: int | None = Field(default=None, gt=0)
    overbook_limit: int | None = Field(default=None, ge=0)
