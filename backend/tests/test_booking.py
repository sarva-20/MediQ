"""Appointment booking: happy path, patient scope, capacity/overbooking,
double-booking, cancellation, and token numbering."""

from datetime import UTC, datetime

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models.patient import Patient
from tests.conftest import AuthFixture
from tests.helpers import auth_header


def _slots(client: TestClient, provider_id: int) -> list[dict]:
    date_str = datetime.now(UTC).date().isoformat()
    return client.get(f"/api/providers/{provider_id}/slots?date={date_str}").json()


def _book(
    client: TestClient, headers: dict, patient_id: int, auth_fixture: AuthFixture, slot_id: int
):
    return client.post(
        "/api/appointments",
        headers=headers,
        json={
            "patient_id": patient_id,
            "provider_id": auth_fixture.provider.id,
            "service_id": auth_fixture.visit.service_id,
            "slot_id": slot_id,
        },
    )


def test_booking_happy_path(client: TestClient, auth_fixture: AuthFixture) -> None:
    slot = _slots(client, auth_fixture.provider.id)[0]
    response = _book(
        client,
        auth_header(auth_fixture.patient_user.id),
        auth_fixture.patient.id,
        auth_fixture,
        slot["id"],
    )

    assert response.status_code == 201
    body = response.json()
    events = client.get(
        f"/api/events?visit_id={body['id']}", headers=auth_header(auth_fixture.admin.id)
    ).json()
    assert any(e["type"] == "book" for e in events["items"])
    assert body["status"] == "booked"
    assert body["slot_id"] == slot["id"]
    assert body["token_no"]
    assert body["is_overbooked"] is False


def test_patient_cannot_book_for_someone_else(
    client: TestClient, auth_fixture: AuthFixture
) -> None:
    slot = _slots(client, auth_fixture.provider.id)[0]
    response = _book(
        client,
        auth_header(auth_fixture.patient_user.id),
        auth_fixture.other_patient_user.patient_id,
        auth_fixture,
        slot["id"],
    )
    assert response.status_code == 403


def test_capacity_full_rejects_and_overbook_allowed_up_to_limit(
    client: TestClient, auth_fixture: AuthFixture, session: Session
) -> None:
    # provider.slot_capacity=1 (default), overbook_limit=None -> falls back to
    # ClinicSettings.default_overbook_limit=2, so 1 base + 2 overbook = 3 fit.
    slot = _slots(client, auth_fixture.provider.id)[0]
    receptionist = auth_header(auth_fixture.receptionist.id)

    extra_patients = [Patient(full_name=f"Extra {i}", phone=f"9800000{i:03d}") for i in range(2)]
    session.add_all(extra_patients)
    session.commit()
    for p in extra_patients:
        session.refresh(p)
    patient_ids = [
        auth_fixture.patient.id,
        auth_fixture.other_patient_user.patient_id,
        extra_patients[0].id,
        extra_patients[1].id,
    ]

    responses = [_book(client, receptionist, pid, auth_fixture, slot["id"]) for pid in patient_ids]

    assert [r.status_code for r in responses[:3]] == [201, 201, 201]
    assert [r.json()["is_overbooked"] for r in responses[:3]] == [False, True, True]
    assert responses[3].status_code == 409


def test_double_booking_same_slot_rejected(client: TestClient, auth_fixture: AuthFixture) -> None:
    slot = _slots(client, auth_fixture.provider.id)[0]
    headers = auth_header(auth_fixture.receptionist.id)

    first = _book(client, headers, auth_fixture.patient.id, auth_fixture, slot["id"])
    assert first.status_code == 201

    second = _book(client, headers, auth_fixture.patient.id, auth_fixture, slot["id"])
    assert second.status_code == 409


def test_cancel_frees_capacity(client: TestClient, auth_fixture: AuthFixture) -> None:
    slot = _slots(client, auth_fixture.provider.id)[0]
    headers = auth_header(auth_fixture.patient_user.id)

    booked = _book(client, headers, auth_fixture.patient.id, auth_fixture, slot["id"])
    visit_id = booked.json()["id"]

    cancel_response = client.post(f"/api/appointments/{visit_id}/cancel", headers=headers)
    assert cancel_response.status_code == 200

    after = next(s for s in _slots(client, auth_fixture.provider.id) if s["id"] == slot["id"])
    assert after["booked_count"] == slot["booked_count"]


def test_token_numbering_skips_past_a_preexisting_collision(
    client: TestClient, auth_fixture: AuthFixture
) -> None:
    # auth_fixture.visit already holds token "GM-A001" with scheduled_start=None
    # (so it's invisible to the day-window count query) — a naive re-count on
    # retry would regenerate "GM-A001" forever. This must still succeed by
    # advancing to the next candidate instead.
    slot = _slots(client, auth_fixture.provider.id)[0]
    response = _book(
        client,
        auth_header(auth_fixture.receptionist.id),
        auth_fixture.patient.id,
        auth_fixture,
        slot["id"],
    )
    assert response.status_code == 201
    assert response.json()["token_no"] != auth_fixture.visit.token_no


def test_token_numbers_unique_and_sequential(
    client: TestClient, auth_fixture: AuthFixture, session: Session
) -> None:
    slots = _slots(client, auth_fixture.provider.id)
    headers = auth_header(auth_fixture.receptionist.id)

    patients = [Patient(full_name=f"Seq {i}", phone=f"9700001{i:02d}") for i in range(3)]
    session.add_all(patients)
    session.commit()
    for p in patients:
        session.refresh(p)

    tokens = []
    for i, patient in enumerate(patients):
        response = _book(client, headers, patient.id, auth_fixture, slots[i]["id"])
        assert response.status_code == 201
        tokens.append(response.json()["token_no"])

    assert len(set(tokens)) == len(tokens)
    numbers = sorted(int(t.split("-A")[1]) for t in tokens)
    assert numbers == list(range(numbers[0], numbers[0] + len(numbers)))
