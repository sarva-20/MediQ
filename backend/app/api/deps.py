from collections.abc import Callable

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session

from app.core.db import get_session
from app.core.security import TokenError, TokenExpiredError, decode_access_token
from app.models.enums import UserRole
from app.models.user import User
from app.models.visit import Visit

bearer_scheme = HTTPBearer(auto_error=False)


def not_implemented(module: str) -> HTTPException:
    """Raised by every business endpoint until its owning module lands. Keeps the
    full API surface visible in /docs (Swagger) from Module M1 onward, per
    docs/api-contract.md, without pretending any of it works yet."""

    return HTTPException(
        status_code=501,
        detail={
            "error": {
                "code": "not_implemented",
                "message": f"Not implemented yet — planned for {module}. "
                "See docs/requirements-traceability.md.",
                "details": None,
            }
        },
    )


def unauthorized(code: str, message: str) -> HTTPException:
    return HTTPException(
        status_code=401,
        detail={"error": {"code": code, "message": message, "details": None}},
    )


def forbidden(message: str = "You do not have permission to perform this action.") -> HTTPException:
    return HTTPException(
        status_code=403,
        detail={"error": {"code": "forbidden", "message": message, "details": None}},
    )


def not_found(message: str) -> HTTPException:
    return HTTPException(
        status_code=404,
        detail={"error": {"code": "not_found", "message": message, "details": None}},
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    session: Session = Depends(get_session),
) -> User:
    if credentials is None:
        raise unauthorized("missing_token", "Authentication required.")

    try:
        payload = decode_access_token(credentials.credentials)
    except TokenExpiredError as exc:
        raise unauthorized("token_expired", "Session expired, please log in again.") from exc
    except TokenError as exc:
        raise unauthorized("invalid_token", "Could not validate credentials.") from exc

    user = session.get(User, int(payload["sub"]))
    if user is None or not user.is_active:
        raise unauthorized("invalid_token", "Could not validate credentials.")
    return user


def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    session: Session = Depends(get_session),
) -> User | None:
    """For endpoints that are public but behave slightly differently for a
    logged-in caller (none currently do; this keeps that door open without
    forcing every public endpoint to require a token)."""
    if credentials is None:
        return None
    try:
        return get_current_user(credentials, session)
    except HTTPException:
        return None


def require_roles(*roles: UserRole) -> Callable[..., User]:
    def dependency(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise forbidden()
        return user

    return dependency


def get_visit_or_404(visit_id: int, session: Session) -> Visit:
    visit = session.get(Visit, visit_id)
    if visit is None:
        raise not_found("Visit not found.")
    return visit


def ensure_visit_provider_scope(user: User, visit: Visit) -> None:
    """A provider may only act on visits queued under their own provider_id;
    receptionists/admins are unrestricted."""
    if user.role is UserRole.PROVIDER and user.provider_id != visit.provider_id:
        raise forbidden("You may only act on your own provider's visits.")


def ensure_visit_patient_scope(user: User, visit: Visit) -> None:
    """A patient may only act on their own visits; staff are unrestricted."""
    if user.role is UserRole.PATIENT and user.patient_id != visit.patient_id:
        raise forbidden("You may only access your own visits.")


def ensure_provider_scope(user: User, provider_id: int) -> None:
    """A provider may only view their own queue; receptionists/admins may view any."""
    if user.role is UserRole.PROVIDER and user.provider_id != provider_id:
        raise forbidden("You may only access your own provider's queue.")
