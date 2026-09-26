"""End-to-end scenarios against seeded data: the full engine + service + API
stack together, not just the pure engine in isolation (see test_engine.py)."""

from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.models.enums import VisitSource, VisitStatus
from app.models.patient import Patient
from app.models.provider import Provider
from app.models.service import Service
from app.models.service_duration_stat import ServiceDurationStat
from app.models.user import User
from app.models.visit import Visit
from app.seed.run import seed
from tests.helpers import auth_header


def _user(session: Session, username: str) -> User:
    user = session.exec(select(User).where(User.username == username)).first()
    assert user is not None
    return user


def _oph_doc_1_context(session: Session) -> tuple[Provider, Service, list[Patient]]:
    """oph_doc_1 has no active visits in the seeded starting scenario — a clean
    provider to build an isolated demo scenario on top of."""
    provider = session.get(Provider, _user(session, "oph_doc_1").provider_id)
    service = session.exec(
        select(Service).where(Service.department_id == provider.department_id)
    ).first()
    patients = session.exec(select(Patient).limit(2)).all()
    return provider, service, patients


def test_start_delay_complete_raises_downstream_estimates_and_updates_ewma(
    client: TestClient, session: Session
) -> None:
    seed(session)
    receptionist_headers = auth_header(_user(session, "receptionist").id)
    provider_headers = auth_header(_user(session, "oph_doc_1").id)
    provider, service, (patient, other_patient) = _oph_doc_1_context(session)
    now = datetime.now(UTC)

    ahead = Visit(
        patient_id=patient.id,
        provider_id=provider.id,
        service_id=service.id,
        source=VisitSource.APPOINTMENT,
        token_no="TEST-A001",
        status=VisitStatus.BOOKED,
        scheduled_start=now,
    )
    behind = Visit(
        patient_id=other_patient.id,
        provider_id=provider.id,
        service_id=service.id,
        source=VisitSource.APPOINTMENT,
        token_no="TEST-A002",
        status=VisitStatus.BOOKED,
        scheduled_start=now + timedelta(minutes=20),
    )
    session.add_all([ahead, behind])
    session.commit()
    session.refresh(ahead)
    session.refresh(behind)

    start_response = client.post(f"/api/visits/{ahead.id}/start", headers=provider_headers)
    assert start_response.status_code == 200

    before = client.get(f"/api/queue/providers/{provider.id}", headers=receptionist_headers).json()
    wait_before = next(v for v in before["queue"] if v["visit_id"] == behind.id)[
        "estimated_wait_min"
    ]

    delay_response = client.post(
        f"/api/visits/{ahead.id}/delay",
        headers=provider_headers,
        json={"minutes": 15, "reason": "consultation running long"},
    )
    assert delay_response.status_code == 200

    after = client.get(f"/api/queue/providers/{provider.id}", headers=receptionist_headers).json()
    behind_after = next(v for v in after["queue"] if v["visit_id"] == behind.id)
    assert behind_after["estimated_wait_min"] > wait_before
    assert "delay logged by provider" in behind_after["eta_reason"]

    complete_response = client.post(f"/api/visits/{ahead.id}/complete", headers=provider_headers)
    assert complete_response.status_code == 200

    stat = session.get(ServiceDurationStat, (provider.id, service.id))
    assert stat is not None
    assert stat.sample_count == 1
    assert stat.ewma_minutes > 0


def test_clock_advance_auto_marks_no_show(client: TestClient, session: Session) -> None:
    seed(session)
    admin_headers = auth_header(_user(session, "admin").id)
    provider, service, (patient, _) = _oph_doc_1_context(session)
    now = datetime.now(UTC)

    overdue = Visit(
        patient_id=patient.id,
        provider_id=provider.id,
        service_id=service.id,
        source=VisitSource.APPOINTMENT,
        token_no="TEST-A003",
        status=VisitStatus.BOOKED,
        scheduled_start=now - timedelta(minutes=20),  # default grace is 10 minutes
    )
    session.add(overdue)
    session.commit()
    session.refresh(overdue)

    response = client.post("/api/sim/advance", headers=admin_headers, json={"minutes": 1})
    assert response.status_code == 200

    session.refresh(overdue)
    assert overdue.status is VisitStatus.NO_SHOW


def test_public_status_exposes_no_private_data(client: TestClient, session: Session) -> None:
    seed(session)
    visit = session.exec(select(Visit).where(Visit.status == VisitStatus.BOOKED)).first()
    assert visit is not None

    response = client.get(f"/api/status/{visit.token_no}")
    assert response.status_code == 200
    body = response.json()

    assert "patient_name" not in body
    assert "phone" not in body
    assert set(body.keys()) == {
        "token_no",
        "department_code",
        "provider_name",
        "room_label",
        "status",
        "position",
        "patients_ahead",
        "now_serving_token",
        "estimated_start",
        "estimated_wait_min",
        "eta_reason",
    }
