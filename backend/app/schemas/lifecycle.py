from pydantic import BaseModel, Field


class DelayRequest(BaseModel):
    minutes: int = Field(gt=0)
    reason: str


class PriorityRequest(BaseModel):
    """Staff-only. There is no symptom or clinical field here or anywhere in the
    API — priority is an explicit operational decision, never inferred."""

    flag: bool
    reason: str = Field(min_length=1)
