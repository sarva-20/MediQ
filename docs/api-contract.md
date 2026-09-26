# API Contract

This is the contract to build the frontend against. As of Module M1, every endpoint
below exists and appears in `/docs` (Swagger UI) with its real request/response
schemas, but every business endpoint (everything except `GET /api/health`) responds
`501 Not Implemented` with the error envelope described below — implementation
lands module by module (see `docs/requirements-traceability.md` for current status).
The machine-readable version is `docs/openapi.json`, exported from the running app.

Base URL: `http://localhost:8000/api` (local dev). All request/response bodies are
JSON. All timestamps are ISO 8601, UTC (`...Z`); the frontend converts to
Asia/Kolkata for display.

## Conventions

### Authentication (from Module M2)

`POST /api/auth/login` returns a bearer token; send it as `Authorization: Bearer <token>`
on subsequent requests. Until M2 lands, no endpoint enforces this — the "Role"
column below documents the *intended* permission, not current behavior.

### Error format

Every non-2xx response uses this envelope:

```json
{
  "error": {
    "code": "not_implemented",
    "message": "Not implemented yet — planned for Module M3 - Slots and booking.",
    "details": null
  }
}
```

`code` is a stable machine-readable string (`not_implemented`, `validation_error`,
`not_found`, `forbidden`, ...); `message` is human-readable; `details` is
endpoint-specific and may be `null`.

### Pagination

List endpoints that can grow large accept `page` (default `1`) and `page_size`
(default `20`, max `100`) query params and return:

```json
{
  "items": [ /* ... */ ],
  "total": 137,
  "page": 1,
  "page_size": 20
}
```

### Queue snapshot shape

The shape returned by the per-provider queue endpoint and pushed over SSE:

```json
{
  "provider_id": 5,
  "provider_name": "Dr. Ananya Iyer",
  "department_code": "GM",
  "current_token": "GM-A012",
  "next_tokens": ["GM-A013", "GM-W004", "GM-A014"],
  "load": 6,
  "delayed_count": 1,
  "queue": [
    {
      "visit_id": 42,
      "token_no": "GM-A013",
      "patient_name": "Ravi Kumar",
      "status": "checked_in",
      "position": 1,
      "estimated_start": "2026-09-26T05:10:00Z",
      "estimated_wait_min": 12,
      "eta_reason": "2 ahead in queue (24 min) + provider running 5 min behind",
      "priority_flag": false
    }
  ]
}
```

`current_token` is the token currently in service (or being called), `next_tokens`
are the next few up (small, fixed-size preview — the full order is `queue`).

---

## Auth

| Method | Path | Role | Notes |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Body: `{"username", "password"}` → `{"access_token", "token_type", "role", "user_id"}` |
| GET | `/api/auth/me` | Any authenticated | → `UserOut` |

## Catalog

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/api/departments` | Public | → `DepartmentOut[]` |
| GET | `/api/departments/{department_id}/providers` | Public | → `ProviderOut[]` |
| GET | `/api/providers/{provider_id}` | Public | → `ProviderOut` |
| GET | `/api/services` | Public | → `ServiceOut[]` |
| GET | `/api/providers/{provider_id}/slots?date=2026-09-26` | Public | → `SlotOut[]` (only future, non-full slots for booking UIs; admin views of all slots are out of scope here) |

Example `SlotOut`:

```json
{ "id": 101, "provider_id": 5, "start_at": "2026-09-26T09:00:00Z", "end_at": "2026-09-26T09:15:00Z", "capacity": 2, "booked_count": 1, "remaining": 1 }
```

## Booking

| Method | Path | Role | Notes |
|---|---|---|---|
| POST | `/api/appointments` | Patient, Receptionist | Body: `AppointmentCreate` → `VisitOut` (201) |
| GET | `/api/appointments` | Patient (own), Receptionist, Admin | Paginated `VisitOut` |
| POST | `/api/appointments/{visit_id}/cancel` | Patient (own), Receptionist | → `VisitOut` |
| POST | `/api/visits/{visit_id}/check-in` | Receptionist | → `VisitOut` |

Example `AppointmentCreate`:

```json
{ "patient_id": 12, "provider_id": 5, "service_id": 1, "slot_id": 101 }
```

Example `VisitOut`:

```json
{
  "id": 42, "patient_id": 12, "provider_id": 5, "service_id": 1, "slot_id": 101,
  "source": "appointment", "token_no": "GM-A013", "status": "booked",
  "scheduled_start": "2026-09-26T09:00:00Z", "checked_in_at": null,
  "started_at": null, "completed_at": null, "delay_minutes": 0, "delay_reason": null,
  "priority_flag": false, "priority_reason": null,
  "estimated_start": "2026-09-26T09:12:00Z", "estimated_wait_min": 12, "eta_reason": null,
  "created_at": "2026-09-26T05:00:00Z"
}
```

## Walk-ins

| Method | Path | Role | Notes |
|---|---|---|---|
| POST | `/api/walk-ins` | Receptionist | Body: `WalkInCreate` → `VisitOut` (201) |

Example `WalkInCreate` (auto-routed — no `provider_id`):

```json
{ "patient_id": 12, "department_code": "RAD", "service_id": 7 }
```

## Queue and status

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/api/queue/providers/{provider_id}` | Receptionist, Provider (own), Admin | → `QueueSnapshotOut` (see above) |
| GET | `/api/queue/overview` | Receptionist, Admin | → `{"providers": ProviderQueueSummaryOut[]}` — one summary row per active provider |
| GET | `/api/status/{token_no}` | Public, no login | → `PublicStatusOut` — never includes patient name/phone |

Example `PublicStatusOut`:

```json
{
  "token_no": "GM-A013", "department_code": "GM", "provider_name": "Dr. Ananya Iyer",
  "status": "checked_in", "position": 1,
  "estimated_start": "2026-09-26T09:10:00Z", "estimated_wait_min": 12,
  "eta_reason": "2 ahead in queue (24 min)"
}
```

## Lifecycle (staff / provider)

| Method | Path | Role | Notes |
|---|---|---|---|
| POST | `/api/visits/{visit_id}/start` | Provider (own) | → `VisitOut` |
| POST | `/api/visits/{visit_id}/delay` | Provider (own), Receptionist | Body: `{"minutes": 15, "reason": "..."}` → `VisitOut` |
| POST | `/api/visits/{visit_id}/complete` | Provider (own) | → `VisitOut` |
| POST | `/api/visits/{visit_id}/no-show` | Receptionist, Provider (own) | → `VisitOut` |
| POST | `/api/visits/{visit_id}/priority` | Receptionist, Admin only | Body: `{"flag": true, "reason": "..."}` → `VisitOut`. No symptom/clinical field exists in this body or anywhere in the API — priority is an explicit operational decision. |

## Metrics and audit

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/api/metrics` | Receptionist, Provider, Admin | → `MetricsOut` |
| GET | `/api/events` | Admin | Paginated `QueueEventOut` — append-only audit log |

Example `MetricsOut`:

```json
{
  "generated_at": "2026-09-26T09:30:00Z", "average_waiting_minutes": 14.5,
  "total_delayed_cases": 3, "total_active_visits": 11,
  "provider_load": [
    { "provider_id": 5, "provider_name": "Dr. Ananya Iyer", "department_code": "GM", "load": 4, "delayed_count": 1 }
  ]
}
```

## Live

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/api/stream` | Receptionist, Provider, Admin, Patient (status page) | Server-Sent Events. Each event's `data` is a JSON `QueueSnapshotOut`; `event:` field is the provider id the snapshot belongs to, so a client can subscribe to one provider or all of them. |

## Simulation (dev/demo only)

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/api/sim/clock` | Admin | → `SimClockOut`: `{"effective_time", "offset_minutes", "is_frozen"}` |
| POST | `/api/sim/advance` | Admin | Body: `{"minutes": 20}` → `SimClockOut` |
| POST | `/api/sim/reset` | Admin | → `SimClockOut` |
| POST | `/api/sim/seed` | Admin | Re-runs the seed script (202 Accepted, async) |

## Admin

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/api/admin/settings` | Admin | → `ClinicSettingsOut` |
| PUT | `/api/admin/settings` | Admin | Body: `ClinicSettingsUpdate` (partial) → `ClinicSettingsOut` |
| PUT | `/api/admin/services/{service_id}` | Admin | Body: `ServiceUpdate` (partial) → `ServiceOut` |
| GET | `/api/admin/providers` | Admin | → `ProviderOut[]` (includes inactive) |
| POST | `/api/admin/providers` | Admin | Body: `ProviderCreate` → `ProviderOut` (201) |
| PUT | `/api/admin/providers/{provider_id}` | Admin | Body: `ProviderUpdate` (partial) → `ProviderOut` |
