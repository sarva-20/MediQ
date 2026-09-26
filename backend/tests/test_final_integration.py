"""Focused tests for the final backend-integration pass: registration, the
public providers list, real admin endpoints, queue/appointments enrichment,
and event ordering/detail."""

from fastapi.testclient import TestClient
from sqlmodel import Session

from tests.conftest import AuthFixture
from tests.helpers import auth_header


def test_register_creates_patient_and_user(client: TestClient) -> None:
    response = client.post(
        "/api/auth/register",
        json={
            "name": "New Patient",
            "phone": "+919876543210",
            "email": "New.Patient@Example.com",
            "password": "secret123",
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["role"] == "patient"
    assert body["patient_id"] is not None

    duplicate = client.post(
        "/api/auth/register",
        json={
            "name": "New Patient",
            "phone": "+919876543210",
            "email": "new.patient@example.com",
            "password": "secret123",
        },
    )
    assert duplicate.status_code == 409


def test_register_rejects_bad_phone_and_short_password(client: TestClient) -> None:
    bad_phone = client.post(
        "/api/auth/register",
        json={
            "name": "X",
            "phone": "9876543210",
            "email": "x@example.com",
            "password": "secret123",
        },
    )
    assert bad_phone.status_code == 422

    short_password = client.post(
        "/api/auth/register",
        json={"name": "X", "phone": "+919876543210", "email": "y@example.com", "password": "123"},
    )
    assert short_password.status_code == 422


def test_list_providers_is_public_and_filters(
    client: TestClient, auth_fixture: AuthFixture
) -> None:
    response = client.get("/api/providers")
    assert response.status_code == 200
    body = response.json()
    assert any(p["id"] == auth_fixture.provider.id for p in body)
    assert "overbook_limit" in body[0]

    filtered = client.get(f"/api/providers?department_id={auth_fixture.provider.department_id}")
    assert all(p["department_id"] == auth_fixture.provider.department_id for p in filtered.json())


def test_admin_settings_and_provider_toggle(
    client: TestClient, auth_fixture: AuthFixture
) -> None:
    headers = auth_header(auth_fixture.admin.id)

    got = client.get("/api/admin/settings", headers=headers)
    assert got.status_code == 200

    updated = client.put(
        "/api/admin/settings", headers=headers, json={"noshow_grace_minutes": 15}
    )
    assert updated.status_code == 200
    assert updated.json()["noshow_grace_minutes"] == 15

    bad = client.put("/api/admin/settings", headers=headers, json={"ewma_alpha": 2})
    assert bad.status_code == 422

    toggled = client.patch(
        f"/api/admin/providers/{auth_fixture.provider.id}/active", headers=headers
    )
    assert toggled.status_code == 200
    assert toggled.json()["is_active"] is False


def test_queue_now_serving_and_appointments_include_all_sources(
    client: TestClient, auth_fixture: AuthFixture, session: Session
) -> None:
    from app.models.enums import VisitSource, VisitStatus
    from app.models.visit import Visit

    walkin = Visit(
        patient_id=auth_fixture.patient.id,
        provider_id=auth_fixture.provider.id,
        service_id=auth_fixture.visit.service_id,
        source=VisitSource.WALKIN,
        token_no="GM-W900",
        status=VisitStatus.IN_SERVICE,
        started_at=auth_fixture.visit.created_at,
    )
    session.add(walkin)
    session.commit()

    admin_headers = auth_header(auth_fixture.admin.id)
    queue = client.get(
        f"/api/queue/providers/{auth_fixture.provider.id}", headers=admin_headers
    ).json()
    assert queue["now_serving"] is not None
    assert queue["now_serving"]["token_no"] == "GM-W900"

    appts = client.get("/api/appointments", headers=admin_headers).json()
    assert any(v["token_no"] == "GM-W900" for v in appts["items"])
    assert any(v["source"] == "walkin" for v in appts["items"])

    provider_headers = auth_header(auth_fixture.provider_user.id)
    own = client.get("/api/appointments", headers=provider_headers).json()
    assert all(v["provider_id"] == auth_fixture.provider.id for v in own["items"])

    forbidden = client.get(
        f"/api/appointments?provider_id={auth_fixture.other_provider.id}",
        headers=provider_headers,
    )
    assert forbidden.status_code == 403


def test_events_order_and_detail(client: TestClient, auth_fixture: AuthFixture) -> None:
    headers = auth_header(auth_fixture.admin.id)
    client.post(f"/api/visits/{auth_fixture.visit.id}/check-in", headers=headers)

    desc = client.get("/api/events?order=desc", headers=headers).json()["items"]
    asc = client.get("/api/events?order=asc", headers=headers).json()["items"]
    assert [e["id"] for e in desc] == list(reversed([e["id"] for e in asc]))
    assert any(e["detail"] == "Patient checked in" for e in desc)
