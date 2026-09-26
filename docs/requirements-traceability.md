# Requirements Traceability

Maps every requirement in the HT-03 problem statement to its module, endpoint, and
UI element. Status values:

- **Implemented** — real logic, not just a route.
- **Scaffolded** — data model exists and/or the endpoint is registered (visible in
  `/docs` with its real request/response schema) but returns `501 Not Implemented`.
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
| Roles / RBAC | `models.User`, `core` (auth dependency, M2) | `POST /api/auth/login`, `GET /api/auth/me`; all write endpoints | Login/role-aware navigation | Data model: Implemented · Enforcement: Planned |
| Live updates | `api` (SSE, M7) | `GET /api/stream` | Auto-updating dashboard & status page | Scaffolded |
| Simulated clock (demo) | `core.clock`, `models.SimClock` | `core.clock.now/advance/freeze/reset` (unit-tested); `GET/POST /api/sim/*` (dev-only) | Admin/demo control panel | Core logic: Implemented · API: Scaffolded · UI: Planned |
| Password hashing | `core.security` | N/A (used by future `POST /api/auth/login`) | N/A | Implemented |
| Consistent error format | `schemas.common.ErrorResponse`, `app.main` exception handlers | All endpoints | N/A | Implemented |
| No symptom-based priority inference | `models.Visit` (no symptom fields exist), `schemas.lifecycle.PriorityRequest` | `POST /api/visits/{id}/priority` (staff only) | N/A | Implemented (by omission) · Endpoint: Scaffolded |
