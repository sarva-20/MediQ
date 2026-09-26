from datetime import datetime, time

from pydantic import BaseModel, ConfigDict

from app.models.enums import DepartmentKind, ProviderKind


class DepartmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    name: str
    kind: DepartmentKind


class ServiceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    department_id: int
    name: str
    default_duration_min: int
    prep_time_min: int
    is_active: bool


class ProviderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    department_id: int
    name: str
    kind: ProviderKind
    room_label: str
    is_active: bool
    shift_start: time
    shift_end: time
    slot_length_min: int
    slot_capacity: int
    overbook_limit: int | None


class SlotOut(BaseModel):
    id: int
    provider_id: int
    start_at: datetime
    end_at: datetime
    capacity: int
    booked_count: int
    remaining: int
    remaining_with_overbook: int
    is_available: bool  # False once the slot has ended, relative to the simulated clock
