"""Patient directory: create + search (receptionist/admin only)."""

from fastapi.testclient import TestClient

from tests.conftest import AuthFixture
from tests.helpers import auth_header


def test_receptionist_can_create_patient(client: TestClient, auth_fixture: AuthFixture) -> None:
    response = client.post(
        "/api/patients",
        headers=auth_header(auth_fixture.receptionist.id),
        json={"full_name": "Test Person", "phone": "9998887777"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["full_name"] == "Test Person"
    assert body["is_simulated"] is True


def test_patient_role_cannot_create_patient(client: TestClient, auth_fixture: AuthFixture) -> None:
    response = client.post(
        "/api/patients",
        headers=auth_header(auth_fixture.patient_user.id),
        json={"full_name": "X", "phone": "123"},
    )
    assert response.status_code == 403


def test_search_patients_by_name_or_phone(client: TestClient, auth_fixture: AuthFixture) -> None:
    headers = auth_header(auth_fixture.admin.id)
    client.post(
        "/api/patients", headers=headers, json={"full_name": "Zebra Unique", "phone": "9112233445"}
    )

    by_name = client.get("/api/patients?q=Zebra", headers=headers)
    assert by_name.status_code == 200
    assert any(p["full_name"] == "Zebra Unique" for p in by_name.json())

    by_phone = client.get("/api/patients?q=9112233445", headers=headers)
    assert any(p["phone"] == "9112233445" for p in by_phone.json())
