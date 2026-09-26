from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.api.deps import get_current_user, unauthorized
from app.core.db import get_session
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.schemas.auth import LoginRequest, LoginResponse, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])

INVALID_CREDENTIALS_MESSAGE = "Invalid username or password."
# Hashed once at import time so a lookup miss still pays the bcrypt cost — otherwise
# "unknown user" would return measurably faster than "wrong password" and leak
# which usernames exist via response timing.
_DUMMY_PASSWORD_HASH = hash_password("not-a-real-account")


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest, session: Session = Depends(get_session)) -> LoginResponse:
    user = session.exec(select(User).where(User.username == body.username)).first()
    password_hash = user.password_hash if user else _DUMMY_PASSWORD_HASH
    password_ok = verify_password(body.password, password_hash)

    # Same error for "no such user", "wrong password", and "inactive account" —
    # revealing account existence/state through the login response is its own
    # vulnerability (user enumeration).
    if user is None or not user.is_active or not password_ok:
        raise unauthorized("invalid_credentials", INVALID_CREDENTIALS_MESSAGE)

    return LoginResponse(
        access_token=create_access_token(user.id),
        role=user.role,
        user_id=user.id,
        provider_id=user.provider_id,
        patient_id=user.patient_id,
    )


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)) -> UserOut:
    return UserOut(
        id=current_user.id,
        username=current_user.username,
        role=current_user.role,
        provider_id=current_user.provider_id,
        patient_id=current_user.patient_id,
        is_active=current_user.is_active,
    )
