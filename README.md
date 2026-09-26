# URAN 2026 – 12-Hour Hackathon

**Organizer:** Department of Computer Applications, PMIST  
**Event:** URAN 2026  
**Repository Type:** Official Team Submission Repository

> This repository is the official implementation record for the team.  
> Only code and documentation pushed before the official freeze time will be considered for evaluation.

---

## 1. Team Information

- **Team ID:** `HT-03`
- **Track:** `HealthTech`
- **Challenge ID:** `HT-03`
- **Project Title:** `MediQ`
- **Team Lead:** `Sarvatarshan Sankar`
- **Repository Start Time:** `9.30 AM`
- **Final Freeze Time:** `To be recorded by organizers`

### Team Members

| No. | Name | Register No. | GitHub Username | Primary Responsibility |
|---|---|---|---|---|
| 1 | SARVATARSHAN SANKAR | 23CB051 | sarva-20 | Backend Dev & Team Lead |
| 2 | Prabakaran S R | 23CB031 | Prabakaransr19 | Algorithm Developer |
| 3 | Danush Aditya | 23CB005 | DanushAditya | Data Engineer |
| 4 | Rakesh Pranav K S | 23CB037 | RakeshPranav | Frontend Developer |

---

## 2. Problem Statement

Outpatient clinics run two separate, uncoordinated queues: patients with booked appointments and walk-ins who arrive and wait. Without a shared view of both, slot capacity is either wasted (a doctor idle because a booked patient is late) or overbooked (walk-ins stacking up behind appointments with no visibility into the wait). Patients get no reliable estimate of when they will be seen, receptionists track queues manually or on paper, and delays or no-shows cascade through the rest of the day with nothing to re-plan around them.

MediQ is an operational queue-management prototype for outpatient clinics that unifies appointments and walk-ins into one queue per provider. It allocates slot capacity (including configurable overbooking), issues walk-in tokens, and runs a single deterministic engine that recomputes queue position and estimated wait time after every state-changing event: booking, walk-in issue, check-in, service start, delay, completion, cancellation, or no-show. The system is scoped strictly to scheduling and logistics — priority order is either the natural queue order or a status set explicitly by staff/simulation; it is never inferred from symptoms or any clinical signal, since this is not a triage system.

The prototype covers four departments (General Medicine, Ophthalmology, Paediatrics, and Radiology, where "providers" are scanners: X-ray, Ultrasound, CT with longer service and prep durations) through one shared engine, with a receptionist/staff dashboard, a public no-login token status page for patients, and live updates over Server-Sent Events.

## 3. Proposed Solution

MediQ gives each clinic department a single live queue that merges scheduled appointments and walk-in tokens, ranked by arrival/slot order unless a staff member explicitly marks a case for priority handling. A rules-based engine (not a black box, not a triage model) computes estimated wait time from configurable per-service duration assumptions, current queue depth, and provider/counter load, and re-runs that computation after every lifecycle event so the estimate stays current through delays and no-shows.

**Intended users:**
- **Patients** — book an appointment or take a walk-in token, then track their status on a public, no-login page (current token, position, estimated wait).
- **Receptionists** — book appointments, issue walk-in tokens, check patients in, and see the live queue per department.
- **Doctors / technicians (providers)** — see their own queue, start/complete/delay a case, and see their own load.
- **Clinic admins** — configure departments, providers/scanners, slot capacity, overbooking limits, and service-duration assumptions; view clinic-wide metrics.

**Main value delivered:** a realistic, demonstrable replacement for the paper/mental queue tracking clinics use today — accurate live wait estimates, automatic re-balancing of load across counters, and full visibility for staff and patients, all backed by a single deterministic recompute step so the queue state is always explainable.

## 4. Core Features Implemented

**Required**
- [ ] Appointment booking (department, provider, date/slot)
- [ ] Provider / service selection
- [ ] Slot capacity configuration per provider
- [ ] Walk-in token generation
- [ ] Queue status view (current token, position, per department/provider)
- [ ] Estimated wait time calculation
- [ ] Completion / cancellation status updates
- [ ] Delay- and no-show-aware queue algorithm (recompute on every lifecycle event)
- [ ] Staff dashboard (receptionist / provider / admin views)
- [ ] Patient-facing status view (public, no login, token lookup)
- [ ] Overbooking limits per slot
- [ ] Predicted service duration (configurable per department/service)
- [ ] Queue-load balancing across counters (e.g. multiple scanners for Radiology)

**Metrics**
- [ ] Current token per department/provider
- [ ] Estimated wait time
- [ ] Next appointments
- [ ] Provider load
- [ ] Average waiting time
- [ ] Number of delayed cases

Checklist reflects the plan in [Checkpoint 1](CHECKPOINTS.md); items are ticked as they are implemented and demonstrated.

## 5. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + Tailwind CSS (`/frontend`, added after backend API stabilizes) |
| Backend | Python 3.12, FastAPI, Server-Sent Events for live queue updates |
| Database | SQLite via SQLModel (SQLAlchemy + Pydantic) |
| AI / ML | None — operational/rules-based queue engine only, no ML or triage model |
| APIs / Services | None external; all logic is self-contained for the demo |
| Deployment / Runtime | Local (uvicorn); no cloud deployment for this prototype |

No AI/ML component is used because the problem is explicitly operational scheduling, not clinical triage — see [Known Limitations](#13-known-limitations).

## 6. System Architecture

Full explanation, the event → `recompute(provider, now)` design, wait-time estimation approach, RBAC, and the simulated clock are in [`docs/architecture.md`](docs/architecture.md), including a Mermaid diagram.

The rendered diagram will also be exported to `docs/architecture.png` before final submission.

## 7. How to Run the Project

### Prerequisites

- Python 3.12
- [`uv`](https://github.com/astral-sh/uv) (or `pip`) for dependency management
- Node.js 20+ and npm (only once `/frontend` is scaffolded)
- No external accounts or paid services are required

### Installation

```bash
git clone <repository-url>
cd MediQ
make install
```

`make install` creates `backend/.venv` (Python 3.12) and installs pinned dependencies from `backend/requirements-dev.txt`.

### Configuration

Do **not** commit passwords, API keys, access tokens, database credentials, or private keys.

Copy `.env.example` to `.env` at the repository root (or `backend/.env`) and adjust values if needed — the defaults work out of the box for local demo use:

```bash
cp .env.example .env
```

### Run

```bash
make run    # starts the FastAPI backend at http://localhost:8000
make test   # runs the backend pytest suite
make lint   # runs ruff
```

Health check: `GET http://localhost:8000/api/health` → `{"status": "ok"}`.

Interactive API docs (Swagger UI): `http://localhost:8000/docs`.

**Developer console:** `http://localhost:8000/console` — a browser-based tool for exercising and demoing every backend module (login, simulated clock, catalog, live queue board, booking/lifecycle actions, metrics, and scripted demo scenarios) without touching the terminal. See [Simulation and Test Console](docs/architecture.md#7-simulation-and-test-console-development-tool) in the architecture doc.

## 8. Demo Credentials

If demo credentials are required, provide **temporary hackathon-only credentials** here or in `demo/README.md`.

Never publish personal or production credentials.

## 9. Testing / Validation

Backend: `pytest` (via `make test`) covering the API contract and, as they are implemented, the queue engine's wait-time and recompute logic. Linting via `ruff` (`make lint`). Manual end-to-end validation of the demo flow (see [`demo/README.md`](demo/README.md)) — appointment creation, a walk-in, queue progression, a simulated delay, and updated wait-time estimates.

| Test / Validation | Result |
|---|---|
| Core feature test | TODO — update as features land |
| Error handling | TODO |
| Input validation | TODO |
| Responsive UI | TODO (pending frontend) |
| Security / privacy checks | TODO |

## 10. Screenshots

Add final screenshots to:

`docs/screenshots/`

## 11. External Resources Used

Declare all significant external resources:

- Open-source libraries/frameworks: FastAPI, SQLModel, SQLAlchemy, Pydantic / pydantic-settings, Uvicorn, pytest, ruff, uv; (frontend) React, Vite, Tailwind CSS — all free/open source
- APIs: None
- Pretrained models: None
- Datasets: None — all demo data is synthetic, generated by `backend/app/seed/`
- Templates: None beyond this repository's official URAN 2026 template files
- Tutorials/reference code: Official FastAPI, SQLModel, and Server-Sent Events documentation, consulted for standard usage patterns
- Other third-party resources: None

## 12. AI Tool Disclosure

Complete `AI_DISCLOSURE.md`.

Use of AI tools is allowed unless organizers announce otherwise, but **all meaningful use must be declared**. Teams must be able to explain and demonstrate the submitted implementation.

## 13. Known Limitations

- Priority status is set only by explicit staff action or the demo simulator — the system performs no symptom-based or clinical triage, by design, not as an oversight.
- All demo data (patients, appointments, walk-ins, delays) is synthetic and generated by `backend/app/seed/`; no real patient data is used or stored.
- No authentication/authorization backend yet — role separation (patient/receptionist/provider/admin) is planned but not enforced at the API layer during early development; see [`docs/architecture.md`](docs/architecture.md) for the RBAC plan.
- SQLite is used for simplicity; not intended for concurrent multi-writer production use.
- The "simulated clock" used for the delay/no-show demo scenario is a development-only mechanism, not present in a production deployment.
- Frontend is not yet built; the backend is demoed via `/docs` and `curl`/HTTP client until `/frontend` lands.
- No deployment/hosting — the prototype runs locally only.

## 14. Final Submission Checklist

Before the freeze:

- [ ] Complete source code pushed
- [ ] README completed
- [ ] Architecture diagram uploaded
- [ ] Setup/run instructions tested
- [ ] AI and external-resource disclosure completed
- [ ] `.env`, passwords, API keys and secrets excluded
- [ ] Demo tested on the team system
- [ ] Final screenshots added
- [ ] `SUBMISSION_CHECKLIST.md` completed

---

## Official Submission Rule

The repository state recorded by the organizers at the official cutoff is the **final submission**.  
The recorded commit SHA is authoritative for judging.

A presentation, Figma prototype, screenshots, or slides **without a demonstrable working implementation** will not be treated as a completed hackathon prototype.
