"""The 'demo' seed scenario: its starting state, and the no-show ripple after
advancing the simulated clock 10 minutes (see demo/README.md)."""

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.models.enums import VisitStatus
from app.models.provider import Provider
from app.models.user import User
from app.models.visit import Visit
from app.seed.run import seed
from tests.helpers import auth_header


def _admin_headers(session: Session) -> dict[str, str]:
    admin = session.exec(select(User).where(User.username == "admin")).one()
    return auth_header(admin.id)


def _provider(session: Session, key_name: str) -> Provider:
    return session.exec(select(Provider).where(Provider.name == key_name)).one()


def test_demo_scenario_starting_state(client: TestClient, session: Session) -> None:
    summary = seed(session, scenario="demo")
    assert not summary.skipped
    assert summary.visits == 16

    doc1 = _provider(session, "Dr. Ananya Iyer")
    doc1_visits = session.exec(select(Visit).where(Visit.provider_id == doc1.id)).all()
    assert len(doc1_visits) == 7
    assert sum(v.status == VisitStatus.IN_SERVICE for v in doc1_visits) == 1
    assert sum(v.status == VisitStatus.CHECKED_IN for v in doc1_visits) == 3
    assert sum(v.status == VisitStatus.BOOKED for v in doc1_visits) == 3

    headers = _admin_headers(session)
    doc1_queue = client.get(f"/api/queue/providers/{doc1.id}", headers=headers).json()
    assert doc1_queue["current_token"] is not None  # the IN_SERVICE visit

    doc2 = _provider(session, "Dr. Vikram Nair")
    doc2_queue = client.get(f"/api/queue/providers/{doc2.id}", headers=headers).json()
    assert len(doc2_queue["queue"]) < len(doc1_queue["queue"])  # deliberately lighter

    ct = _provider(session, "CT Unit 1")
    ct_visits = session.exec(select(Visit).where(Visit.provider_id == ct.id)).all()
    assert len(ct_visits) == 2


def test_demo_scenario_no_show_ripple_after_advancing_clock(
    client: TestClient, session: Session
) -> None:
    seed(session, scenario="demo")
    headers = _admin_headers(session)
    doc1 = _provider(session, "Dr. Ananya Iyer")

    about_to_no_show = session.exec(
        select(Visit).where(
            Visit.provider_id == doc1.id,
            Visit.status == VisitStatus.BOOKED,
            Visit.scheduled_start.is_not(None),
        )
    ).all()
    soon = min(about_to_no_show, key=lambda v: v.scheduled_start)
    before_queue = client.get(f"/api/queue/providers/{doc1.id}", headers=headers).json()
    before_ids = {v["visit_id"] for v in before_queue["queue"]}
    assert soon.id in before_ids

    response = client.post("/api/sim/advance", json={"minutes": 10}, headers=headers)
    assert response.status_code == 200

    session.refresh(soon)
    assert soon.status == VisitStatus.NO_SHOW

    after_queue = client.get(f"/api/queue/providers/{doc1.id}", headers=headers).json()
    after_ids = {v["visit_id"] for v in after_queue["queue"]}
    assert soon.id not in after_ids
