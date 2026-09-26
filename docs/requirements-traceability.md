# Requirements Traceability

Maps every requirement in the HT-03 problem statement to its module, endpoint, and
UI element. Status values:

- **Implemented** — real logic, not just a route.
- **Scaffolded** — data model exists and the endpoint is registered (visible in
  `/docs` with its real request/response schema) and enforces its documented role
  and object-level ownership (Module M2), but the business logic itself still
  returns `501 Not Implemented`.
- **Planned** — nothing built yet.

See `docs/api-contract.md` for full request/response examples and
`docs/architecture.md` for the ER diagram, event-driven design, and § 8 for the
queue engine's placement rules and ETA reason codes.

## Required Features

| Requirement | Module | Endpoint(s) | UI Element | Status |
|---|---|---|---|---|
| Appointment booking | `models.Visit/Slot`, `services/booking` (M3) | `POST /api/appointments` | Receptionist booking form | Data model: Implemented · Endpoint: Scaffolded |
| Provider / service selection | `models.Provider/Service` | `GET /api/departments/{id}/providers`, `GET /api/services` | Department/provider picker | Data model: Implemented · Endpoint: Scaffolded |
| Slot capacity | `models.Slot`, `engine` | `GET /api/providers/{id}/slots` | Admin slot configuration screen | Data model: Implemented · Read endpoint: Scaffolded (M3) · Release-on-cancel: Implemented |
| Walk-in token generation | `models.Visit`, `services/walkin` (M4) | `POST /api/walk-ins` | Walk-in kiosk / receptionist action | Data model: Implemented · Endpoint: Scaffolded |
| Queue status | `app.engine`, `services/queue_service.py` | `GET /api/queue/providers/{id}` | Staff dashboard queue list | **Implemented** |
| Estimated wait time | `app.engine` (placement + EWMA duration learning) | `GET /api/queue/providers/{id}`, `GET /api/status/{token_no}` | Patient status page, dashboard | **Implemented** |
| Completion / cancellation updates | `services/lifecycle_service.py` | `POST /api/appointments/{id}/cancel`, `POST /api/visits/{id}/complete` | Provider "complete" action, receptionist "cancel" action | **Implemented**, incl. `409` on illegal transitions |
| Delay/no-show-aware algorithm | `app.engine`, `services/lifecycle_service.py` | `POST /api/visits/{id}/delay`, `POST /api/visits/{id}/no-show`, auto-no-show via `POST /api/sim/advance` | Provider "delay" / "no-show" action | **Implemented** |
| Staff dashboard | `api`, `frontend` (M9) | Multiple (see above) | Receptionist/provider/admin dashboard | Backend: Implemented · Frontend: Planned |
| Patient-facing status view | `api`, `frontend` (M9) | `GET /api/status/{token_no}` | Public no-login status page | Endpoint: **Implemented** · UI: Planned |

## Optional Features (in scope)

| Requirement | Module | Endpoint(s) | UI Element | Status |
|---|---|---|---|---|
| Overbooking limits | `models.Provider.overbook_limit`, `app.engine` (anchored appointments queue sequentially) | `POST /api/admin/providers`, `PUT /api/admin/providers/{id}` | Admin configuration screen | Data model + engine handling: Implemented · Admin endpoint: Scaffolded (M9) |
| Predicted service duration | `models.Service/ServiceDurationStat`, `app.engine.durations` | `PUT /api/admin/services/{id}` | Admin configuration screen | EWMA learning: **Implemented** · Admin endpoint: Scaffolded (M9) |
| Queue-load balancing across counters | Not built | Would need multi-provider routing in `queue_service`/walk-in auto-routing | Dashboard provider-load view | Planned |

## Metrics

| Metric | Module | Endpoint(s) | UI Element | Status |
|---|---|---|---|---|
| Current token | `services/queue_service.py` | `GET /api/queue/providers/{id}` | Dashboard, patient status page | **Implemented** |
| Estimated wait | `app.engine` | `GET /api/queue/providers/{id}` | Dashboard, patient status page | **Implemented** |
| Next appointments | `models.Visit`, `services/booking` (M3) | `GET /api/appointments` | Dashboard | Scaffolded |
| Provider load | `services/queue_service.load()` | `GET /api/metrics` | Dashboard | **Implemented** |
| Average waiting time | `GET /api/metrics` (averaged across every active provider's waiting visits) | `GET /api/metrics` | Dashboard metrics panel | **Implemented** |
| Number of delayed cases | `services/queue_service.delayed_count()` (`delay_minutes > 0` or `expected_delay_min > 10`) | `GET /api/metrics` | Dashboard metrics panel | **Implemented** |

## Non-Functional / Cross-Cutting

| Requirement | Module | Endpoint(s) | UI Element | Status |
|---|---|---|---|---|
| Roles / RBAC | `models.User`, `api/deps.py` (`require_roles`, object-level scope checks) | `POST /api/auth/login`, `GET /api/auth/me`; role + ownership enforced on all other endpoints | Login/role-aware navigation (M9) | **Implemented** · UI: Planned |
| Live updates | `services/events_bus.py` (in-process pub/sub, no subscribers yet); SSE itself (M7) | `GET /api/stream` | Auto-updating dashboard & status page | Publisher: Implemented · SSE transport: Scaffolded (public, ungated) |
| Simulated clock (demo) | `core.clock`, `models.SimClock` | `core.clock.now/advance/freeze/unfreeze/reset`; `GET /api/sim/clock`, `POST /api/sim/{advance,freeze,resume,reset,seed}` (admin-only, dev/demo) | Admin/demo control panel; Console's Simulated Clock panel | **Implemented**, incl. auto-no-show + recompute-all on advance/reset · UI: Planned |
| Password hashing + JWT issuing | `core.security` (bcrypt, PyJWT HS256) | Used by `POST /api/auth/login` | N/A | Implemented |
| Consistent error format | `schemas.common.ErrorResponse`, `app.main` exception handlers | All endpoints, including `conflict` (409) for illegal lifecycle transitions | N/A | Implemented |
| No symptom-based priority inference | `models.Visit` (no symptom fields exist), `schemas.lifecycle.PriorityRequest` (reason required) | `POST /api/visits/{id}/priority` (receptionist/admin only, enforced) | N/A | **Implemented** |
| Audit log / event history | `models.QueueEvent`, `services/lifecycle_service.py` + `queue_service.py` (`ETA_CHANGED` only logged when an estimate actually moves) | `GET /api/events` (newest first; filters `provider_id`, `visit_id`) | Dashboard / console event log | **Implemented** |
| Simulation and Test Console (dev tool) | `app/console/` (static HTML/CSS/JS), mounted via `StaticFiles` | `GET /console`; calls only the documented `/api/*` endpoints above | Developer console — session, sim clock, catalog, live queue board, actions, metrics/events, request inspector, scenario runner | Implemented (console UI) · now backed by real data for lifecycle/queue/metrics/events/sim |
