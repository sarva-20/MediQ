# MediQ — Frontend Route Map & API Integration Skeleton

> **Scope:** Structure and data flow only. No styling, colors, or layout descriptions.
> **Generated from:** Full static scan of `src/pages/`, `src/components/`, `src/mocks/`, and `src/App.jsx` on 2026-09-26.

---

## Table of Contents

1. [/ — Landing Page](#-landing-page)
2. [/signup — Create Account](#signup--create-account)
3. [/login — Sign In](#login--sign-in)
4. [/patient/dashboard — Patient Dashboard](#patientdashboard--patient-dashboard)
5. [/patient/book — Book Appointment (3-step)](#patientbook--book-appointment)
6. [/patient/visits — My Visits](#patientvisits--my-visits)
7. [/status/:tokenNo — Public Token Status](#statustokenno--public-token-status)
8. [/reception/queue — Reception Queue Board](#receptionqueue--reception-queue-board)
9. [/reception/walkin — Walk-In Registration](#receptionwalkin--walk-in-registration)
10. [/reception/appointments — Appointments Roster](#receptionappointments--appointments-roster)
11. [/provider/queue — Provider Operations Console](#providerqueue--provider-operations-console)
12. [/admin/overview — Admin Overview](#adminoverview--admin-overview)
13. [/admin/queue — Admin Queue Board](#adminqueue--admin-queue-board)
14. [/admin/settings — Settings & Services](#adminsettings--settings--services)
15. [/admin/providers — Provider Management](#adminproviders--provider-management)
16. [/admin/simulator — Simulation Console](#adminsimulator--simulation-console)
17. [ChatAssistant — Floating Patient Bot](#chatassistant--floating-patient-bot-not-a-route)
18. [Complete Backend Surface Area](#complete-backend-endpoint-surface-area)
19. [Mock → Real Migration Note](#mock--real-migration-note)

---

## / — Landing Page

**Role access:** Public (unauthenticated)
**Purpose:** Marketing homepage that communicates the product value proposition and directs visitors to sign up or log in.

### On load

- Mock function called: **none** — this page makes no data calls.
- Intended backend endpoint: **none required** (fully static marketing content).
- Data shape needed: none (all content is hardcoded copy and static stats).

### Buttons / actions

| Button label | Mock function called | Intended backend endpoint | Role allowed | Notes |
|---|---|---|---|---|
| Book an appointment | none | none | Public | Client-side navigation to `/signup` |
| Get Started | none | none | Public | Client-side navigation to `/signup` |
| Sign In | none | none | Public | Client-side navigation to `/login` |
| Explore live departure board | none | none | Public | Client-side navigation to `/status/GM-A002` (opens in new tab) |
| Get started free | none | none | Public | Client-side navigation to `/signup` |
| Sign In to Demo | none | none | Public | Client-side navigation to `/login` |

---

## /signup — Create Account

**Role access:** Public (unauthenticated)
**Purpose:** Patient self-registration form that creates a new account, auto-logs the user in, and redirects to the Patient Dashboard.

### On load

- Mock function called: none (form renders with empty state).
- Intended backend endpoint: none on load.
- Data shape needed: none.

### Buttons / actions

| Button label | Mock function called | Intended backend endpoint | Role allowed | Notes |
|---|---|---|---|---|
| Create Account (form submit) | `createAccount({ name, phone, email, password })` in `src/mocks/store.js` | `POST /api/auth/register` | Public | On success: calls `login()` with `{ name, role: 'patient', email, phone }`, navigates to `/patient/dashboard`. Client-side validation runs before mock call (name required, phone with country code, valid email, password ≥ 6 chars, confirm match). |

**Request body shape for `POST /api/auth/register`:**
- `name` — string, trimmed
- `phone` — string, international format (e.g. `+919876543210`)
- `email` — string, lowercased
- `password` — string (plain text in mock; must be hashed server-side)

**Response shape needed:**
- `id` — string
- `name` — string
- `phone` — string
- `email` — string
- `role` — `"patient"`
- `createdAt` — timestamp

---

## /login — Sign In

**Role access:** Public (unauthenticated)
**Purpose:** Authentication screen with one-click demo role switching and a manual username/password form; redirects to the role-appropriate home screen after login.

### On load

- Mock function called: none (form is empty on load; `DEMO_ACCOUNTS` is a static constant from `src/lib/utils.js`).
- Intended backend endpoint: none on load.
- Data shape needed: none.

### Buttons / actions

| Button label | Mock function called | Intended backend endpoint | Role allowed | Notes |
|---|---|---|---|---|
| Sign In (form submit) | none (mock: calls `login({ name, role: 'patient' })` from `AuthContext`) | `POST /api/auth/login` | Public | Defaults any manual login to `patient` role. Navigates to `ROLES[role].home`. |
| Demo: Patient (Arjun Mehta) | none (calls `login({ name, role: 'patient' })`) | `POST /api/auth/demo-login` | Public | One-click; navigates to `/patient/dashboard` |
| Demo: Receptionist (Priya) | none (calls `login({ name, role: 'receptionist' })`) | `POST /api/auth/demo-login` | Public | Navigates to `/reception/queue` |
| Demo: Provider (Dr. Priya Sharma) | none (calls `login({ name, role: 'provider', providerId: 'p1' })`) | `POST /api/auth/demo-login` | Public | Navigates to `/provider/queue` |
| Demo: Admin | none (calls `login({ name, role: 'admin' })`) | `POST /api/auth/demo-login` | Public | Navigates to `/admin/overview` |

**Session storage:** On login, `{ name, role, providerId? }` is written to `localStorage["mediq_user"]`. On logout, the key is removed.

---

## /patient/dashboard — Patient Dashboard

**Role access:** Patient
**Purpose:** Personalized landing screen for the logged-in patient showing upcoming visit, live active token (if any), visit history summary, and a CTA to book.

### On load

- Mock function called: `getPatientVisits(patientName)` in `src/mocks/store.js`
- Intended backend endpoint: `GET /api/patients/:patientId/visits`
- Data shape needed (per visit record):
  - `id`
  - `token`
  - `patient` (patient name string)
  - `status` — `booked | checked-in | in-service | completed | cancelled | no-show`
  - `scheduledTime` — Unix timestamp (ms)
  - `estimatedWait` — integer (minutes)
  - `waitReason` — string (human-readable explainability)
  - `position` — integer (queue position)
  - `priority` — boolean
  - `priorityReason` — string or null
  - `serviceName` — string
  - `providerId` — string (used to look up `store.providers`)
  - `delay` — `{ minutes, reason }` or null

- Also reads `store.providers` (array) to resolve `providerId → { name, room, department }`.
- Subscribes to store pub/sub via `useStoreRefresh()` for live re-renders.
- Uses `useSimClock()` for current simulated time display.

### Buttons / actions

| Button label | Mock function called | Intended backend endpoint | Role allowed | Notes |
|---|---|---|---|---|
| Book New Visit | none | none | patient | Client-side navigation to `/patient/book` |
| Book an appointment (CTA banner) | none | none | patient | Client-side navigation to `/patient/book` |
| Status (per visit) / Departure Board | none | none | patient | Client-side navigation to `/status/{token}`, opens in new tab |
| View full visit history | none | none | patient | Client-side navigation to `/patient/visits` |

---

## /patient/book — Book Appointment

**Role access:** Patient
**Purpose:** Three-step guided flow (Department → Service + Provider → Date + Slot) that creates a booked appointment visit and issues a queue token.

### Step 1 — Department Selection

#### On load

- Mock function called: `departments` (static array exported from `src/mocks/store.js`)
- Intended backend endpoint: `GET /api/departments`
- Data shape needed (per department):
  - `id` — string
  - `name` — string
  - `code` — string (e.g. `"GM"`)
  - `icon` — string icon name
  - `services` — array (used in step 2)

- Also calls `getDepartmentProviders(deptId)` to show provider count per card.
- Intended backend endpoint for provider count: `GET /api/departments/:deptId/providers?active=true`

#### Buttons / actions

| Button label | Mock function called | Intended backend endpoint | Role allowed | Notes |
|---|---|---|---|---|
| Department card (click) | `getDepartmentProviders(deptId)` | `GET /api/departments/:deptId/providers` | patient | Advances to step 2 |

---

### Step 2 — Service & Provider Selection

#### On load

- Mock function called: `getDepartmentProviders(departmentId)` in `src/mocks/store.js`
- Intended backend endpoint: `GET /api/departments/:deptId/providers?active=true`
- Data shape needed (per provider):
  - `id`
  - `name`
  - `kind` (e.g. `"Senior Consultant"`)
  - `room`
  - `department`
  - `active` — boolean
  - `slotLength` — integer (minutes)
  - `slotCapacity` — integer
  - `overbookLimit` — integer
  - `shift` — string (e.g. `"09:00–17:00"`)

- Data shape needed (per service, from department object):
  - `id`
  - `name`
  - `duration` — integer (minutes)
  - `prepTime` — integer (minutes)
  - `active` — boolean

#### Buttons / actions

| Button label | Mock function called | Intended backend endpoint | Role allowed | Notes |
|---|---|---|---|---|
| Service card (select) | none (local state) | none | patient | Updates local selection |
| Provider card (select) | none (local state) | none | patient | Updates local selection; `"any"` option triggers shortest-wait routing on submit |
| Continue to Slot Selection | none | none | patient | Advances to step 3 (disabled until service + provider selected) |
| Back | none | none | patient | Returns to step 1 |

---

### Step 3 — Date & Slot Grid

#### On load

- Mock function called: `getSlotAvailability(providerId, dateTimestamp)` in `src/mocks/store.js`
- Intended backend endpoint: `GET /api/providers/:providerId/slots?date=YYYY-MM-DD`
- Data shape needed (per slot):
  - `time` — Unix timestamp (ms) for slot start
  - `booked` — integer (bookings already in this slot)
  - `capacity` — integer (slotCapacity + overbookLimit)
  - `available` — integer (remaining capacity)
  - `full` — boolean

#### Buttons / actions

| Button label | Mock function called | Intended backend endpoint | Role allowed | Notes |
|---|---|---|---|---|
| Day pill (select date) | `getSlotAvailability(providerId, dateTimestamp)` | `GET /api/providers/:providerId/slots?date=YYYY-MM-DD` | patient | Refreshes slot grid |
| Slot button (select time) | none (local state) | none | patient | Updates local slot selection; disabled when `slot.full` |
| Confirm & Book Appointment | `bookAppointment({ patient, phone, departmentId, serviceId, providerId, scheduledTime })` | `POST /api/appointments` | patient | On success: transitions to confirmation screen; calls `addToast()`. If `providerId === 'any'`, server must pick the shortest-queue provider for the department. |
| Back | none | none | patient | Returns to step 2 |

**Request body shape for `POST /api/appointments`:**
- `patientId` — string (from auth session)
- `phone` — string
- `departmentId` — string
- `serviceId` — string
- `providerId` — string or `"any"`
- `scheduledTime` — Unix timestamp (ms)

**Response shape needed:**
- `id` — visit ID
- `token` — string (e.g. `"GM-A004"`)
- `patient` — string
- `providerId` — string (resolved, even if `"any"` was requested)
- `scheduledTime` — timestamp
- `serviceName` — string
- `status` — `"booked"`

---

### Step Done — Booking Confirmation

- Reads fields from the returned visit object: `token`, `scheduledTime`, `providerId`, `patient`, `serviceName`.
- Looks up `store.providers` by `providerId` for `name` and `room`.
- No additional API call needed.

---

## /patient/visits — My Visits

**Role access:** Patient
**Purpose:** Full visit history for the logged-in patient with live status, estimated wait, and per-visit cancel action.

### On load

- Mock function called: `getPatientVisits(DEMO_PATIENT)` in `src/mocks/store.js`
- Intended backend endpoint: `GET /api/patients/:patientId/visits`
- Data shape needed (same schema as Patient Dashboard visit records, see above).
- Subscribes to `useStoreRefresh()` for live updates.

### Buttons / actions

| Button label | Mock function called | Intended backend endpoint | Role allowed | Notes |
|---|---|---|---|---|
| Cancel (per visit) | `cancelVisit(visitId)` | `POST /api/visits/:visitId/cancel` | patient | Only shown when `status === 'booked' || 'checked-in'`. Calls `addToast()` on success. |
| Departure Board (per visit) | none | none | patient | Client-side navigation to `/status/{token}`, opens in new tab |
| Book New Visit | none | none | patient | Client-side navigation to `/patient/book` |

---

## /status/:tokenNo — Public Token Status

**Role access:** Public (no authentication required)
**Purpose:** Shareable, airport-departure-board-style page showing a single visit's live queue position, estimated wait, explainability reason, and now-serving token for that provider.

### On load

- Mock functions called:
  - `getVisitByToken(tokenNo)` in `src/mocks/store.js`
  - `getProviderNowServing(providerId)` in `src/mocks/store.js`
  - `store.providers` (direct read for provider details)
- Intended backend endpoints:
  - `GET /api/visits/token/:tokenNo`
  - `GET /api/providers/:providerId/now-serving`
- Data shape needed (visit):
  - `id`, `token`, `patient`, `status`
  - `providerId`
  - `estimatedWait` — integer (minutes)
  - `waitReason` — string
  - `position` — integer (queue position number)
  - `serviceName`, `serviceDuration`
  - `delay` — `{ minutes, reason }` or null
  - `startedTime` — timestamp or null
  - `completedTime` — timestamp or null
- Data shape needed (nowServing visit):
  - `token`, `patient`, `status`
- Data shape needed (provider):
  - `name`, `room`
- Subscribes to `useStoreRefresh()` and `useSimClock()` for live auto-updating.
- If `getVisitByToken()` returns null, renders a "Token Not Found" error state.

### Buttons / actions

| Button label | Mock function called | Intended backend endpoint | Role allowed | Notes |
|---|---|---|---|---|
| Back to Sign In (error state only) | none | none | Public | Navigation to `/login` |

---

## /reception/queue — Reception Queue Board

**Role access:** Receptionist
**Purpose:** Live multi-provider queue ops console for reception staff — shows Now Serving hero card, waiting list table with triage actions, and an All Providers overview grid.

### On load

- Mock functions called:
  - `store.providers` (direct read, filtered `active === true`)
  - `getProviderNowServing(providerId)` per provider tab
  - `getProviderWaiting(providerId)` per provider tab
- Intended backend endpoints:
  - `GET /api/providers?active=true`
  - `GET /api/providers/:providerId/now-serving`
  - `GET /api/providers/:providerId/queue`
- Data shape needed (waiting visit per row):
  - `id`, `token`, `patient`, `phone`
  - `status` — `booked | checked-in`
  - `isWalkIn` — boolean
  - `priority` — boolean
  - `priorityReason` — string or null
  - `serviceName`
  - `scheduledTime`
  - `estimatedWait`, `waitReason`, `position`
  - `delay` — `{ minutes, reason }` or null
  - `startedTime` — for elapsed timer
- Subscribes to `useStoreRefresh()` and `useSimClock()`.

### Buttons / actions

| Button label | Mock function called | Intended backend endpoint | Role allowed | Notes |
|---|---|---|---|---|
| Check In | `checkIn(visitId)` | `POST /api/visits/:visitId/check-in` | receptionist | Only visible when `status === 'booked'` |
| Set Priority (star icon) | `setPriority(visitId, reason)` | `PUT /api/visits/:visitId/priority` | receptionist | Opens modal requiring a clinical reason string before submitting |
| Remove Priority (star-off icon) | `removePriority(visitId)` | `DELETE /api/visits/:visitId/priority` | receptionist | Only shown when `visit.priority === true` |
| No-Show (icon) | `markNoShow(visitId)` | `POST /api/visits/:visitId/no-show` | receptionist | Only for `booked | checked-in` |
| Cancel (icon) | `cancelVisit(visitId)` | `POST /api/visits/:visitId/cancel` | receptionist | Only for `booked | checked-in` |
| Provider tab click | `getProviderWaiting(providerId)`, `getProviderNowServing(providerId)` | `GET /api/providers/:providerId/queue` | receptionist | Switches active provider view |
| All Providers Overview card click | same as tab click | same | receptionist | Switches to single-provider view |

---

## /reception/walkin — Walk-In Registration

**Role access:** Receptionist
**Purpose:** Form to register an unscheduled walk-in patient, generate a queue token immediately (status `checked-in`), and display a QR code linking to the patient's live departure board.

### On load

- Mock functions called:
  - `departments` (static array from `src/mocks/store.js`)
  - `store.providers` (filtered by selected department and `active === true`)
- Intended backend endpoints:
  - `GET /api/departments`
  - `GET /api/providers?departmentId=:deptId&active=true`
- Data shape needed: same as department and provider shapes described above.

### Buttons / actions

| Button label | Mock function called | Intended backend endpoint | Role allowed | Notes |
|---|---|---|---|---|
| Generate Walk-In Token | `createWalkIn({ patient, phone, departmentId, serviceId, providerId })` | `POST /api/visits/walk-in` | receptionist | `providerId` may be `"auto"` — server selects shortest-queue provider. Response includes `token`, `estimatedWait`, `waitReason`, resolved `providerId`. |
| Print Token Slip | none (`window.print()`) | none | receptionist | Browser print dialog |
| New Walk-In (reset) | none | none | receptionist | Resets local form state |
| Open status board | none | none | receptionist | Navigation to `/status/{token}` in new tab |

**Request body shape for `POST /api/visits/walk-in`:**
- `patient` — string
- `phone` — string
- `departmentId` — string
- `serviceId` — string
- `providerId` — string or `"auto"`

**Response shape needed:**
- `id`, `token`, `patient`, `providerId`, `status: "checked-in"`, `estimatedWait`, `waitReason`, `serviceName`

---

## /reception/appointments — Appointments Roster

**Role access:** Receptionist
**Purpose:** Full master list of all visits in the system, filterable by status, sortable by scheduled time, with a link to each visit's public departure board.

### On load

- Mock function called: `store.visits` (direct array read)
- Intended backend endpoint: `GET /api/visits?date=today` (or date-range parameter)
- Data shape needed (per visit row):
  - `id`, `token`, `patient`, `phone`
  - `departmentId` (resolved to `name` via `departments` lookup)
  - `providerId` (resolved to `name`, `room` via `store.providers` lookup)
  - `serviceName`, `serviceDuration`
  - `scheduledTime`
  - `status`
  - `isWalkIn`
  - `priority`, `priorityReason`
  - `estimatedWait`, `waitReason` (for waiting visits only)
  - `delay`
- Filter tabs: `all | booked | checked-in | in-service | completed | cancelled_noshow` — all computed client-side from the full list.
- Subscribes to `useStoreRefresh()`.

### Buttons / actions

| Button label | Mock function called | Intended backend endpoint | Role allowed | Notes |
|---|---|---|---|---|
| Filter tab (status) | none (local filter) | none | receptionist | Client-side filter; no server call needed if all data is loaded |
| View (departure board link per row) | none | none | receptionist | Client-side navigation to `/status/{token}`, opens in new tab |

---

## /provider/queue — Provider Operations Console

**Role access:** Provider
**Purpose:** The provider's personal queue management screen — Now Serving hero with live elapsed timer, Next 5 waiting list, Kanban view (Waiting / In Service / Done Today), and delay entry modal.

### On load

- Mock functions called:
  - `getProviderNowServing(providerId)` in `src/mocks/store.js`
  - `getProviderWaiting(providerId)` in `src/mocks/store.js`
  - `getProviderVisits(providerId)` in `src/mocks/store.js`
  - `store.providers` (to look up the logged-in provider by `user.providerId`)
- Intended backend endpoints:
  - `GET /api/providers/:providerId`
  - `GET /api/providers/:providerId/queue`
  - `GET /api/providers/:providerId/visits?date=today`
- Data shape needed: same visit schema as Queue Board, plus:
  - `startedTime` — for elapsed MM:SS timer driven by `useSimClock()`
  - `completedTime` — for Done Today column
- Subscribes to `useStoreRefresh()` and `useSimClock()`.
- Provider identity: `user.providerId` from `AuthContext`; defaults to `'p1'` for demo.

### Buttons / actions

| Button label | Mock function called | Intended backend endpoint | Role allowed | Notes |
|---|---|---|---|---|
| Call Next Patient | `startVisit(visitId)` | `POST /api/visits/:visitId/start` | provider | Shown only when no visit is currently `in-service` |
| Call Now (per waiting row) | `startVisit(visitId)` | `POST /api/visits/:visitId/start` | provider | First waiting visit only when room is vacant |
| + Add Overrun Delay | opens modal → `delayVisit(visitId, minutes, reason)` | `PUT /api/visits/:visitId/delay` | provider | Requires reason string. Triggers full ETA recompute across all downstream patients. |
| Complete Consultation | `completeVisit(visitId)` | `POST /api/visits/:visitId/complete` | provider | Transitions current `in-service` visit to `completed` |

---

## /admin/overview — Admin Overview

**Role access:** Admin
**Purpose:** Real-time operational health dashboard with 6 KPI metric tiles, a per-provider load bar chart (Recharts), and a scrollable event log.

### On load

- Mock functions called:
  - `getMetrics()` in `src/mocks/store.js`
  - `store.eventLog` (direct read, sliced to last 25 events)
- Intended backend endpoints:
  - `GET /api/analytics/metrics` (today's aggregate figures)
  - `GET /api/events?limit=25&order=desc`
- Data shape needed from `getMetrics()`:
  - `avgWait` — integer (minutes)
  - `delayed` — integer (count of visits with active delay)
  - `waiting` — integer
  - `inService` — integer
  - `completed` — integer
  - `noShows` — integer
  - `total` — integer
  - `providerLoad` — array of `{ name, total, waiting, inService, completed, avgWait }` per active provider
- Data shape needed from event log (per entry):
  - `id`, `time` (timestamp), `event` (string), `visitId`, `detail` (string)
- Subscribes to `useStoreRefresh()` and `useSimClock()`.

### Buttons / actions

No interactive buttons on this screen (read-only dashboard).

---

## /admin/queue — Admin Queue Board

**Role access:** Admin
**Purpose:** Identical functionality to `/reception/queue` but scoped to the admin role; same mock functions, same actions, same data shapes.

> See [/reception/queue](#receptionqueue--reception-queue-board) for the complete on-load and action table. All mock functions and intended backend endpoints are identical.

---

## /admin/settings — Settings & Services

**Role access:** Admin
**Purpose:** Two-panel page: (1) global queue engine parameter form, (2) inline-editable service catalog table across all departments.

### On load

- Mock functions called:
  - `store.settings` (direct read)
  - `departments` (static array, with `services` arrays)
- Intended backend endpoints:
  - `GET /api/settings`
  - `GET /api/departments` (with services embedded)
- Data shape needed (settings):
  - `noShowGraceMinutes` — integer
  - `defaultOverbookLimit` — integer
  - `learningRate` — float
  - `walkInAutoRouting` — boolean
- Data shape needed (service per row):
  - `id`, `name`, `duration` (minutes), `prepTime` (minutes), `active` (boolean)
  - Plus the parent `departmentId` for scoped updates.

### Buttons / actions

| Button label | Mock function called | Intended backend endpoint | Role allowed | Notes |
|---|---|---|---|---|
| Save Settings | `updateSettings(settingsForm)` | `PUT /api/settings` | admin | Saves all 4 setting fields as a single body |
| Edit (per service row) | none (opens inline edit state) | none | admin | Switches row to editable mode |
| Save (per service row) | `updateService(deptId, serviceId, data)` | `PUT /api/departments/:deptId/services/:serviceId` | admin | Saves name, duration, prepTime, active for that service |
| Cancel edit (per service row) | none | none | admin | Restores row to read-only |

---

## /admin/providers — Provider Management

**Role access:** Admin
**Purpose:** CRUD table for the provider roster — view all providers, add new, edit existing, and toggle active/inactive status.

### On load

- Mock function called: `store.providers` (direct array read)
- Intended backend endpoint: `GET /api/providers`
- Data shape needed (per provider):
  - `id`, `name`, `department` (deptId), `kind`
  - `shift` — string (e.g. `"09:00–17:00"`)
  - `room`, `slotLength` (minutes), `slotCapacity`, `overbookLimit`
  - `active` — boolean
- Also reads `departments` to populate the department dropdown in the Add/Edit modal.
- Subscribes to `useStoreRefresh()`.

### Buttons / actions

| Button label | Mock function called | Intended backend endpoint | Role allowed | Notes |
|---|---|---|---|---|
| Add Medical Practitioner | opens modal → `addProvider(data)` | `POST /api/providers` | admin | Modal form fields: name, department, kind, shift, room, slotLength, slotCapacity, overbookLimit |
| Edit (per row) | opens modal → `updateProvider(id, data)` | `PUT /api/providers/:id` | admin | Modal pre-fills with provider data |
| Toggle Active / Inactive (per row) | `deactivateProvider(id)` | `PATCH /api/providers/:id/active` | admin | Toggles `active` boolean; note — `deactivateProvider()` actually toggles (not just deactivates) |

---

## /admin/simulator — Simulation Console

**Role access:** Admin
**Purpose:** Demo control panel for advancing, freezing, and resetting the simulated clock, and reseeding demo data — used to show live cascading ETA updates across all open screens.

### On load

- Mock functions called:
  - `useSimClock()` for current simulated time and frozen state
  - `getMetrics()` for live mini-metrics preview
  - `store.eventLog` (sliced to last 6 events)
- Intended backend endpoints:
  - `GET /api/simulator/state` — current time offset and frozen status
  - `GET /api/analytics/metrics`
  - `GET /api/events?limit=6`
- Data shape needed: same as Admin Overview metrics and event log shapes.

### Buttons / actions

| Button label | Mock function called | Intended backend endpoint | Role allowed | Notes |
|---|---|---|---|---|
| +5 min | `advanceClock(5)` | `POST /api/simulator/advance` with body `{ minutes: 5 }` | admin | Triggers full ETA recompute and pub/sub notify |
| +10 min | `advanceClock(10)` | `POST /api/simulator/advance` with body `{ minutes: 10 }` | admin | |
| +30 min | `advanceClock(30)` | `POST /api/simulator/advance` with body `{ minutes: 30 }` | admin | |
| Freeze / Resume (toggle) | `freezeClock()` / `resumeClock()` | `POST /api/simulator/freeze` or `POST /api/simulator/resume` | admin | Label switches based on `frozen` state |
| Reset Clock | `resetClock()` | `POST /api/simulator/reset` | admin | Resets `simOffset` to 0 |
| Reseed Demo Data | `seedData()` | `POST /api/simulator/reseed` | admin | Clears all visits and event log, repopulates with fresh seed data |

---

## ChatAssistant — Floating Patient Bot (not a route)

**Access:** Rendered inside `Layout.jsx` when `user.role === 'patient'`; visible on all three patient routes (`/patient/dashboard`, `/patient/book`, `/patient/visits`).
**Purpose:** Rule-based mock chatbot that reads from the live mock store to answer patient questions about queue status, appointments, doctors, and clinic hours — designed so the rule engine can be replaced by a real LLM call by swapping a single function.

### On mount / open

- Mock functions called:
  - `getInitialGreeting(patientName)` in `src/mocks/chatbotResponses.js`
    - Internally calls `getPatientVisits(patientName)` from `src/mocks/store.js`
- Intended backend endpoint (real integration): `GET /api/patients/:patientId/context` — pre-fetch active visit summary for proactive greeting

### Store data read (per intent)

| Intent keywords | Mock functions called | Data fields read |
|---|---|---|
| wait / how long / queue / eta / turn | `getPatientVisits(patientName)` | `status`, `token`, `estimatedWait`, `position`, `waitReason`, `providerId` (→ `name`, `room`) |
| next / when / appointment / schedule | `getPatientVisits(patientName)` (filter `booked | checked-in`) | `scheduledTime`, `serviceName`, `token`, `providerId` |
| cancel / reschedule / postpone | none (provides navigation deep-link to `/patient/visits`) | — |
| doctor / department / specialist / physician / providers | `store.providers` (filter `active`), `departments` | `name`, `active`; `departments[].name`, `departments[].code` |
| hour / time / location / address / where / open | none (static clinic hours string) | — |
| Live ETA update (unprompted) | `getPatientVisits(patientName)` on every `useSimClock()` tick | `estimatedWait` (compared to previous value via `useRef`) |

### Proposed real backend endpoint

```
POST /api/assistant/message
```

**Request body:**
```json
{
  "patientId": "string",
  "message": "string",
  "sessionId": "string (optional, for conversation continuity)",
  "context": {
    "activeVisitToken": "string or null",
    "currentPath": "string"
  }
}
```

**Response body:**
```json
{
  "text": "string (assistant reply)",
  "actionLink": "string or null (relative URL for CTA button)",
  "actionLabel": "string or null",
  "intent": "string (for logging/analytics)"
}
```

> **Design note:** The current mock engine in `src/mocks/chatbotResponses.js` exports `generateBotResponse(userInput, patientName)` and `getInitialGreeting(patientName)`. These are the only two functions `ChatAssistant.jsx` calls. Swapping the mock for a real LLM means replacing the bodies of these two functions to `fetch('POST /api/assistant/message', ...)` — no changes to the component itself.

---

## Complete Backend Endpoint Surface Area

All distinct endpoints referenced above, deduplicated and grouped by HTTP method.

### GET

```
GET /api/departments
GET /api/departments/:deptId/providers?active=true
GET /api/providers?active=true
GET /api/providers?departmentId=:deptId&active=true
GET /api/providers/:providerId
GET /api/providers/:providerId/slots?date=YYYY-MM-DD
GET /api/providers/:providerId/now-serving
GET /api/providers/:providerId/queue
GET /api/providers/:providerId/visits?date=today
GET /api/patients/:patientId/visits
GET /api/patients/:patientId/context
GET /api/visits?date=today
GET /api/visits/token/:tokenNo
GET /api/settings
GET /api/analytics/metrics
GET /api/events?limit=N&order=desc
GET /api/simulator/state
```

### POST

```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/demo-login
POST /api/appointments
POST /api/visits/walk-in
POST /api/visits/:visitId/check-in
POST /api/visits/:visitId/cancel
POST /api/visits/:visitId/no-show
POST /api/visits/:visitId/start
POST /api/visits/:visitId/complete
POST /api/providers
POST /api/simulator/advance
POST /api/simulator/freeze
POST /api/simulator/resume
POST /api/simulator/reset
POST /api/simulator/reseed
POST /api/assistant/message
```

### PUT / PATCH

```
PUT /api/visits/:visitId/priority
PUT /api/visits/:visitId/delay
PUT /api/providers/:id
PUT /api/departments/:deptId/services/:serviceId
PUT /api/settings
PATCH /api/providers/:id/active
```

### DELETE

```
DELETE /api/visits/:visitId/priority
```

---

## Mock → Real Migration Note

Every mock function used by screens lives in `src/mocks/store.js` and `src/mocks/chatbotResponses.js`, behind the **same function signature** the UI components call. To wire a real backend:

1. Set `VITE_USE_MOCKS=false` (or equivalent env flag).
2. In each mock function (e.g. `bookAppointment`, `checkIn`, `getPatientVisits`), replace the in-memory read/write with a `fetch()` or API client call to the corresponding endpoint listed above.
3. Preserve the same argument shape (input) and return shape (output) so screens require zero changes.

No screen file in `src/pages/` needs to be modified during integration. The entire backend wiring surface is the contents of `src/mocks/`.
