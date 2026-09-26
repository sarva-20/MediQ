from fastapi import APIRouter

from app.api.deps import not_implemented
from app.schemas.queue import PublicStatusOut, QueueOverviewOut, QueueSnapshotOut

router = APIRouter(tags=["queue"])


@router.get("/queue/providers/{provider_id}", response_model=QueueSnapshotOut)
def get_provider_queue(provider_id: int) -> QueueSnapshotOut:
    raise not_implemented("Module M5 - Queue engine and wait estimation")


@router.get("/queue/overview", response_model=QueueOverviewOut)
def get_queue_overview() -> QueueOverviewOut:
    raise not_implemented("Module M5 - Queue engine and wait estimation")


@router.get("/status/{token_no}", response_model=PublicStatusOut)
def get_public_status(token_no: str) -> PublicStatusOut:
    raise not_implemented("Module M5 - Queue engine and wait estimation")
