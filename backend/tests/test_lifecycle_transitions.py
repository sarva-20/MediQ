"""API-level coverage for every lifecycle transition: the valid path and its
paired 409 conflict case."""

from datetime import UTC, datetime

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models.enums import VisitSource, VisitStatus
from app.models.visit import Visit
from tests.conftest import AuthFixture
from tests.helpers import auth_header


def _make_visit(
    session: Session, auth_fixture: AuthFixture, token_no: str, **overrides: object
) -> Visit:
    defaults = {
        "patient_id": auth_fixture.patient.id,
        "provider_id": auth_fixture.provider.id,
        "service_id": auth_fixture.visit.service_id,
        "source": VisitSource.APPOINTMENT,
        "token_no": token_no,
        "status": VisitStatus.BOOKED,
        "scheduled_start": datetime.now(UTC),
    }
    defaults.update(overrides)
    visit = Visit(**defaults)
    session.add(visit)
    session.commit()
    session.refresh(visit)
    return visit


def test_check_in_then_reject_second_check_in(
    client: TestClient, auth_fixture: AuthFixture
) -> None:
    headers = auth_header(auth_fixture.receptionist.id)
    first = client.post(f"/api/visits/{auth_fixture.visit.id}/check-in", headers=headers)
    assert first.status_code == 200
    assert first.json()["status"] == "checked_in"

    second = client.post(f"/api/visits/{auth_fixture.visit.id}/check-in", headers=headers)
    assert second.status_code == 409
    assert second.json()["error"]["code"] == "conflict"


def test_start_then_reject_second_start(client: TestClient, auth_fixture: AuthFixture) -> None:
    headers = auth_header(auth_fixture.provider_user.id)
    first = client.post(f"/api/visits/{auth_fixture.visit.id}/start", headers=headers)
    assert first.status_code == 200
    assert first.json()["status"] == "in_service"

    second = client.post(f"/api/visits/{auth_fixture.visit.id}/start", headers=headers)
    assert second.status_code == 409


def test_start_rejected_when_provider_already_has_someone_in_service(
    client: TestClient, auth_fixture: AuthFixture, session: Session
) -> None:
    headers = auth_header(auth_fixture.provider_user.id)
    client.post(f"/api/visits/{auth_fixture.visit.id}/start", headers=headers)

    second_visit = _make_visit(session, auth_fixture, "GM-A999")
    response = client.post(f"/api/visits/{second_visit.id}/start", headers=headers)
    assert response.status_code == 409


def test_delay_accumulates_and_records_reason(
    client: TestClient, auth_fixture: AuthFixture
) -> None:
    headers = auth_header(auth_fixture.provider_user.id)
    client.post(f"/api/visits/{auth_fixture.visit.id}/start", headers=headers)

    response = client.post(
        f"/api/visits/{auth_fixture.visit.id}/delay",
        headers=headers,
        json={"minutes": 15, "reason": "running late"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["delay_minutes"] == 15
    assert body["delay_reason"] == "running late"


def test_delay_on_completed_visit_is_conflict(
    client: TestClient, auth_fixture: AuthFixture
) -> None:
    headers = auth_header(auth_fixture.provider_user.id)
    client.post(f"/api/visits/{auth_fixture.visit.id}/start", headers=headers)
    client.post(f"/api/visits/{auth_fixture.visit.id}/complete", headers=headers)

    response = client.post(
        f"/api/visits/{auth_fixture.visit.id}/delay",
        headers=headers,
        json={"minutes": 5, "reason": "x"},
    )
    assert response.status_code == 409


def test_complete_then_reject_second_complete(
    client: TestClient, auth_fixture: AuthFixture
) -> None:
    headers = auth_header(auth_fixture.provider_user.id)
    client.post(f"/api/visits/{auth_fixture.visit.id}/start", headers=headers)
    first = client.post(f"/api/visits/{auth_fixture.visit.id}/complete", headers=headers)
    assert first.status_code == 200
    assert first.json()["status"] == "completed"

    second = client.post(f"/api/visits/{auth_fixture.visit.id}/complete", headers=headers)
    assert second.status_code == 409


def test_no_show_then_reject_second_no_show(client: TestClient, auth_fixture: AuthFixture) -> None:
    headers = auth_header(auth_fixture.receptionist.id)
    first = client.post(f"/api/visits/{auth_fixture.visit.id}/no-show", headers=headers)
    assert first.status_code == 200
    assert first.json()["status"] == "no_show"

    second = client.post(f"/api/visits/{auth_fixture.visit.id}/no-show", headers=headers)
    assert second.status_code == 409


def test_cancel_then_reject_second_cancel(client: TestClient, auth_fixture: AuthFixture) -> None:
    headers = auth_header(auth_fixture.patient_user.id)
    first = client.post(f"/api/appointments/{auth_fixture.visit.id}/cancel", headers=headers)
    assert first.status_code == 200
    assert first.json()["status"] == "cancelled"

    second = client.post(f"/api/appointments/{auth_fixture.visit.id}/cancel", headers=headers)
    assert second.status_code == 409


def test_priority_set_and_remove(client: TestClient, auth_fixture: AuthFixture) -> None:
    headers = auth_header(auth_fixture.receptionist.id)
    set_response = client.post(
        f"/api/visits/{auth_fixture.visit.id}/priority",
        headers=headers,
        json={"flag": True, "reason": "staff decision"},
    )
    assert set_response.status_code == 200
    assert set_response.json()["priority_flag"] is True

    remove_response = client.post(
        f"/api/visits/{auth_fixture.visit.id}/priority",
        headers=headers,
        json={"flag": False, "reason": "no longer needed"},
    )
    assert remove_response.status_code == 200
    assert remove_response.json()["priority_flag"] is False


def test_priority_requires_nonempty_reason(client: TestClient, auth_fixture: AuthFixture) -> None:
    headers = auth_header(auth_fixture.admin.id)
    response = client.post(
        f"/api/visits/{auth_fixture.visit.id}/priority",
        headers=headers,
        json={"flag": True, "reason": ""},
    )
    assert response.status_code == 422


def test_priority_on_in_service_visit_is_conflict(
    client: TestClient, auth_fixture: AuthFixture
) -> None:
    client.post(
        f"/api/visits/{auth_fixture.visit.id}/start",
        headers=auth_header(auth_fixture.provider_user.id),
    )

    response = client.post(
        f"/api/visits/{auth_fixture.visit.id}/priority",
        headers=auth_header(auth_fixture.receptionist.id),
        json={"flag": True, "reason": "x"},
    )
    assert response.status_code == 409
