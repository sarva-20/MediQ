"""Walk-in creation: explicit provider, load-balanced auto-routing, routing
explanation, and the public status lookup by token."""

from fastapi.testclient import TestClient

from tests.conftest import AuthFixture
from tests.helpers import auth_header


def _walk_in(client: TestClient, headers: dict, auth_fixture: AuthFixture, **overrides) -> dict:
    body = {
        "patient_id": auth_fixture.patient.id,
        "department_id": auth_fixture.provider.department_id,
        "service_id": auth_fixture.visit.service_id,
        "provider_id": auth_fixture.provider.id,
    }
    body.update(overrides)
    return client.post("/api/walk-ins", headers=headers, json=body)


def test_walk_in_with_explicit_provider(client: TestClient, auth_fixture: AuthFixture) -> None:
    response = _walk_in(client, auth_header(auth_fixture.receptionist.id), auth_fixture)

    assert response.status_code == 201
    body = response.json()
    assert body["provider_name"] == auth_fixture.provider.name
    assert body["token_no"]
    assert body["routing_explanation"]
    assert body["status_path"] == f"/api/status/{body['token_no']}"


def test_walk_in_with_new_patient_by_name_and_phone(
    client: TestClient, auth_fixture: AuthFixture
) -> None:
    response = _walk_in(
        client,
        auth_header(auth_fixture.receptionist.id),
        auth_fixture,
        patient_id=None,
        full_name="New Walkin",
        phone="9123456789",
    )
    assert response.status_code == 201


def test_walk_in_rejects_both_patient_id_and_new_patient_fields(
    client: TestClient, auth_fixture: AuthFixture
) -> None:
    response = _walk_in(
        client, auth_header(auth_fixture.receptionist.id), auth_fixture, full_name="X", phone="123"
    )
    assert response.status_code == 422


def test_walk_in_rejects_neither_patient_id_nor_new_patient_fields(
    client: TestClient, auth_fixture: AuthFixture
) -> None:
    response = _walk_in(
        client, auth_header(auth_fixture.receptionist.id), auth_fixture, patient_id=None
    )
    assert response.status_code == 422


def test_walk_in_auto_routing_picks_shorter_queue(
    client: TestClient, auth_fixture: AuthFixture
) -> None:
    # Provider A (auth_fixture.provider) is made busy; provider B (other_provider,
    # same department) is empty — auto-routing should pick B.
    start_response = client.post(
        f"/api/visits/{auth_fixture.visit.id}/start",
        headers=auth_header(auth_fixture.provider_user.id),
    )
    assert start_response.status_code == 200

    response = _walk_in(
        client, auth_header(auth_fixture.receptionist.id), auth_fixture, provider_id=None
    )

    assert response.status_code == 201
    body = response.json()
    assert body["provider_name"] == auth_fixture.other_provider.name
    assert "shortest wait" in body["routing_explanation"]


def test_walk_in_token_status_page_works(client: TestClient, auth_fixture: AuthFixture) -> None:
    created = _walk_in(client, auth_header(auth_fixture.receptionist.id), auth_fixture)
    token_no = created.json()["token_no"]

    response = client.get(f"/api/status/{token_no}")
    assert response.status_code == 200
    assert response.json()["token_no"] == token_no
