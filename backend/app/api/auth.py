from fastapi import APIRouter

from app.api.deps import not_implemented
from app.schemas.auth import LoginRequest, LoginResponse, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest) -> LoginResponse:
    raise not_implemented("Module M2 - Auth and roles")


@router.get("/me", response_model=UserOut)
def me() -> UserOut:
    raise not_implemented("Module M2 - Auth and roles")
