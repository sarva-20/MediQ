"""GET /api/metrics on one constructed scenario covering every status/source."""

from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models.enums import VisitSource, VisitStatus
from app.models.visit import Visit
from tests.conftest import AuthFixture
from tests.helpers import auth_header


def test_metrics_covers_every_status_and_source(
    client: TestClient, auth_fixture: AuthFixture, session: Session
) -> None:
    now = datetime.now(UTC)
    provider = auth_fixture.provider
    service_id = auth_fixture.visit.service_id
    patient_id = auth_fixture.patient.id

    visits = [
        Visit(
            patient_id=patient_id,
            provider_id=provider.id,
            service_id=service_id,
            source=VisitSource.APPOINTMENT,
            token_no="GM-A100",
            status=VisitStatus.CHECKED_IN,
            scheduled_start=now + timedelta(minutes=5),
            checked_in_at=now,
        ),
        Visit(
            patient_id=patient_id,
            provider_id=provider.id,
            service_id=service_id,
            source=VisitSource.APPOINTMENT,
            token_no="GM-A101",
            status=VisitStatus.IN_SERVICE,
            checked_in_at=now - timedelta(minutes=20),
            started_at=now - timedelta(minutes=15),
        ),
        Visit(
            patient_id=patient_id,
            provider_id=provider.id,
            service_id=service_id,
            source=VisitSource.APPOINTMENT,
            token_no="GM-A102",
            status=VisitStatus.COMPLETED,
            checked_in_at=now - timedelta(minutes=60),
            started_at=now - timedelta(minutes=50),
            completed_at=now - timedelta(minutes=40),
        ),
        Visit(
            patient_id=patient_id,
            provider_id=provider.id,
            service_id=service_id,
            source=VisitSource.APPOINTMENT,
            token_no="GM-A103",
            status=VisitStatus.NO_SHOW,
            scheduled_start=now - timedelta(minutes=30),
        ),
        Visit(
            patient_id=patient_id,
            provider_id=provider.id,
            service_id=service_id,
            source=VisitSource.APPOINTMENT,
            token_no="GM-A104",
            status=VisitStatus.CANCELLED,
            scheduled_start=now + timedelta(minutes=45),
        ),
        Visit(
            patient_id=patient_id,
            provider_id=provider.id,
            service_id=service_id,
            source=VisitSource.WALKIN,
            token_no="GM-W100",
            status=VisitStatus.CHECKED_IN,
            checked_in_at=now,
        ),
    ]
    session.add_all(visits)
    session.commit()

    response = client.get("/api/metrics", headers=auth_header(auth_fixture.admin.id))
    assert response.status_code == 200
    body = response.json()

    # auth_fixture.visit (BOOKED) + the CHECKED_IN appointment + the walk-in.
    assert body["waiting_count"] == 3
    assert body["in_service_count"] == 1
    assert body["completed_today"] == 1
    assert body["no_show_count"] == 1
    assert body["cancelled_count"] == 1
    assert body["walkin_count"] == 1
    # + auth_fixture.visit (BOOKED, created today) = 6.
    assert body["appointment_count"] == 6
    assert body["avg_waiting_time_min"] == 7.5
    assert body["current_avg_estimated_wait_min"] >= 0
    assert len(body["provider_load"]) == 2  # both auth_fixture providers are active
    assert len(body["per_department"]) == 1
    dept = body["per_department"][0]
    assert dept["waiting_count"] == 3
    assert dept["in_service_count"] == 1


def test_metrics_filters_by_provider_id(
    client: TestClient, auth_fixture: AuthFixture
) -> None:
    response = client.get(
        f"/api/metrics?provider_id={auth_fixture.provider.id}",
        headers=auth_header(auth_fixture.admin.id),
    )
    assert response.status_code == 200
    body = response.json()
    assert len(body["provider_load"]) == 1
    assert body["provider_load"][0]["provider_id"] == auth_fixture.provider.id
