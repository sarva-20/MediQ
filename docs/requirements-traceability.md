# Requirements Traceability

Maps every requirement in the HT-03 problem statement to its planned module, endpoint, and UI element. Updated as implementation progresses; all items start as `Planned`.

## Required Features

| Requirement | Planned Module | Planned Endpoint(s) | Planned UI Element | Status |
|---|---|---|---|---|
| Appointment booking | `services/booking`, `models` | `POST /api/appointments` | Receptionist booking form | Planned |
| Provider / service selection | `models`, `schemas` | `GET /api/departments`, `GET /api/providers` | Department/provider picker | Planned |
| Slot capacity | `models`, `engine` (slot limits) | `GET /api/providers/{id}/slots` | Admin slot configuration screen | Planned |
| Walk-in token generation | `services/walkin` | `POST /api/walkins` | Walk-in kiosk / receptionist action | Planned |
| Queue status | `services`, `engine` | `GET /api/queue/{provider_id}` | Staff dashboard queue list | Planned |
| Estimated wait time | `engine` (wait estimator) | `GET /api/queue/{provider_id}`, `GET /api/tokens/{token}/status` | Patient status page, dashboard | Planned |
| Completion / cancellation updates | `services/lifecycle` | `POST /api/queue/{entry_id}/complete`, `POST /api/queue/{entry_id}/cancel` | Provider "complete" action, receptionist "cancel" action | Planned |
| Delay/no-show-aware algorithm | `engine` (`recompute`) | `POST /api/queue/{entry_id}/delay`, `POST /api/queue/{entry_id}/no-show` | Provider "delay" / "no-show" action | Planned |
| Staff dashboard | `api`, frontend | Multiple (see above) | Receptionist/provider/admin dashboard | Planned |
| Patient-facing status view | `api`, frontend | `GET /api/tokens/{token}/status` | Public no-login status page | Planned |

## Optional Features (in scope)

| Requirement | Planned Module | Planned Endpoint(s) | Planned UI Element | Status |
|---|---|---|---|---|
| Overbooking limits | `models` (slot config), `engine` | `PUT /api/providers/{id}/config` | Admin configuration screen | Planned |
| Predicted service duration | `models` (service config), `engine` | `PUT /api/services/{id}/duration` | Admin configuration screen | Planned |
| Queue-load balancing across counters | `engine` (load balancer) | Internal to `recompute`; surfaced via `GET /api/queue/{provider_id}` | Dashboard provider-load view | Planned |

## Metrics

| Metric | Planned Module | Planned Endpoint(s) | Planned UI Element | Status |
|---|---|---|---|---|
| Current token | `engine` | `GET /api/queue/{provider_id}` | Dashboard, patient status page | Planned |
| Estimated wait | `engine` | `GET /api/queue/{provider_id}` | Dashboard, patient status page | Planned |
| Next appointments | `services/booking` | `GET /api/providers/{id}/upcoming` | Dashboard | Planned |
| Provider load | `engine` (load balancer) | `GET /api/providers/{id}/load` | Dashboard | Planned |
| Average waiting time | `services`, `models` (lifecycle events) | `GET /api/metrics/avg-wait` | Dashboard metrics panel | Planned |
| Number of delayed cases | `models` (lifecycle events) | `GET /api/metrics/delays` | Dashboard metrics panel | Planned |

## Non-Functional / Cross-Cutting

| Requirement | Planned Module | Planned Endpoint(s) | Planned UI Element | Status |
|---|---|---|---|---|
| Roles / RBAC | `core` (auth dependency) | All write endpoints | Login/role-aware navigation | Planned |
| Live updates | `api` (SSE) | `GET /api/stream/{provider_id}` | Auto-updating dashboard & status page | Planned |
| Simulated clock (demo) | `core` (clock) | `POST /api/sim/advance` (dev-only) | Admin/demo control panel | Planned |
| No symptom-based priority inference | `engine`, `schemas` (validation) | N/A — enforced by omission from all schemas | N/A | Planned |
