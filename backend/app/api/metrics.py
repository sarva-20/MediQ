from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import and_, case
from sqlmodel import Session, func, select

from app.api.deps import require_roles
from app.core import clock
from app.core.db import get_session
from app.models.department import Department
from app.models.enums import QueueEventType, UserRole, VisitSource, VisitStatus
from app.models.provider import Provider
from app.models.queue_event import QueueEvent
from app.models.service import Service
from app.models.slot import Slot
from app.models.user import User
from app.models.visit import Visit
from app.schemas.common import Page
from app.schemas.events import QueueEventOut
from app.schemas.metrics import DepartmentRollupOut, MetricsOut, ProviderLoadOut
from app.services import queue_service
from app.services.slot_service import effective_overbook_limit

router = APIRouter(tags=["metrics"])

require_metrics_viewer = require_roles(UserRole.RECEPTIONIST, UserRole.PROVIDER, UserRole.ADMIN)
require_admin = require_roles(UserRole.ADMIN)

MAX_PAGE_SIZE = 100

WAITING_STATUSES = (VisitStatus.BOOKED, VisitStatus.CHECKED_IN)


def _day_bounds(now: datetime) -> tuple[datetime, datetime]:
    day_start = datetime(now.year, now.month, now.day, tzinfo=UTC)
    return day_start, day_start + timedelta(days=1)


def _provider_utilization_pct(
    session: Session,
    provider: Provider,
    day_start: datetime,
    day_end: datetime,
    default_overbook: int,
) -> float:
    slot_count, booked_sum, capacity_sum = session.exec(
        select(func.count(Slot.id), func.sum(Slot.booked_count), func.sum(Slot.capacity)).where(
            Slot.provider_id == provider.id,
            Slot.start_at >= day_start,
            Slot.start_at < day_end,
        )
    ).one()
    max_capacity = (capacity_sum or 0) + effective_overbook_limit(provider, default_overbook) * (
        slot_count or 0
    )
    if not max_capacity:
        return 0.0
    return round((booked_sum or 0) / max_capacity * 100, 1)


@router.get("/metrics", response_model=MetricsOut)
def get_metrics(
    department_id: int | None = None,
    provider_id: int | None = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_metrics_viewer),
) -> MetricsOut:
    now = clock.now(session)
    day_start, day_end = _day_bounds(now)
    settings = queue_service.get_settings(session)

    provider_query = select(Provider).where(Provider.is_active.is_(True))
    if department_id is not None:
        provider_query = provider_query.where(Provider.department_id == department_id)
    if provider_id is not None:
        provider_query = provider_query.where(Provider.id == provider_id)
    providers = session.exec(provider_query).all()
    provider_ids = [p.id for p in providers]
    departments = {d.id: d for d in session.exec(select(Department)).all()}

    provider_load: list[ProviderLoadOut] = []
    dept_delayed: dict[int, int] = {}
    total_delayed = 0
    total_active = 0
    current_wait_minutes: list[int] = []

    for provider in providers:
        snapshot = queue_service.recompute_provider(session, provider.id)
        department = departments.get(provider.department_id)
        load = queue_service.load(snapshot)
        delayed = queue_service.delayed_count(snapshot)
        provider_waits = [p.estimated_wait_min for p in snapshot.placements]
        current_wait_minutes.extend(provider_waits)
        total_delayed += delayed
        total_active += load
        dept_delayed[provider.department_id] = dept_delayed.get(provider.department_id, 0) + delayed

        service_ids = {v.service_id for v in snapshot.visits_by_id.values()}
        default_service = next(iter(service_ids), None)
        default_duration_min = 0
        learned_avg_duration_min: float | None = None
        if default_service is not None:
            service = session.get(Service, default_service)
            if service is not None:
                duration = queue_service.duration_input(session, provider.id, service)
                default_duration_min = duration.default_duration_min
                learned_avg_duration_min = duration.ewma_minutes

        provider_load.append(
            ProviderLoadOut(
                provider_id=provider.id,
                provider_name=provider.name,
                department_code=department.code if department else "",
                load=load,
                delayed_count=delayed,
                utilization_pct=_provider_utilization_pct(
                    session, provider, day_start, day_end, settings.default_overbook_limit
                ),
                avg_wait_min=round(sum(provider_waits) / len(provider_waits), 1)
                if provider_waits
                else 0.0,
                learned_avg_duration_min=learned_avg_duration_min,
                default_duration_min=default_duration_min,
            )
        )

    average_wait = (
        round(sum(current_wait_minutes) / len(current_wait_minutes), 1)
        if current_wait_minutes
        else 0.0
    )

    per_department: list[DepartmentRollupOut] = []
    if provider_ids:
        dept_rows = session.exec(
            select(
                Provider.department_id,
                func.sum(case((Visit.status.in_(WAITING_STATUSES), 1), else_=0)),
                func.sum(case((Visit.status == VisitStatus.IN_SERVICE, 1), else_=0)),
                func.avg(
                    case((Visit.status.in_(WAITING_STATUSES), Visit.estimated_wait_min), else_=None)
                ),
            )
            .join(Visit, Visit.provider_id == Provider.id, isouter=True)
            .where(Provider.id.in_(provider_ids))
            .group_by(Provider.department_id)
        ).all()
        for dept_id, waiting, in_service, avg_wait in dept_rows:
            department = departments.get(dept_id)
            per_department.append(
                DepartmentRollupOut(
                    department_id=dept_id,
                    department_code=department.code if department else "",
                    waiting_count=waiting or 0,
                    in_service_count=in_service or 0,
                    delayed_count=dept_delayed.get(dept_id, 0),
                    avg_wait_min=round(avg_wait, 1) if avg_wait is not None else 0.0,
                )
            )

    if not provider_ids:
        return MetricsOut(
            generated_at=now,
            average_waiting_minutes=0.0,
            total_delayed_cases=0,
            total_active_visits=0,
            provider_load=[],
            avg_waiting_time_min=None,
            current_avg_estimated_wait_min=0.0,
            delayed_cases=0,
            waiting_count=0,
            in_service_count=0,
            completed_today=0,
            no_show_count=0,
            cancelled_count=0,
            walkin_count=0,
            appointment_count=0,
            per_department=[],
        )

    day_key = func.coalesce(Visit.scheduled_start, Visit.checked_in_at, Visit.created_at)
    today_filter = and_(day_key >= day_start, day_key < day_end)

    waiting_count, in_service_count = session.exec(
        select(
            func.sum(case((Visit.status.in_(WAITING_STATUSES), 1), else_=0)),
            func.sum(case((Visit.status == VisitStatus.IN_SERVICE, 1), else_=0)),
        ).where(Visit.provider_id.in_(provider_ids))
    ).one()

    completed_today, no_show_count, cancelled_count, walkin_count, appointment_count = session.exec(
        select(
            func.sum(case((Visit.status == VisitStatus.COMPLETED, 1), else_=0)),
            func.sum(case((Visit.status == VisitStatus.NO_SHOW, 1), else_=0)),
            func.sum(case((Visit.status == VisitStatus.CANCELLED, 1), else_=0)),
            func.sum(case((Visit.source == VisitSource.WALKIN, 1), else_=0)),
            func.sum(case((Visit.source == VisitSource.APPOINTMENT, 1), else_=0)),
        ).where(Visit.provider_id.in_(provider_ids), today_filter)
    ).one()

    wait_minutes_expr = (
        func.julianday(Visit.started_at) - func.julianday(Visit.checked_in_at)
    ) * 1440
    avg_waiting_time_min = session.exec(
        select(func.avg(wait_minutes_expr)).where(
            Visit.provider_id.in_(provider_ids),
            Visit.started_at.is_not(None),
            Visit.checked_in_at.is_not(None),
            Visit.started_at >= day_start,
            Visit.started_at < day_end,
        )
    ).one()

    current_avg_estimated_wait_min = session.exec(
        select(func.avg(Visit.estimated_wait_min)).where(
            Visit.provider_id.in_(provider_ids), Visit.status.in_(WAITING_STATUSES)
        )
    ).one()

    return MetricsOut(
        generated_at=now,
        average_waiting_minutes=average_wait,
        total_delayed_cases=total_delayed,
        total_active_visits=total_active,
        provider_load=provider_load,
        avg_waiting_time_min=(
            round(avg_waiting_time_min, 1) if avg_waiting_time_min is not None else None
        ),
        current_avg_estimated_wait_min=round(current_avg_estimated_wait_min, 1)
        if current_avg_estimated_wait_min is not None
        else 0.0,
        delayed_cases=total_delayed,
        waiting_count=waiting_count or 0,
        in_service_count=in_service_count or 0,
        completed_today=completed_today or 0,
        no_show_count=no_show_count or 0,
        cancelled_count=cancelled_count or 0,
        walkin_count=walkin_count or 0,
        appointment_count=appointment_count or 0,
        per_department=per_department,
    )


def _event_detail(event: QueueEvent) -> str:
    payload = event.payload or {}
    if event.type == QueueEventType.BOOK:
        suffix = " (overbooked)" if payload.get("is_overbooked") else ""
        return f"Booked slot {payload.get('slot_id')}{suffix}"
    if event.type == QueueEventType.WALK_IN:
        return payload.get("routing", "Walk-in checked in")
    if event.type == QueueEventType.CHECK_IN:
        return "Patient checked in"
    if event.type == QueueEventType.START:
        return "Visit started"
    if event.type == QueueEventType.DELAY:
        return f"Delayed {payload.get('minutes', '?')} min — {payload.get('reason', '')}"
    if event.type == QueueEventType.COMPLETE:
        return f"Visit completed ({payload.get('actual_minutes', '?')} min)"
    if event.type == QueueEventType.CANCEL:
        return "Visit cancelled"
    if event.type == QueueEventType.NO_SHOW:
        return payload.get("reason", "Marked as a no-show")
    if event.type == QueueEventType.PRIORITY_SET:
        action = "set" if payload.get("flag") else "cleared"
        return f"Priority {action} — {payload.get('reason', '')}"
    if event.type == QueueEventType.ETA_CHANGED:
        return f"ETA changed: {payload.get('reason', '')}"
    return event.type.value


@router.get("/events", response_model=Page[QueueEventOut])
def list_events(
    page: int = 1,
    page_size: int = 20,
    provider_id: int | None = None,
    visit_id: int | None = None,
    order: str = "desc",
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin),
) -> Page[QueueEventOut]:
    page_size = min(page_size, MAX_PAGE_SIZE)
    query = select(QueueEvent)
    if provider_id is not None:
        query = query.where(QueueEvent.provider_id == provider_id)
    if visit_id is not None:
        query = query.where(QueueEvent.visit_id == visit_id)

    id_order = QueueEvent.id.asc() if order == "asc" else QueueEvent.id.desc()
    total = session.exec(select(func.count()).select_from(query.subquery())).one()
    items = session.exec(
        query.order_by(id_order).offset((page - 1) * page_size).limit(page_size)
    ).all()

    return Page(
        items=[
            QueueEventOut(**item.model_dump(), detail=_event_detail(item)) for item in items
        ],
        total=total,
        page=page,
        page_size=page_size,
    )
