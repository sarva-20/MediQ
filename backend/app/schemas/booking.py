from pydantic import BaseModel


class AppointmentCreate(BaseModel):
    patient_id: int
    provider_id: int
    service_id: int
    slot_id: int
