from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import PatientType


class PatientCreate(BaseModel):
    full_name: str = Field(min_length=1)
    phone: str = Field(min_length=1)
    patient_type: PatientType = PatientType.OUT


class PatientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    phone: str
    patient_type: PatientType
    is_simulated: bool
    created_at: datetime
