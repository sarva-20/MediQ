from fastapi import APIRouter, Depends

from app.api.deps import ensure_provider_scope, not_implemented, require_roles
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.queue import PublicStatusOut, QueueOverviewOut, QueueSnapshotOut

router = APIRouter(tags=["queue"])

require_queue_viewer = require_roles(UserRole.RECEPTIONIST, UserRole.PROVIDER, UserRole.ADMIN)
require_staff = require_roles(UserRole.RECEPTIONIST, UserRole.ADMIN)


@router.get("/queue/providers/{provider_id}", response_model=QueueSnapshotOut)
def get_provider_queue(
    provider_id: int,
    current_user: User = Depends(require_queue_viewer),
) -> QueueSnapshotOut:
    ensure_provider_scope(current_user, provider_id)
    raise not_implemented("Module M5 - Queue engine and wait estimation")


@router.get("/queue/overview", response_model=QueueOverviewOut)
def get_queue_overview(
    current_user: User = Depends(require_staff),
) -> QueueOverviewOut:
    raise not_implemented("Module M5 - Queue engine and wait estimation")


@router.get("/status/{token_no}", response_model=PublicStatusOut)
def get_public_status(token_no: str) -> PublicStatusOut:
    """Public, no login required — this is the token board patients check."""
    raise not_implemented("Module M5 - Queue engine and wait estimation")
