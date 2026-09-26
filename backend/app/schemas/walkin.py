from pydantic import BaseModel, Field


class WalkInCreate(BaseModel):
    patient_id: int
    department_code: str
    service_id: int
    provider_id: int | None = Field(
        default=None,
        description=(
            "If omitted, auto-routed to the least-loaded active provider offering "
            "this service in the department (docs/architecture.md § load balancer)."
        ),
    )
