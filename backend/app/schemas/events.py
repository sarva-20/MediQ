from datetime import datetime
from typing import Any

from pydantic import BaseModel

from app.models.enums import QueueEventType


class QueueEventOut(BaseModel):
    id: int
    visit_id: int | None
    provider_id: int
    type: QueueEventType
    payload: dict[str, Any]
    sim_time: datetime
    actor_user_id: int | None
    created_at: datetime
