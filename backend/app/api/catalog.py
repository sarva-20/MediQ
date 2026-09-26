from datetime import date

from fastapi import APIRouter

from app.api.deps import not_implemented
from app.schemas.catalog import DepartmentOut, ProviderOut, ServiceOut, SlotOut

router = APIRouter(tags=["catalog"])


@router.get("/departments", response_model=list[DepartmentOut])
def list_departments() -> list[DepartmentOut]:
    raise not_implemented("Module M3 - Slots and booking")


@router.get("/departments/{department_id}/providers", response_model=list[ProviderOut])
def list_department_providers(department_id: int) -> list[ProviderOut]:
    raise not_implemented("Module M3 - Slots and booking")


@router.get("/providers/{provider_id}", response_model=ProviderOut)
def get_provider(provider_id: int) -> ProviderOut:
    raise not_implemented("Module M3 - Slots and booking")


@router.get("/services", response_model=list[ServiceOut])
def list_services() -> list[ServiceOut]:
    raise not_implemented("Module M3 - Slots and booking")


@router.get("/providers/{provider_id}/slots", response_model=list[SlotOut])
def list_provider_slots(provider_id: int, date: date) -> list[SlotOut]:
    raise not_implemented("Module M3 - Slots and booking")
