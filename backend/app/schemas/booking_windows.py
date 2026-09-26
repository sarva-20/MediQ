from datetime import time

from pydantic import BaseModel, ConfigDict


class BookingWindowsOut(BaseModel):
    """Public — the frontend uses this to color-code and disable slots per
    patient type without duplicating the clinic's configured windows."""

    model_config = ConfigDict(from_attributes=True)

    in_patient_window_start: time
    in_patient_window_end: time
    out_patient_window_start: time
    out_patient_window_end: time
    lunch_break_start: time
    lunch_break_end: time
