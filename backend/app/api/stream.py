from fastapi import APIRouter

from app.api.deps import not_implemented

router = APIRouter(tags=["stream"])


@router.get("/stream")
def stream_queue_updates() -> None:
    """Server-Sent Events stream of QueueSnapshotOut updates, one event per
    recompute. See docs/api-contract.md § Live for event types and payload shape."""
    raise not_implemented("Module M7 - Metrics and SSE")
