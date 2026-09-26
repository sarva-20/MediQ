from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PrescriptionCreate(BaseModel):
    medications: str = Field(min_length=1, max_length=2000)
    notes: str | None = Field(default=None, max_length=2000)


class PrescriptionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    visit_id: int
    patient_id: int
    provider_id: int
    provider_name: str | None = None
    medications: str
    notes: str | None
    created_at: datetime
