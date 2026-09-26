from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.api.deps import not_found, require_roles
from app.core.db import get_session
from app.models.enums import UserRole
from app.models.provider import Provider
from app.models.service import Service
from app.schemas.admin import (
    ClinicSettingsOut,
    ClinicSettingsUpdate,
    ProviderCreate,
    ProviderUpdate,
    ServiceUpdate,
)
from app.schemas.catalog import ProviderOut, ServiceOut
from app.services import queue_service

router = APIRouter(
    prefix="/admin", tags=["admin"], dependencies=[Depends(require_roles(UserRole.ADMIN))]
)


@router.get("/settings", response_model=ClinicSettingsOut)
def get_settings(session: Session = Depends(get_session)) -> ClinicSettingsOut:
    return ClinicSettingsOut.model_validate(queue_service.get_settings(session))


@router.put("/settings", response_model=ClinicSettingsOut)
def update_settings(
    body: ClinicSettingsUpdate, session: Session = Depends(get_session)
) -> ClinicSettingsOut:
    settings = queue_service.get_settings(session)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(settings, field, value)
    session.add(settings)
    session.commit()
    session.refresh(settings)
    queue_service.recompute_all(session)
    return ClinicSettingsOut.model_validate(settings)


@router.put("/services/{service_id}", response_model=ServiceOut)
def update_service(
    service_id: int, body: ServiceUpdate, session: Session = Depends(get_session)
) -> ServiceOut:
    service = session.get(Service, service_id)
    if service is None:
        raise not_found("Service not found.")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(service, field, value)
    session.add(service)
    session.commit()
    session.refresh(service)
    queue_service.recompute_all(session)
    return ServiceOut.model_validate(service)


@router.post("/providers", response_model=ProviderOut, status_code=201)
def create_provider(body: ProviderCreate, session: Session = Depends(get_session)) -> ProviderOut:
    provider = Provider(**body.model_dump())
    session.add(provider)
    session.commit()
    session.refresh(provider)
    return ProviderOut.model_validate(provider)


@router.put("/providers/{provider_id}", response_model=ProviderOut)
def update_provider(
    provider_id: int, body: ProviderUpdate, session: Session = Depends(get_session)
) -> ProviderOut:
    provider = session.get(Provider, provider_id)
    if provider is None:
        raise not_found("Provider not found.")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(provider, field, value)
    session.add(provider)
    session.commit()
    session.refresh(provider)
    queue_service.recompute_all(session)
    return ProviderOut.model_validate(provider)


@router.patch("/providers/{provider_id}/active", response_model=ProviderOut)
def toggle_provider_active(
    provider_id: int, session: Session = Depends(get_session)
) -> ProviderOut:
    """Flips is_active. No hard delete — a provider's history (visits, events)
    must stay intact, so deactivating just hides it from new bookings/queues."""
    provider = session.get(Provider, provider_id)
    if provider is None:
        raise not_found("Provider not found.")
    provider.is_active = not provider.is_active
    session.add(provider)
    session.commit()
    session.refresh(provider)
    queue_service.recompute_all(session)
    return ProviderOut.model_validate(provider)


@router.get("/providers", response_model=list[ProviderOut])
def list_all_providers(session: Session = Depends(get_session)) -> list[ProviderOut]:
    providers = session.exec(select(Provider)).all()
    return [ProviderOut.model_validate(p) for p in providers]
