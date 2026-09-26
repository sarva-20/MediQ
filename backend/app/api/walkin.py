from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.api.deps import not_found, require_roles, validation_error
from app.core.db import get_session
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.walkin import WalkInCreate, WalkInOut
from app.services import walkin_service
from app.services.errors import BusinessValidationError, NotFoundError

router = APIRouter(tags=["walk-ins"])

require_staff = require_roles(UserRole.RECEPTIONIST, UserRole.ADMIN)


@router.post("/walk-ins", response_model=WalkInOut, status_code=201)
def create_walk_in(
    body: WalkInCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_staff),
) -> WalkInOut:
    try:
        visit, explanation, snapshot = walkin_service.create_walk_in(session, current_user, body)
    except NotFoundError as exc:
        raise not_found(str(exc)) from exc
    except BusinessValidationError as exc:
        raise validation_error(str(exc)) from exc

    placement = next((p for p in snapshot.placements if p.visit_id == visit.id), None)
    return WalkInOut(
        token_no=visit.token_no,
        provider_name=snapshot.provider.name,
        room_label=snapshot.provider.room_label,
        estimated_wait_min=placement.estimated_wait_min if placement else 0,
        eta_reason=placement.eta_reason if placement else None,
        queue_position=placement.position if placement else None,
        patients_ahead=(placement.position - 1) if placement else None,
        status_path=f"/api/status/{visit.token_no}",
        routing_explanation=explanation,
    )
