# Demo Instructions

## Demo URL

Not deployed — local only.

## Local Demo

```bash
make install                      # first time only
cp .env.example .env               # first time only
make run                           # starts the backend at http://localhost:8000
cd backend && ../backend/.venv/bin/python -m app.seed   # first time only, seeds demo data
```

API docs / Swagger UI: `http://localhost:8000/docs`.

## Demo Credentials

Hackathon-only, seeded by `python -m app.seed` — **never real credentials**. All accounts share the same password.

| Username | Role | Password |
|---|---|---|
| `admin` | Clinic admin | `MediQ@2026` |
| `receptionist` | Receptionist | `MediQ@2026` |
| `patient` | Patient (demo) | `MediQ@2026` |
| `gm_doc_1`, `gm_doc_2`, `oph_doc_1`, `ped_doc_1`, `rad_xray_1`, `rad_us_1`, `rad_ct_1` | Provider (one per seeded provider) | `MediQ@2026` |

Login is not implemented yet (planned for Module M2); these accounts exist in the seeded database now so the frontend and auth work can build against real rows.

## Demo Flow

1. Show the seeded starting scenario: `GET /api/queue/overview` — mixed appointment states across all four departments (completed, in-service, delayed, no-show, booked).
2. Create a new appointment via `POST /api/appointments`, then a walk-in via `POST /api/walk-ins` — both get a token number and appear in the provider's queue.
3. Progress the queue: check the walk-in in (`POST /api/visits/{id}/check-in`), start it (`POST /api/visits/{id}/start`).
4. Trigger a delay scenario: `POST /api/visits/{id}/delay` on an in-service visit, and show downstream `estimated_wait_min` increase for everyone behind it in that provider's queue.
5. Look up the walk-in's token on the public status page: `GET /api/status/{token_no}` — no login required.

(Steps 2–5 exercise endpoints planned for Modules M3–M6; until then this flow is a target script, not yet runnable end-to-end — see `docs/requirements-traceability.md` for current status.)

## Expected Demo Duration

Recommended: 5 minutes working demonstration + technical explanation + jury questions.

## Important

The demonstrated application must correspond to the code present in the official frozen submission.
