"""Catalog reads (public) and slot generation (idempotent, reflects bookings)."""

from datetime import UTC, datetime, time

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.models.enums import ProviderKind
from app.models.provider import Provider
from app.models.slot import Slot
from app.services.slot_service import effective_overbook_limit
from tests.conftest import AuthFixture
from tests.helpers import auth_header


def _slots(client: TestClient, provider_id: int) -> list[dict]:
    date_str = datetime.now(UTC).date().isoformat()
    response = client.get(f"/api/providers/{provider_id}/slots?date={date_str}")
    assert response.status_code == 200
    return response.json()


def test_list_departments_is_public(client: TestClient) -> None:
    response = client.get("/api/departments")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_list_department_providers_is_public(client: TestClient, auth_fixture: AuthFixture) -> None:
    response = client.get(f"/api/departments/{auth_fixture.provider.department_id}/providers")
    assert response.status_code == 200
    assert any(p["id"] == auth_fixture.provider.id for p in response.json())


def test_list_services_filtered_by_department(
    client: TestClient, auth_fixture: AuthFixture
) -> None:
    response = client.get(f"/api/services?department_id={auth_fixture.provider.department_id}")
    assert response.status_code == 200
    assert response.json()
    assert all(s["department_id"] == auth_fixture.provider.department_id for s in response.json())


def test_slot_generation_is_idempotent(
    client: TestClient, auth_fixture: AuthFixture, session: Session
) -> None:
    first = _slots(client, auth_fixture.provider.id)
    second = _slots(client, auth_fixture.provider.id)

    assert [s["id"] for s in first] == [s["id"] for s in second]
    assert len(first) > 0

    stored = session.exec(select(Slot).where(Slot.provider_id == auth_fixture.provider.id)).all()
    assert len(stored) == len(first)


def test_slots_reflect_bookings(client: TestClient, auth_fixture: AuthFixture) -> None:
    # Last slot of the day, not the first: the first slot can already be past its
    # end (or no-show grace) depending on the wall-clock time the suite runs at.
    slot = _slots(client, auth_fixture.provider.id)[-1]
    assert slot["remaining"] == slot["capacity"]

    booking = client.post(
        "/api/appointments",
        headers=auth_header(auth_fixture.patient_user.id),
        json={
            "patient_id": auth_fixture.patient.id,
            "provider_id": auth_fixture.provider.id,
            "service_id": auth_fixture.visit.service_id,
            "slot_id": slot["id"],
        },
    )
    assert booking.status_code == 201

    after = next(s for s in _slots(client, auth_fixture.provider.id) if s["id"] == slot["id"])
    assert after["booked_count"] == slot["booked_count"] + 1
    assert after["remaining"] == slot["remaining"] - 1


def test_effective_overbook_limit_falls_back_to_clinic_default() -> None:
    provider = Provider(
        department_id=1,
        name="X",
        kind=ProviderKind.DOCTOR,
        room_label="R",
        shift_start=time(9, 0),
        shift_end=time(17, 0),
        slot_length_min=15,
        overbook_limit=None,
    )
    assert effective_overbook_limit(provider, default_overbook_limit=5) == 5

    provider.overbook_limit = 3
    assert effective_overbook_limit(provider, default_overbook_limit=5) == 3
