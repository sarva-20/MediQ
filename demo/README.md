# Demo Instructions

## Demo URL

Not deployed — local only.

## Local Demo

```bash
make install                      # first time only
cp .env.example .env               # first time only
make run                           # starts the backend at http://localhost:8000
cd backend && ../backend/.venv/bin/python -m app.seed --scenario demo   # first time only, seeds the dense demo scenario
```

`--scenario demo` (or `POST /api/sim/seed` with body `{"scenario": "demo"}`, admin-only) builds a busier, single-screen version of the clinic instead of the default scattered scenario — see **Demo Flow** below. Omit `--scenario` (or send `{}`/no body to `/api/sim/seed`) for the plain scenario used by the automated tests.

API docs / Swagger UI: `http://localhost:8000/docs`. Developer console (recommended for the live demo): `http://localhost:8000/console`.

## Demo Credentials

Hackathon-only, seeded by `python -m app.seed` — **never real credentials**. All accounts share the same password.

| Username | Role | Password |
|---|---|---|
| `admin` | Clinic admin | `MediQ@2026` |
| `receptionist` | Receptionist | `MediQ@2026` |
| `patient` | Patient (demo) | `MediQ@2026` |
| `gm_doc_1`, `gm_doc_2`, `oph_doc_1`, `ped_doc_1`, `rad_xray_1`, `rad_us_1`, `rad_ct_1` | Provider (one per seeded provider) | `MediQ@2026` |

Log in at `POST /api/auth/login` (or via the console's Session panel), which returns a bearer JWT — see `docs/api-contract.md` § Authentication.

## Demo Flow

All steps assume the app was seeded with `--scenario demo` (or `POST /api/sim/seed {"scenario": "demo"}`). Log in as `admin` or `receptionist` for every write call below; the console's Session panel, Live Queue Board, and Simulated Clock panel are the easiest way to drive this live — the raw `curl`/endpoint is given for reference.

The seed builds one screen's worth of story:

- **General Medicine, Dr. Ananya Iyer (`gm_doc_1`)** — the main storyline. Token `GM-A001` is `in_service`; `GM-A002`/`GM-A003` (appointments) and `GM-W001` (walk-in) are `checked_in` and waiting; `GM-A005`/`GM-A006` are `booked` later this hour; `GM-A004` is `booked` with a `scheduled_start` just inside its no-show grace window — advancing the clock 10 minutes expires it.
- **General Medicine, Dr. Vikram Nair (`gm_doc_2`)** — deliberately light (one booked appointment far out), so a routed walk-in visibly prefers him over Dr. Iyer.
- **Radiology** — CT (`rad_ct_1`) has two scans queued (`RAD-A001`/`RAD-A002`, prep time inflates their wait); X-Ray (`rad_xray_1`) and Ultrasound (`rad_us_1`) each have one walk-in queued (`RAD-W001`/`RAD-W002`).
- **Paediatrics (`ped_doc_1`)** and **Ophthalmology (`oph_doc_1`)** — one checked-in and one booked patient each.

Script:

1. **Show the starting board.** `GET /api/queue/overview` (or the console's Live Queue Board) — every department has visible load; Dr. Iyer's queue is clearly heavier than Dr. Nair's.
2. **Create an appointment.** `POST /api/appointments` with `patient_id`, `provider_id` = Dr. Iyer's, `service_id` = General Consultation, and a `slot_id` from `GET /api/providers/{id}/slots?date=<today>` later in the day. Response includes the new token and `estimated_wait_min`.
3. **Create a walk-in with auto-routing.** `POST /api/walk-ins` with a new patient (`full_name`, `phone`), `department_id` = General Medicine, `service_id` = General Consultation, and **no** `provider_id`. The response's `routing_explanation` names Dr. Nair (his queue is shorter) — e.g. *"Routed to Dr. Vikram Nair: shortest wait (X min vs Y min)"*. This is the load-balancing story.
4. **Start a visit.** `POST /api/visits/{id}/start` on `GM-A002` (one of Dr. Iyer's checked-in patients). Its status flips to `in_service`; `GM-A003` and `GM-W001` behind it recompute their `estimated_wait_min` downward.
5. **Trigger a delay.** `POST /api/visits/{id}/delay` on the now in-service `GM-A002` with a body like `{"minutes": 15, "reason": "Running behind"}`. Re-fetch `GET /api/queue/providers/{gm_doc_1_id}` and point out every waiting visit's `estimated_wait_min` and `eta_reason` shifting later — the delay ripples through the whole queue.
6. **Advance the clock 10 minutes.** `POST /api/sim/advance {"minutes": 10}` (or the console's Simulated Clock panel). `GM-A004` — booked 1 minute before "now" at seed time — is now past its `noshow_grace_minutes` window and is auto-marked `no_show`; `GM-A005`/`GM-A006` move up a position and their `estimated_wait_min` drops. Confirm via `GET /api/events?provider_id={gm_doc_1_id}` (a `no_show` event, `reason: "auto: past scheduled_start + grace period"`) or by diffing the queue board before/after.
7. **Complete a visit.** `POST /api/visits/{id}/complete` on `GM-A001` (the original in-service patient). Its status becomes `completed`, it drops off the live queue, and `GET /api/metrics` reflects it in `completed_today` and in that service's `learned_avg_duration_min`.
8. **Public status lookup.** `GET /api/status/{token_no}` for the new walk-in's token from step 3 — no login required. Shows position, patients ahead, and estimated wait exactly as a patient would see it on their phone.

## Expected Demo Duration

Recommended: 5 minutes working demonstration + technical explanation + jury questions.

## Important

The demonstrated application must correspond to the code present in the official frozen submission.
