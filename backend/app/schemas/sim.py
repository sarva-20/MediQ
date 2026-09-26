from datetime import datetime

from pydantic import BaseModel, Field


class SimClockOut(BaseModel):
    effective_time: datetime
    offset_minutes: int
    is_frozen: bool


class AdvanceRequest(BaseModel):
    minutes: int = Field(gt=0)


class SeedRequest(BaseModel):
    scenario: str = "default"
