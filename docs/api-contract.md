# API Contract

This is the contract to build the frontend against. Every endpoint below exists and
appears in `/docs` (Swagger UI) with its real request/response schemas. As of
Module M2, `POST /api/auth/login` and `GET /api/auth/me` are fully implemented and
every other endpoint enforces its documented role (and, where noted, object-level
ownership) — but the underlying business logic is still a `501 Not Implemented`
placeholder, so a request that clears the auth/role check will still get a 501, not
real data. Implementation lands module by module (see
`docs/requirements-traceability.md` for current status). The machine-readable
version is `docs/openapi.json`, exported from the running app.

Base URL: `http://localhost:8000/api` (local dev). All request/response bodies are
JSON. All timestamps are ISO 8601, UTC (`...Z`); the frontend converts to
Asia/Kolkata for display.

## Conventions

### Authentication

`POST /api/auth/login` takes `{"username", "password"}` and returns:

```json
{
  "access_token": "<jwt>",
  "token_type": "bearer",
  "role": "receptionist",
  "user_id": 2,
  "provider_id": null,
  "patient_id": null
}
```

Send the token on every subsequent request as `Authorization: Bearer <access_token>`.
The token is a signed JWT (HS256) containing only `sub` (user id), `iat`, and `exp` —
role/provider_id/patient_id are looked up fresh from the database on every request
(via `GET /api/auth/me` or implicitly by protected endpoints), not trusted from the
token, so deactivating a user takes effect immediately rather than only after their
token expires. Tokens expire after `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` (default 60);
there is no refresh endpoint yet — the frontend should re-login on a `token_expired`
response.

The "Role" column in every table below is enforced now, not just documented intent.
Where a row says "(own)" (e.g. "Provider (own)"), that role is further restricted to
resources it owns (its own `provider_id`'s queue/visits, or a patient's own visits) —
anyone else in that role gets `403 forbidden`, not just anyone in a different role.

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

`message` is human-readable; `details` is endpoint-specific and may be `null`.
Stable machine-readable `code` values in use:

| Code | HTTP status | Meaning |
|---|---|---|
| `invalid_credentials` | 401 | Login failed — wrong password, unknown username, or a deactivated account. Deliberately identical for all three so the response can't be used to enumerate valid usernames or account state. |
| `missing_token` | 401 | No `Authorization: Bearer <token>` header on an endpoint that requires one. |
| `invalid_token` | 401 | Token is malformed, has a bad signature, or its user no longer exists/is inactive. |
| `token_expired` | 401 | Token's `exp` has passed — re-login. |
| `forbidden` | 403 | Authenticated, but the role (or object ownership) doesn't permit this action. |
| `not_found` | 404 | Path references a resource that doesn't exist (e.g. an unknown `visit_id`). |
| `validation_error` | 422 | Request body/query failed schema validation; `details.errors` has the field-level breakdown. |
| `not_implemented` | 501 | Passed every auth/role/ownership check; the business logic itself isn't built yet. |
| `http_error` | varies | Fallback for any other `HTTPException` not using a specific code above. |

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
      "source": "appointment",
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
| POST | `/api/appointments` | Patient, Receptionist | Body: `AppointmentCreate` → `VisitOut` (201). Admin is deliberately excluded — booking is a patient/front-desk action. |
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
| GET | `/api/stream` | Public, no login (same as `/api/status/{token_no}`) | Server-Sent Events. Each event's `data` is a JSON `QueueSnapshotOut`; `event:` field is the provider id the snapshot belongs to, so a client can subscribe to one provider or all of them. Ungated so the public status page can receive live updates without a login; staff dashboards also use it while authenticated for their own reasons (role-scoped filtering, if any, is a Module M7 concern once the stream has real content to filter). |

## Simulation (dev/demo only)

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/api/sim/clock` | Admin | → `SimClockOut`: `{"effective_time", "offset_minutes", "is_frozen"}` |
| POST | `/api/sim/advance` | Admin | Body: `{"minutes": 20}` → `SimClockOut` |
| POST | `/api/sim/freeze` | Admin | Stops wall time from advancing the clock further (wraps `core.clock.freeze`) → `SimClockOut` |
| POST | `/api/sim/resume` | Admin | Resumes wall time (wraps `core.clock.unfreeze`) → `SimClockOut` |
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
