from pydantic import BaseModel

from app.models.enums import UserRole


class LoginRequest(BaseModel):
    username: str
    password: str


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
