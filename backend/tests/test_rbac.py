"""RBAC coverage per docs/api-contract.md. The Admin router is still a Module
M9 501 placeholder — "may access" there just means the request cleared the
role/object-level guard and reached the placeholder. Everything else (Auth,
Lifecycle, Queue, Booking, Walk-ins, Catalog) is real (through Module M4) —
"may access" there means the request cleared RBAC and reached real business
logic, which may then 404/409/422 on bad data; that's a business outcome, not
an RBAC one. "May not access" always means rejected (403) before the handler
body ever runs, regardless of which case applies."""

from fastapi.testclient import TestClient

from tests.conftest import AuthFixture
from tests.helpers import auth_header


def test_public_endpoint_requires_no_auth(client: TestClient) -> None:
    response = client.get("/api/departments")
    assert response.status_code == 200


def test_patient_may_create_appointment(client: TestClient, auth_fixture: AuthFixture) -> None:
    # Role/object-level guard clears; a bogus slot_id then 404s in the real
    # booking logic — a business outcome, proving RBAC didn't block it.
    response = client.post(
        "/api/appointments",
        headers=auth_header(auth_fixture.patient_user.id),
        json={
            "patient_id": auth_fixture.patient.id,
            "provider_id": auth_fixture.provider.id,
            "service_id": auth_fixture.visit.service_id,
            "slot_id": 999999,
        },
    )
    assert response.status_code == 404


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
        json={
            "patient_id": auth_fixture.patient.id,
            "department_id": auth_fixture.provider.department_id,
            "service_id": auth_fixture.visit.service_id,
            "provider_id": auth_fixture.provider.id,
        },
    )
    assert response.status_code == 201


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
    assert response.status_code == 200


def test_provider_may_not_create_provider_via_admin_endpoint(
    client: TestClient, auth_fixture: AuthFixture
) -> None:
    response = client.post(
        "/api/admin/providers", headers=auth_header(auth_fixture.provider_user.id), json={}
    )
    assert response.status_code == 403


def test_admin_may_list_events(client: TestClient, auth_fixture: AuthFixture) -> None:
    response = client.get("/api/events", headers=auth_header(auth_fixture.admin.id))
    assert response.status_code == 200


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

    assert own_queue.status_code == 200
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

    assert own_visit.status_code == 200
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

    assert own_cancel.status_code == 200
    assert others_cancel.status_code == 403


def test_lifecycle_action_on_unknown_visit_is_404_not_403(
    client: TestClient, auth_fixture: AuthFixture
) -> None:
    response = client.post(
        "/api/visits/999999/start", headers=auth_header(auth_fixture.provider_user.id)
    )
    assert response.status_code == 404


def test_admin_can_start_any_provider_visit_as_operational_override(
    client: TestClient, auth_fixture: AuthFixture
) -> None:
    # Admin is exempt from ensure_visit_provider_scope (like receptionist), so
    # it isn't tied to auth_fixture.provider specifically — this documents
    # that admin has the same override on lifecycle actions it already has on
    # queue reads and /admin, /sim.
    response = client.post(
        f"/api/visits/{auth_fixture.visit.id}/start", headers=auth_header(auth_fixture.admin.id)
    )
    assert response.status_code == 200
    assert response.json()["status"] == "in_service"
