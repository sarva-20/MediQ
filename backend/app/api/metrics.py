from fastapi import APIRouter

from app.api.deps import not_implemented
from app.schemas.common import Page
from app.schemas.events import QueueEventOut
from app.schemas.metrics import MetricsOut

router = APIRouter(tags=["metrics"])


@router.get("/metrics", response_model=MetricsOut)
def get_metrics() -> MetricsOut:
    raise not_implemented("Module M7 - Metrics and SSE")


@router.get("/events", response_model=Page[QueueEventOut])
def list_events(page: int = 1, page_size: int = 20) -> Page[QueueEventOut]:
    raise not_implemented("Module M7 - Metrics and SSE")
