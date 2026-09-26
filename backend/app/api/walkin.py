from fastapi import APIRouter

from app.api.deps import not_implemented
from app.schemas.visit import VisitOut
from app.schemas.walkin import WalkInCreate

router = APIRouter(tags=["walk-ins"])


@router.post("/walk-ins", response_model=VisitOut, status_code=201)
def create_walk_in(body: WalkInCreate) -> VisitOut:
    raise not_implemented("Module M4 - Walk-ins and tokens")
