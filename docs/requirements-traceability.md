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
`docs/architecture.md` for the ER diagram and event-driven design.

## Required Features

| Requirement | Module | Endpoint(s) | UI Element | Status |
|---|---|---|---|---|
| Appointment booking | `models.Visit/Slot`, `services/booking` (M3) | `POST /api/appointments` | Receptionist booking form | Data model: Implemented · Endpoint: Scaffolded |
| Provider / service selection | `models.Provider/Service` | `GET /api/departments/{id}/providers`, `GET /api/services` | Department/provider picker | Data model: Implemented · Endpoint: Scaffolded |
| Slot capacity | `models.Slot`, `engine` (M5, slot limits) | `GET /api/providers/{id}/slots` | Admin slot configuration screen | Data model: Implemented · Endpoint: Scaffolded |
| Walk-in token generation | `models.Visit`, `services/walkin` (M4) | `POST /api/walk-ins` | Walk-in kiosk / receptionist action | Data model: Implemented · Endpoint: Scaffolded |
| Queue status | `engine` (M5) | `GET /api/queue/providers/{id}` | Staff dashboard queue list | Scaffolded |
| Estimated wait time | `engine` (M5, wait estimator) | `GET /api/queue/providers/{id}`, `GET /api/status/{token_no}` | Patient status page, dashboard | Scaffolded |
| Completion / cancellation updates | `services/lifecycle` (M6) | `POST /api/appointments/{id}/cancel`, `POST /api/visits/{id}/complete` | Provider "complete" action, receptionist "cancel" action | Scaffolded |
| Delay/no-show-aware algorithm | `engine.recompute` (M6) | `POST /api/visits/{id}/delay`, `POST /api/visits/{id}/no-show` | Provider "delay" / "no-show" action | Scaffolded |
| Staff dashboard | `api`, `frontend` (M9) | Multiple (see above) | Receptionist/provider/admin dashboard | Planned |
| Patient-facing status view | `api`, `frontend` (M9) | `GET /api/status/{token_no}` | Public no-login status page | Endpoint: Scaffolded · UI: Planned |

## Optional Features (in scope)

| Requirement | Module | Endpoint(s) | UI Element | Status |
|---|---|---|---|---|
| Overbooking limits | `models.Provider.overbook_limit`, `engine` (M5) | `POST /api/admin/providers`, `PUT /api/admin/providers/{id}` | Admin configuration screen | Data model: Implemented · Endpoint: Scaffolded |
| Predicted service duration | `models.Service/ServiceDurationStat`, `engine` (M5) | `PUT /api/admin/services/{id}` | Admin configuration screen | Data model: Implemented · Endpoint: Scaffolded |
| Queue-load balancing across counters | `engine` (M5, load balancer) | Internal to `recompute`; surfaced via `GET /api/queue/providers/{id}` | Dashboard provider-load view | Planned |

## Metrics

| Metric | Module | Endpoint(s) | UI Element | Status |
|---|---|---|---|---|
| Current token | `engine` (M5) | `GET /api/queue/providers/{id}` | Dashboard, patient status page | Scaffolded |
| Estimated wait | `engine` (M5) | `GET /api/queue/providers/{id}` | Dashboard, patient status page | Scaffolded |
| Next appointments | `models.Visit`, `services/booking` (M3) | `GET /api/appointments` | Dashboard | Scaffolded |
| Provider load | `engine` (M5, load balancer) | `GET /api/metrics` | Dashboard | Scaffolded |
| Average waiting time | `models.QueueEvent`, `services` (M7) | `GET /api/metrics` | Dashboard metrics panel | Data model: Implemented · Endpoint: Scaffolded |
| Number of delayed cases | `models.Visit.delay_minutes` | `GET /api/metrics` | Dashboard metrics panel | Data model: Implemented · Endpoint: Scaffolded |

## Non-Functional / Cross-Cutting

| Requirement | Module | Endpoint(s) | UI Element | Status |
|---|---|---|---|---|
| Roles / RBAC | `models.User`, `api/deps.py` (`require_roles`, object-level scope checks) | `POST /api/auth/login`, `GET /api/auth/me` (Implemented); role + ownership enforced on all other endpoints | Login/role-aware navigation (M9) | Implemented (auth + enforcement) · UI: Planned |
| Live updates | `api` (SSE, M7) | `GET /api/stream` | Auto-updating dashboard & status page | Scaffolded (public, ungated) |
| Simulated clock (demo) | `core.clock`, `models.SimClock` | `core.clock.now/advance/freeze/unfreeze/reset` (unit-tested); `GET /api/sim/clock`, `POST /api/sim/{advance,freeze,resume,reset,seed}` (admin-only, dev/demo) | Admin/demo control panel; Console's Simulated Clock panel | Core logic: Implemented · API: Scaffolded · UI: Planned |
| Password hashing + JWT issuing | `core.security` (bcrypt, PyJWT HS256) | Used by `POST /api/auth/login` | N/A | Implemented |
| Consistent error format | `schemas.common.ErrorResponse`, `app.main` exception handlers | All endpoints, including auth (`invalid_credentials`, `missing_token`, `invalid_token`, `token_expired`, `forbidden`) | N/A | Implemented |
| No symptom-based priority inference | `models.Visit` (no symptom fields exist), `schemas.lifecycle.PriorityRequest` | `POST /api/visits/{id}/priority` (receptionist/admin only, enforced) | N/A | Implemented (by omission) · Endpoint: Scaffolded |
| Simulation and Test Console (dev tool) | `app/console/` (static HTML/CSS/JS), mounted via `StaticFiles` | `GET /console`; calls only the documented `/api/*` endpoints above | Developer console — session, sim clock, catalog, live queue board, actions, metrics/events, request inspector, scenario runner | Implemented (console UI) · reflects whatever each `/api/*` endpoint's own status is above |
