from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from sqlmodel import Session, func, select

from app.api.deps import require_roles
from app.core.db import get_session
from app.models.department import Department
from app.models.enums import UserRole
from app.models.provider import Provider
from app.models.queue_event import QueueEvent
from app.models.user import User
from app.schemas.common import Page
from app.schemas.events import QueueEventOut
from app.schemas.metrics import MetricsOut, ProviderLoadOut
from app.services import queue_service

router = APIRouter(tags=["metrics"])

require_metrics_viewer = require_roles(UserRole.RECEPTIONIST, UserRole.PROVIDER, UserRole.ADMIN)
require_admin = require_roles(UserRole.ADMIN)

MAX_PAGE_SIZE = 100


@router.get("/metrics", response_model=MetricsOut)
def get_metrics(
    session: Session = Depends(get_session),
    current_user: User = Depends(require_metrics_viewer),
) -> MetricsOut:
    providers = session.exec(select(Provider).where(Provider.is_active.is_(True))).all()

    provider_load: list[ProviderLoadOut] = []
    wait_minutes: list[int] = []
    total_delayed = 0
    total_active = 0

    for provider in providers:
        snapshot = queue_service.recompute_provider(session, provider.id)
        department = session.get(Department, provider.department_id)
        load = queue_service.load(snapshot)
        delayed = queue_service.delayed_count(snapshot)
        wait_minutes.extend(p.estimated_wait_min for p in snapshot.placements)
        total_delayed += delayed
        total_active += load
        provider_load.append(
            ProviderLoadOut(
                provider_id=provider.id,
                provider_name=provider.name,
                department_code=department.code if department else "",
                load=load,
                delayed_count=delayed,
            )
        )

    average_wait = round(sum(wait_minutes) / len(wait_minutes), 1) if wait_minutes else 0.0

    return MetricsOut(
        generated_at=datetime.now(UTC),
        average_waiting_minutes=average_wait,
        total_delayed_cases=total_delayed,
        total_active_visits=total_active,
        provider_load=provider_load,
    )


@router.get("/events", response_model=Page[QueueEventOut])
def list_events(
    page: int = 1,
    page_size: int = 20,
    provider_id: int | None = None,
    visit_id: int | None = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin),
) -> Page[QueueEventOut]:
    page_size = min(page_size, MAX_PAGE_SIZE)
    query = select(QueueEvent)
    if provider_id is not None:
        query = query.where(QueueEvent.provider_id == provider_id)
    if visit_id is not None:
        query = query.where(QueueEvent.visit_id == visit_id)

    total = session.exec(select(func.count()).select_from(query.subquery())).one()
    items = session.exec(
        query.order_by(QueueEvent.id.desc()).offset((page - 1) * page_size).limit(page_size)
    ).all()

    return Page(items=items, total=total, page=page, page_size=page_size)
