#!/usr/bin/env python
"""Real end-to-end smoke test. Drives the actual HTTP API with real logins
from the seeded demo users — no mocks, no direct-DB shortcuts for any action.
Boots a throwaway server against a temporary SQLite database (never touches
backend/mediq.db) and tears both down afterward, whatever the outcome.

Usage (from backend/, with the venv active):
    python scripts/smoke_e2e.py
or:
    make smoke
"""

from __future__ import annotations

import os
import socket
import subprocess
import sys
import tempfile
import time
from dataclasses import dataclass, field
from pathlib import Path

import httpx

BACKEND_DIR = Path(__file__).resolve().parent.parent
DEMO_PASSWORD = "MediQ@2026"  # from demo/README.md — hackathon-only
PROVIDER_4_NAME = "Dr. Karthik Raman"

# (username, expected role) — the full seeded cast, from demo/README.md.
DEMO_USERS = [
    ("admin", "admin"),
    ("receptionist", "receptionist"),
    ("patient", "patient"),
    ("gm_doc_1", "provider"),
    ("gm_doc_2", "provider"),
    ("oph_doc_1", "provider"),
    ("ped_doc_1", "provider"),
    ("rad_xray_1", "provider"),
    ("rad_us_1", "provider"),
    ("rad_ct_1", "provider"),
]


@dataclass
class Session:
    token: str
    role: str
    provider_id: int | None
    patient_id: int | None
    user_id: int


@dataclass
class Results:
    rows: list[tuple[str, bool, str]] = field(default_factory=list)

    def check(self, step: str, condition: bool, detail: str = "") -> bool:
        passed = bool(condition)
        self.rows.append((step, passed, detail))
        print(f"[{'PASS' if passed else 'FAIL'}] {step}" + (f" — {detail}" if detail else ""))
        return passed

    def print_table(self) -> bool:
        print("\n=== Smoke test results ===")
        name_width = max((len(r[0]) for r in self.rows), default=10) + 2
        for step, passed, detail in self.rows:
            mark = "PASS" if passed else "FAIL"
            print(f"{mark:4}  {step.ljust(name_width)}  {detail}")
        failed = sum(1 for _, passed, _ in self.rows if not passed)
        print(f"\n{len(self.rows)} steps, {failed} failed, {len(self.rows) - failed} passed")
        return failed == 0


def _free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def _run_seed(env: dict[str, str]) -> None:
    print("Seeding temporary database...")
    subprocess.run(
        [sys.executable, "-m", "app.seed", "--reset"],
        cwd=BACKEND_DIR,
        env=env,
        check=True,
    )


def _start_server(env: dict[str, str], port: int) -> subprocess.Popen:
    print(f"Starting API on 127.0.0.1:{port} ...")
    return subprocess.Popen(
        [
            sys.executable,
            "-m",
            "uvicorn",
            "app.main:app",
            "--host",
            "127.0.0.1",
            "--port",
            str(port),
        ],
        cwd=BACKEND_DIR,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )


def _wait_for_health(client: httpx.Client, timeout_s: float = 15.0) -> bool:
    deadline = time.monotonic() + timeout_s
    while time.monotonic() < deadline:
        try:
            if client.get("/api/health").status_code == 200:
                return True
        except httpx.TransportError:
            pass
        time.sleep(0.3)
    return False


def _login(client: httpx.Client, username: str) -> Session | None:
    response = client.post(
        "/api/auth/login", json={"username": username, "password": DEMO_PASSWORD}
    )
    if response.status_code != 200:
        return None
    body = response.json()
    return Session(
        token=body["access_token"],
        role=body["role"],
        provider_id=body["provider_id"],
        patient_id=body["patient_id"],
        user_id=body["user_id"],
    )


def _auth(session: Session) -> dict[str, str]:
    return {"Authorization": f"Bearer {session.token}"}


# --------------------------------------------------------------------------- steps


def step_1_login_and_print_demo_users(client: httpx.Client, results: Results) -> dict[str, Session]:
    sessions: dict[str, Session] = {}
    print("\n--- Demo users ---")
    print(f"{'username':14} {'role':13} provider_id")
    for username, expected_role in DEMO_USERS:
        session = _login(client, username)
        ok = results.check(
            f"login as {username}",
            session is not None and session.role == expected_role,
            f"role={session.role if session else None}",
        )
        if session is not None:
            sessions[username] = session
            print(f"{username:14} {session.role:13} {session.provider_id}")
        if not ok:
            continue
    results.check(
        "ped_doc_1 is provider_id=4",
        sessions.get("ped_doc_1") is not None and sessions["ped_doc_1"].provider_id == 4,
        f"got provider_id={sessions.get('ped_doc_1') and sessions['ped_doc_1'].provider_id}",
    )
    return sessions


def step_2_queue_overview_and_provider_4(
    client: httpx.Client, admin: Session, results: Results
) -> dict:
    overview = client.get("/api/queue/overview", headers=_auth(admin))
    providers = overview.json().get("providers", []) if overview.status_code == 200 else []
    results.check(
        "GET /api/queue/overview returns 7 providers",
        overview.status_code == 200 and len(providers) == 7,
        f"status={overview.status_code}, count={len(providers)}",
    )

    snapshot = client.get("/api/queue/providers/4", headers=_auth(admin))
    body = snapshot.json() if snapshot.status_code == 200 else {}
    queue = body.get("queue", [])
    results.check(
        "GET /api/queue/providers/4 returns provider 4's queue",
        snapshot.status_code == 200 and body.get("provider_name") == PROVIDER_4_NAME,
        f"status={snapshot.status_code}, provider_name={body.get('provider_name')!r}, "
        f"visits={[(v['visit_id'], v['estimated_wait_min']) for v in queue]}",
    )
    return body


def step_3_start_and_rbac_matrix(
    client: httpx.Client, sessions: dict[str, Session], provider_4_queue: dict, results: Results
) -> dict:
    waiting = provider_4_queue.get("queue", [])
    if len(waiting) < 2:
        results.check(
            "provider 4 has at least 2 waiting visits to run the scenario on",
            False,
            f"only found {len(waiting)}",
        )
        return {}
    first_visit_id = waiting[0]["visit_id"]
    second_visit_id = waiting[1]["visit_id"]

    start_first = client.post(
        f"/api/visits/{first_visit_id}/start", headers=_auth(sessions["ped_doc_1"])
    )
    start_first_status = (
        start_first.json().get("status") if start_first.status_code == 200 else start_first.text
    )
    results.check(
        "start first waiting visit as provider 4's own user -> 200 IN_SERVICE",
        start_first.status_code == 200 and start_first_status == "in_service",
        f"status={start_first.status_code}, body_status={start_first_status}",
    )

    start_second = client.post(
        f"/api/visits/{second_visit_id}/start", headers=_auth(sessions["ped_doc_1"])
    )
    results.check(
        "start a second visit for the same provider -> 409 (already in service)",
        start_second.status_code == 409,
        f"status={start_second.status_code}, body={start_second.text}",
    )

    recept_attempt = client.post(
        f"/api/visits/{second_visit_id}/start", headers=_auth(sessions["receptionist"])
    )
    results.check(
        "RBAC: receptionist cannot start a visit -> 403",
        recept_attempt.status_code == 403,
        f"status={recept_attempt.status_code}",
    )

    other_provider_attempt = client.post(
        f"/api/visits/{second_visit_id}/start", headers=_auth(sessions["rad_xray_1"])
    )
    results.check(
        "RBAC: a different provider cannot start provider 4's visit -> 403",
        other_provider_attempt.status_code == 403,
        f"status={other_provider_attempt.status_code}",
    )

    # Prove admin's override on a *different* provider's visit, so it doesn't
    # collide with provider 4's own in-service invariant above.
    gm_queue = client.get("/api/queue/providers/1", headers=_auth(sessions["admin"])).json()
    gm_waiting = gm_queue.get("queue", [])
    if gm_waiting:
        admin_start = client.post(
            f"/api/visits/{gm_waiting[0]['visit_id']}/start", headers=_auth(sessions["admin"])
        )
        results.check(
            "RBAC: admin can start any provider's visit (operational override)",
            admin_start.status_code == 200,
            f"status={admin_start.status_code}",
        )
    else:
        results.check(
            "RBAC: admin can start any provider's visit",
            False,
            "no waiting visit found on provider 1",
        )

    return {"first_visit_id": first_visit_id, "second_visit_id": second_visit_id}


def step_4_delay_raises_downstream_wait(
    client: httpx.Client, sessions: dict[str, Session], ids: dict, results: Results
) -> None:
    provider_headers = _auth(sessions["ped_doc_1"])
    admin_headers = _auth(sessions["admin"])

    before = client.get("/api/queue/providers/4", headers=admin_headers).json()
    second = next((v for v in before["queue"] if v["visit_id"] == ids["second_visit_id"]), None)
    baseline_wait = second["estimated_wait_min"] if second else None

    delay_response = client.post(
        f"/api/visits/{ids['first_visit_id']}/delay",
        headers=provider_headers,
        json={"minutes": 15, "reason": "Consultation running long"},
    )
    results.check(
        "delay in-service visit by 15 minutes -> 200",
        delay_response.status_code == 200,
        f"status={delay_response.status_code}",
    )

    after = client.get("/api/queue/providers/4", headers=admin_headers).json()
    second_after = next(
        (v for v in after["queue"] if v["visit_id"] == ids["second_visit_id"]), None
    )
    rose_by = (
        (second_after["estimated_wait_min"] - baseline_wait)
        if second_after and baseline_wait is not None
        else None
    )
    after_wait = second_after["estimated_wait_min"] if second_after else None
    results.check(
        "waiting visit's estimated_wait_min rose by ~15 after the delay",
        rose_by is not None and 10 <= rose_by <= 20,
        f"baseline={baseline_wait}, after={after_wait}, delta={rose_by}",
    )
    results.check(
        "waiting visit's eta_reason mentions the delay",
        second_after is not None
        and "delay logged by provider" in (second_after.get("eta_reason") or ""),
        f"eta_reason={second_after.get('eta_reason') if second_after else None!r}",
    )
    ids["baseline_after_delay_wait"] = second_after["estimated_wait_min"] if second_after else None


def step_5_complete_drops_downstream_wait_and_updates_ewma(
    client: httpx.Client,
    sessions: dict[str, Session],
    ids: dict,
    db_path: str,
    results: Results,
) -> None:
    provider_headers = _auth(sessions["ped_doc_1"])
    admin_headers = _auth(sessions["admin"])

    complete_response = client.post(
        f"/api/visits/{ids['first_visit_id']}/complete", headers=provider_headers
    )
    results.check(
        "complete the in-service visit -> 200",
        complete_response.status_code == 200
        and complete_response.json().get("status") == "completed",
        f"status={complete_response.status_code}",
    )

    after = client.get("/api/queue/providers/4", headers=admin_headers).json()
    still_present = any(v["visit_id"] == ids["first_visit_id"] for v in after["queue"])
    results.check(
        "completed visit disappears from the waiting list",
        not still_present,
        f"queue visit_ids={[v['visit_id'] for v in after['queue']]}",
    )

    second_after_complete = next(
        (v for v in after["queue"] if v["visit_id"] == ids["second_visit_id"]), None
    )
    before_wait = ids.get("baseline_after_delay_wait")
    after_wait = second_after_complete["estimated_wait_min"] if second_after_complete else None
    results.check(
        "next visit's wait drops once the provider frees up",
        before_wait is not None and after_wait is not None and after_wait < before_wait,
        f"before={before_wait}, after={after_wait}",
    )

    # No HTTP endpoint exposes ServiceDurationStat — this is a read-only,
    # verification-only check (not an action taken outside the API), using
    # the raw sqlite file directly rather than importing the app's ORM.
    import sqlite3

    conn = sqlite3.connect(db_path)
    try:
        service_id = conn.execute(
            "SELECT service_id FROM visits WHERE id = ?", (ids["first_visit_id"],)
        ).fetchone()[0]
        row = conn.execute(
            "SELECT sample_count, ewma_minutes FROM service_duration_stats "
            "WHERE provider_id = 4 AND service_id = ?",
            (service_id,),
        ).fetchone()
    finally:
        conn.close()
    results.check(
        "ServiceDurationStat updated after complete",
        row is not None and row[0] >= 1 and row[1] > 0,
        f"row={row}",
    )


def step_6_events_show_expected_sequence(
    client: httpx.Client, sessions: dict[str, Session], ids: dict, results: Results
) -> None:
    events = client.get("/api/events?provider_id=4", headers=_auth(sessions["admin"])).json()
    items = events.get("items", [])
    visit_events = [e for e in items if e["visit_id"] == ids["first_visit_id"]]
    types_newest_first = [e["type"] for e in visit_events]
    results.check(
        "GET /api/events?provider_id=4 shows start, delay, complete (newest first)",
        types_newest_first[:3] == ["complete", "delay", "start"],
        f"types={types_newest_first}",
    )
    results.check(
        "events carry actor_user_id and sim_time",
        bool(visit_events)
        and all(e.get("actor_user_id") is not None and e.get("sim_time") for e in visit_events[:3]),
        f"sample={visit_events[:1]}",
    )


def step_7_clock_advance_auto_no_show(
    client: httpx.Client, sessions: dict[str, Session], ids: dict, results: Results
) -> None:
    admin_headers = _auth(sessions["admin"])
    other_provider_before = client.get("/api/queue/providers/1", headers=admin_headers).json()
    other_wait_before = {
        v["visit_id"]: v["estimated_wait_min"] for v in other_provider_before["queue"]
    }

    advance = client.post("/api/sim/advance", headers=admin_headers, json={"minutes": 30})
    results.check(
        "POST /api/sim/advance {minutes: 30} -> 200",
        advance.status_code == 200,
        f"status={advance.status_code}",
    )

    provider_4_after = client.get("/api/queue/providers/4", headers=admin_headers).json()
    second_visit = client.get(
        "/api/events?visit_id=" + str(ids["second_visit_id"]), headers=admin_headers
    ).json()
    no_show_events = [e for e in second_visit.get("items", []) if e["type"] == "no_show"]
    results.check(
        "never-checked-in BOOKED appointment past grace became NO_SHOW",
        bool(no_show_events) and no_show_events[0]["payload"].get("reason", "").startswith("auto:"),
        f"events={[e['type'] for e in second_visit.get('items', [])]}",
    )
    results.check(
        "the no-show visit no longer appears in the waiting list",
        not any(v["visit_id"] == ids["second_visit_id"] for v in provider_4_after["queue"]),
        f"queue={[v['visit_id'] for v in provider_4_after['queue']]}",
    )

    other_provider_after = client.get("/api/queue/providers/1", headers=admin_headers).json()
    other_wait_after = {
        v["visit_id"]: v["estimated_wait_min"] for v in other_provider_after["queue"]
    }
    changed = any(
        visit_id in other_wait_before
        and other_wait_before[visit_id] != other_wait_after.get(visit_id)
        for visit_id in other_wait_before
    )
    results.check(
        "advancing the clock refreshed estimates for other providers too",
        changed,
        f"before={other_wait_before}, after={other_wait_after}",
    )


def step_8_public_status_has_no_private_data(
    client: httpx.Client, provider_4_queue_initial: dict, ids: dict, results: Results
) -> None:
    token_no = next(
        (
            v["token_no"]
            for v in provider_4_queue_initial["queue"]
            if v["visit_id"] == ids["second_visit_id"]
        ),
        None,
    )
    if token_no is None:
        results.check(
            "GET /api/status/{token_no} without a token", False, "couldn't resolve token_no"
        )
        return
    response = client.get(f"/api/status/{token_no}")
    body = response.json() if response.status_code == 200 else {}
    results.check(
        "GET /api/status/{token_no} works with no Authorization header",
        response.status_code == 200,
        f"status={response.status_code}",
    )
    results.check(
        "public status has no phone/full name",
        "phone" not in body and "patient_name" not in body,
        f"keys={sorted(body.keys())}",
    )


def step_9_illegal_transitions_return_409(
    client: httpx.Client, sessions: dict[str, Session], ids: dict, results: Results
) -> None:
    complete_waiting = client.post(
        f"/api/visits/{ids['second_visit_id']}/complete", headers=_auth(sessions["admin"])
    )
    body = (
        complete_waiting.json()
        if complete_waiting.headers.get("content-type", "").startswith("application/json")
        else {}
    )
    results.check(
        "completing a non-in-service visit -> 409 with standard error envelope",
        complete_waiting.status_code == 409 and body.get("error", {}).get("code") == "conflict",
        f"status={complete_waiting.status_code}, body={body}",
    )

    start_completed = client.post(
        f"/api/visits/{ids['first_visit_id']}/start", headers=_auth(sessions["ped_doc_1"])
    )
    body2 = start_completed.json() if start_completed.status_code != 204 else {}
    results.check(
        "starting an already-completed visit -> 409 with standard error envelope",
        start_completed.status_code == 409 and body2.get("error", {}).get("code") == "conflict",
        f"status={start_completed.status_code}, body={body2}",
    )


# --------------------------------------------------------------------------- main


def main() -> int:
    results = Results()
    port = _free_port()
    db_fd, db_path = tempfile.mkstemp(prefix="mediq_smoke_", suffix=".db")
    os.close(db_fd)
    os.remove(db_path)  # SQLite creates its own file at first connection

    env = os.environ.copy()
    env["DATABASE_URL"] = f"sqlite:///{db_path}"
    env["ENVIRONMENT"] = "development"

    server: subprocess.Popen | None = None
    try:
        _run_seed(env)
        server = _start_server(env, port)
        with httpx.Client(base_url=f"http://127.0.0.1:{port}", timeout=10.0) as client:
            if not results.check("API becomes healthy", _wait_for_health(client)):
                return 1

            sessions = step_1_login_and_print_demo_users(client, results)
            provider_4_initial = step_2_queue_overview_and_provider_4(
                client, sessions["admin"], results
            )
            ids = step_3_start_and_rbac_matrix(client, sessions, provider_4_initial, results)
            if not ids:
                return 1
            step_4_delay_raises_downstream_wait(client, sessions, ids, results)
            step_5_complete_drops_downstream_wait_and_updates_ewma(
                client, sessions, ids, db_path, results
            )
            step_6_events_show_expected_sequence(client, sessions, ids, results)
            step_7_clock_advance_auto_no_show(client, sessions, ids, results)
            step_8_public_status_has_no_private_data(client, provider_4_initial, ids, results)
            step_9_illegal_transitions_return_409(client, sessions, ids, results)
    finally:
        if server is not None:
            server.terminate()
            try:
                server.wait(timeout=5)
            except subprocess.TimeoutExpired:
                server.kill()
                server.wait()
        for suffix in ("", "-journal", "-wal", "-shm"):
            candidate = Path(db_path + suffix)
            if candidate.exists():
                candidate.unlink()

    return 0 if results.print_table() else 1


if __name__ == "__main__":
    sys.exit(main())
