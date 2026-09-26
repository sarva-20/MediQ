from fastapi import APIRouter, Depends

from app.api.deps import not_implemented, require_roles
from app.models.enums import UserRole
from app.schemas.admin import (
    ClinicSettingsOut,
    ClinicSettingsUpdate,
    ProviderCreate,
    ProviderUpdate,
    ServiceUpdate,
)
from app.schemas.catalog import ProviderOut, ServiceOut

router = APIRouter(
    prefix="/admin", tags=["admin"], dependencies=[Depends(require_roles(UserRole.ADMIN))]
)


@router.get("/settings", response_model=ClinicSettingsOut)
def get_settings() -> ClinicSettingsOut:
    raise not_implemented("Module M9 - Frontend")


@router.put("/settings", response_model=ClinicSettingsOut)
def update_settings(body: ClinicSettingsUpdate) -> ClinicSettingsOut:
    raise not_implemented("Module M9 - Frontend")


@router.put("/services/{service_id}", response_model=ServiceOut)
def update_service(service_id: int, body: ServiceUpdate) -> ServiceOut:
    raise not_implemented("Module M9 - Frontend")


@router.post("/providers", response_model=ProviderOut, status_code=201)
def create_provider(body: ProviderCreate) -> ProviderOut:
    raise not_implemented("Module M9 - Frontend")


@router.put("/providers/{provider_id}", response_model=ProviderOut)
def update_provider(provider_id: int, body: ProviderUpdate) -> ProviderOut:
    raise not_implemented("Module M9 - Frontend")


@router.get("/providers", response_model=list[ProviderOut])
def list_all_providers() -> list[ProviderOut]:
    raise not_implemented("Module M9 - Frontend")
