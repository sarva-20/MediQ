from datetime import date as date_type

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.api.deps import not_found
from app.core import clock
from app.core.db import get_session
from app.models.department import Department
from app.models.provider import Provider
from app.models.service import Service
from app.schemas.catalog import DepartmentOut, ProviderListOut, ProviderOut, ServiceOut, SlotOut
from app.services import queue_service
from app.services.slot_service import effective_overbook_limit, ensure_slots_for_date

router = APIRouter(tags=["catalog"])


@router.get("/departments", response_model=list[DepartmentOut])
def list_departments(session: Session = Depends(get_session)) -> list[DepartmentOut]:
    departments = session.exec(select(Department)).all()
    return [DepartmentOut.model_validate(d) for d in departments]


@router.get("/departments/{department_id}/providers", response_model=list[ProviderOut])
def list_department_providers(
    department_id: int, session: Session = Depends(get_session)
) -> list[ProviderOut]:
    providers = session.exec(
        select(Provider).where(
            Provider.department_id == department_id, Provider.is_active.is_(True)
        )
    ).all()
    return [ProviderOut.model_validate(p) for p in providers]


@router.get("/providers", response_model=list[ProviderListOut])
def list_providers(
    department_id: int | None = None,
    is_active: bool | None = None,
    session: Session = Depends(get_session),
) -> list[ProviderListOut]:
    query = select(Provider)
    if department_id is not None:
        query = query.where(Provider.department_id == department_id)
    active_filter = True if is_active is None else is_active
    query = query.where(Provider.is_active.is_(active_filter))
    providers = session.exec(query).all()
    settings = queue_service.get_settings(session)
    return [
        ProviderListOut(
            id=p.id,
            department_id=p.department_id,
            name=p.name,
            kind=p.kind,
            room_label=p.room_label,
            is_active=p.is_active,
            shift_start=p.shift_start,
            shift_end=p.shift_end,
            slot_length_min=p.slot_length_min,
            slot_capacity=p.slot_capacity,
            overbook_limit=effective_overbook_limit(p, settings.default_overbook_limit),
        )
        for p in providers
    ]


@router.get("/providers/{provider_id}", response_model=ProviderOut)
def get_provider(provider_id: int, session: Session = Depends(get_session)) -> ProviderOut:
    provider = session.get(Provider, provider_id)
    if provider is None:
        raise not_found("Provider not found.")
    return ProviderOut.model_validate(provider)


@router.get("/services", response_model=list[ServiceOut])
def list_services(
    department_id: int | None = None, session: Session = Depends(get_session)
) -> list[ServiceOut]:
    query = select(Service).where(Service.is_active.is_(True))
    if department_id is not None:
        query = query.where(Service.department_id == department_id)
    services = session.exec(query).all()
    return [ServiceOut.model_validate(s) for s in services]


@router.get("/providers/{provider_id}/slots", response_model=list[SlotOut])
def list_provider_slots(
    provider_id: int, date: date_type, session: Session = Depends(get_session)
) -> list[SlotOut]:
    provider = session.get(Provider, provider_id)
    if provider is None:
        raise not_found("Provider not found.")

    settings = queue_service.get_settings(session)
    slots = ensure_slots_for_date(session, provider, date, settings.default_overbook_limit)
    overbook = effective_overbook_limit(provider, settings.default_overbook_limit)
    now = clock.now(session)

    return [
        SlotOut(
            id=slot.id,
            provider_id=slot.provider_id,
            start_at=slot.start_at,
            end_at=slot.end_at,
            capacity=slot.capacity,
            booked_count=slot.booked_count,
            remaining=max(0, slot.capacity - slot.booked_count),
            remaining_with_overbook=max(0, slot.capacity + overbook - slot.booked_count),
            is_available=slot.end_at > now,
        )
        for slot in slots
    ]
