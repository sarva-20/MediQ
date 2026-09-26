from pydantic import BaseModel, Field, model_validator


class WalkInCreate(BaseModel):
    patient_id: int | None = None
    full_name: str | None = None
    phone: str | None = None
    department_id: int
    service_id: int
    provider_id: int | None = Field(
        default=None,
        description=(
            "If omitted and ClinicSettings.walkin_routing_enabled is true, "
            "auto-routed to whichever active provider in the department has the "
            "shortest hypothetical wait (docs/architecture.md § Walk-in routing)."
        ),
    )

    @model_validator(mode="after")
    def _exactly_one_patient_identity(self) -> "WalkInCreate":
        has_id = self.patient_id is not None
        has_new_patient = self.full_name is not None and self.phone is not None
        if has_id == has_new_patient:
            raise ValueError("Provide exactly one of patient_id, or both full_name and phone.")
        return self


class WalkInOut(BaseModel):
    """Deliberately not VisitOut — a walk-in confirmation is a small, purpose-built
    receipt (token, provider, wait, and how routing decided), not the full record."""

    token_no: str
    provider_name: str
    room_label: str
    estimated_wait_min: int | None
    eta_reason: str | None
    queue_position: int | None
    patients_ahead: int | None
    status_path: str
    routing_explanation: str
