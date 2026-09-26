import re

from pydantic import BaseModel, Field, field_validator

from app.models.enums import UserRole

_PHONE_RE = re.compile(r"^\+\d{1,3}\d{6,14}$")
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    name: str = Field(min_length=1)
    phone: str
    email: str
    password: str = Field(min_length=6)

    @field_validator("phone")
    @classmethod
    def _validate_phone(cls, v: str) -> str:
        if not _PHONE_RE.match(v):
            raise ValueError("Phone must include a country code, e.g. +919876543210.")
        return v

    @field_validator("email")
    @classmethod
    def _validate_email(cls, v: str) -> str:
        if not _EMAIL_RE.match(v):
            raise ValueError("Invalid email address.")
        return v.lower()


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: UserRole
    user_id: int
    provider_id: int | None = None
    patient_id: int | None = None


class UserOut(BaseModel):
    id: int
    username: str
    role: UserRole
    provider_id: int | None = None
    patient_id: int | None = None
    is_active: bool
