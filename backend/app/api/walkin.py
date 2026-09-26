from fastapi import APIRouter, Depends

from app.api.deps import not_implemented, require_roles
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.visit import VisitOut
from app.schemas.walkin import WalkInCreate

router = APIRouter(tags=["walk-ins"])

require_receptionist = require_roles(UserRole.RECEPTIONIST)


@router.post("/walk-ins", response_model=VisitOut, status_code=201)
def create_walk_in(
    body: WalkInCreate,
    current_user: User = Depends(require_receptionist),
) -> VisitOut:
    raise not_implemented("Module M4 - Walk-ins and tokens")
