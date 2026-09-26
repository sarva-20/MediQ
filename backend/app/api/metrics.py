from fastapi import APIRouter, Depends

from app.api.deps import not_implemented, require_roles
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.common import Page
from app.schemas.events import QueueEventOut
from app.schemas.metrics import MetricsOut

router = APIRouter(tags=["metrics"])

require_metrics_viewer = require_roles(UserRole.RECEPTIONIST, UserRole.PROVIDER, UserRole.ADMIN)
require_admin = require_roles(UserRole.ADMIN)


@router.get("/metrics", response_model=MetricsOut)
def get_metrics(current_user: User = Depends(require_metrics_viewer)) -> MetricsOut:
    raise not_implemented("Module M7 - Metrics and SSE")


@router.get("/events", response_model=Page[QueueEventOut])
def list_events(
    page: int = 1,
    page_size: int = 20,
    current_user: User = Depends(require_admin),
) -> Page[QueueEventOut]:
    raise not_implemented("Module M7 - Metrics and SSE")
