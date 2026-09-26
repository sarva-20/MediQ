"""RBAC coverage: per docs/api-contract.md, every business endpoint is still a
Module M1 501 placeholder — so "may access" means the request clears the role
(and, where applicable, object-level) guard and reaches that placeholder (501),
while "may not access" means it's rejected before ever reaching it (403)."""

from fastapi.testclient import TestClient

from tests.conftest import AuthFixture
from tests.helpers import auth_header


def test_public_endpoint_requires_no_auth(client: TestClient) -> None:
    response = client.get("/api/departments")
    assert response.status_code == 501


def test_patient_may_create_appointment(client: TestClient, auth_fixture: AuthFixture) -> None:
    response = client.post(
        "/api/appointments",
        headers=auth_header(auth_fixture.patient_user.id),
        json={
            "patient_id": auth_fixture.patient.id,
            "provider_id": 1,
            "service_id": 1,
            "slot_id": 1,
        },
    )
    assert response.status_code == 501


def test_patient_may_not_access_admin_endpoint(
    client: TestClient, auth_fixture: AuthFixture
) -> None:
    response = client.get("/api/admin/providers", headers=auth_header(auth_fixture.patient_user.id))
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "forbidden"


def test_receptionist_may_create_walk_in(client: TestClient, auth_fixture: AuthFixture) -> None:
    response = client.post(
        "/api/walk-ins",
        headers=auth_header(auth_fixture.receptionist.id),
        json={"patient_id": auth_fixture.patient.id, "department_code": "GM", "service_id": 1},
    )
    assert response.status_code == 501


def test_receptionist_may_not_access_admin_only_events(
    client: TestClient, auth_fixture: AuthFixture
) -> None:
    response = client.get("/api/events", headers=auth_header(auth_fixture.receptionist.id))
    assert response.status_code == 403


def test_provider_may_view_own_queue(client: TestClient, auth_fixture: AuthFixture) -> None:
    response = client.get(
        f"/api/queue/providers/{auth_fixture.provider.id}",
        headers=auth_header(auth_fixture.provider_user.id),
    )
    assert response.status_code == 501


def test_provider_may_not_create_provider_via_admin_endpoint(
    client: TestClient, auth_fixture: AuthFixture
) -> None:
    response = client.post(
        "/api/admin/providers", headers=auth_header(auth_fixture.provider_user.id), json={}
    )
    assert response.status_code == 403


def test_admin_may_list_events(client: TestClient, auth_fixture: AuthFixture) -> None:
    response = client.get("/api/events", headers=auth_header(auth_fixture.admin.id))
    assert response.status_code == 501


def test_admin_may_not_create_appointment(client: TestClient, auth_fixture: AuthFixture) -> None:
    # Booking is Patient/Receptionist only per docs/api-contract.md — Admin is
    # deliberately excluded, unlike most other endpoints.
    response = client.post(
        "/api/appointments",
        headers=auth_header(auth_fixture.admin.id),
        json={"patient_id": 1, "provider_id": 1, "service_id": 1, "slot_id": 1},
    )
    assert response.status_code == 403


def test_provider_object_level_isolation_on_own_queue(
    client: TestClient, auth_fixture: AuthFixture
) -> None:
    own_queue = client.get(
        f"/api/queue/providers/{auth_fixture.provider.id}",
        headers=auth_header(auth_fixture.provider_user.id),
    )
    others_queue = client.get(
        f"/api/queue/providers/{auth_fixture.other_provider.id}",
        headers=auth_header(auth_fixture.provider_user.id),
    )

    assert own_queue.status_code == 501
    assert others_queue.status_code == 403
    assert others_queue.json()["error"]["code"] == "forbidden"


def test_provider_object_level_isolation_on_lifecycle_actions(
    client: TestClient, auth_fixture: AuthFixture
) -> None:
    own_visit = client.post(
        f"/api/visits/{auth_fixture.visit.id}/start",
        headers=auth_header(auth_fixture.provider_user.id),
    )
    others_visit = client.post(
        f"/api/visits/{auth_fixture.visit.id}/start",
        headers=auth_header(auth_fixture.other_provider_user.id),
    )

    assert own_visit.status_code == 501
    assert others_visit.status_code == 403


def test_patient_object_level_isolation_on_cancel(
    client: TestClient, auth_fixture: AuthFixture
) -> None:
    own_cancel = client.post(
        f"/api/appointments/{auth_fixture.visit.id}/cancel",
        headers=auth_header(auth_fixture.patient_user.id),
    )
    others_cancel = client.post(
        f"/api/appointments/{auth_fixture.visit.id}/cancel",
        headers=auth_header(auth_fixture.other_patient_user.id),
    )

    assert own_cancel.status_code == 501
    assert others_cancel.status_code == 403


def test_lifecycle_action_on_unknown_visit_is_404_not_403(
    client: TestClient, auth_fixture: AuthFixture
) -> None:
    response = client.post(
        "/api/visits/999999/start", headers=auth_header(auth_fixture.provider_user.id)
    )
    assert response.status_code == 404
