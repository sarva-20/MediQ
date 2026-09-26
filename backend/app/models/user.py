from datetime import datetime

from sqlmodel import Field, SQLModel

from app.models.enums import UserRole
from app.models.timestamps import utcnow


class User(SQLModel, table=True):
    """Login identity. provider_id is set for role=provider (links to the provider's
    own queue); patient_id is set for role=patient (links to the patient's own
    visits). Both are nullable and mutually exclusive in practice, enforced in the
    auth/service layer (Module M2), not at the schema level."""

    __tablename__ = "users"

    id: int | None = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True, max_length=60)
    password_hash: str
    role: UserRole = Field(index=True)
    provider_id: int | None = Field(default=None, foreign_key="providers.id")
    patient_id: int | None = Field(default=None, foreign_key="patients.id")
    is_active: bool = True
    created_at: datetime = Field(default_factory=utcnow)
