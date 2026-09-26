"use strict";

/* MediQ Console — a developer/demo tool that only ever calls the real, public
 * /api/* surface (same one the future frontend uses). It must keep working
 * unchanged as placeholder (501) endpoints are replaced with real logic. */

const DEMO_PASSWORD = "MediQ@2026"; // from demo/README.md — hackathon-only
const DEMO_USERS = [
  { username: "admin", label: "admin — Clinic admin" },
  { username: "receptionist", label: "receptionist — Receptionist" },
  { username: "patient", label: "patient — Patient (demo)" },
  { username: "gm_doc_1", label: "gm_doc_1 — Provider (General Medicine)" },
  { username: "gm_doc_2", label: "gm_doc_2 — Provider (General Medicine)" },
  { username: "oph_doc_1", label: "oph_doc_1 — Provider (Ophthalmology)" },
  { username: "ped_doc_1", label: "ped_doc_1 — Provider (Paediatrics)" },
  { username: "rad_xray_1", label: "rad_xray_1 — Provider (Radiology, X-Ray)" },
  { username: "rad_us_1", label: "rad_us_1 — Provider (Radiology, Ultrasound)" },
  { username: "rad_ct_1", label: "rad_ct_1 — Provider (Radiology, CT)" },
];

const state = {
  token: null,
  role: null,
  userId: null,
  providerId: null,
  patientId: null,
  username: null,
  selectedProviderId: null,
  selectedVisit: null, // { id, token, status }
  lastQueueSnapshot: null,
  log: [],
  sse: null,
  sseFailures: 0,
};

const MAX_LOG_ENTRIES = 200;
const MAX_SSE_RETRIES = 3;

// ---------------------------------------------------------------- utilities

function qs(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[ch]));
}

function tile(label, value) {
  return `<div class="tile"><div class="value">${escapeHtml(value ?? "—")}</div><div class="label">${escapeHtml(label)}</div></div>`;
}

function resolvedValue(selectId, overrideId) {
  const override = qs(overrideId).value.trim();
  if (override) return override;
  return qs(selectId).value;
}

function decodeJwtPayload(token) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64).split("").map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0")).join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// ------------------------------------------------------------- API wrapper

async function apiCall(method, path, body) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (state.token) headers.Authorization = `Bearer ${state.token}`;

  const entry = {
    method, path, requestBody: body ?? null,
    status: null, durationMs: null, responseBody: null, errorText: null,
    at: new Date(),
  };
  const startedAt = performance.now();
  try {
    const res = await fetch(path, {
      method, headers, body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    entry.status = res.status;
    const text = await res.text();
    if (text) {
      try {
        entry.responseBody = JSON.parse(text);
      } catch {
        entry.responseBody = text;
      }
    }
  } catch (err) {
    entry.errorText = err.message || String(err);
  }
  entry.durationMs = Math.round(performance.now() - startedAt);
  entry.notImplemented = entry.status === 501;
  entry.ok = entry.status !== null && entry.status >= 200 && entry.status < 300;

  state.log.unshift(entry);
  state.log.length = Math.min(state.log.length, MAX_LOG_ENTRIES);
  renderInspector();
  return entry;
}

/** A small badge summarizing a failed/placeholder call, for inline display
 * next to whichever panel made the request — a 501 reads as informational
 * (amber), never as an error (red). */
function statusNote(entry) {
  if (entry.notImplemented) return `<span class="badge warn">not implemented yet</span>`;
  if (entry.errorText) return `<span class="badge err">network error: ${escapeHtml(entry.errorText)}</span>`;
  const message = (entry.responseBody && entry.responseBody.error && entry.responseBody.error.message) || `HTTP ${entry.status}`;
  return `<span class="badge err">${escapeHtml(message)}</span>`;
}

// -------------------------------------------------------------- inspector

function renderInspector() {
  qs("inspector-count").textContent = `${state.log.length} request${state.log.length === 1 ? "" : "s"}`;
  qs("inspector-log").innerHTML = state.log.map((entry, i) => {
    const badge = entry.ok
      ? `<span class="badge ok">${entry.status}</span>`
      : entry.notImplemented
        ? `<span class="badge warn">${entry.status} not implemented</span>`
        : `<span class="badge err">${entry.status ?? "ERR"}</span>`;
    return `
      <details ${i === 0 ? "open" : ""}>
        <summary>${badge} ${entry.method} ${escapeHtml(entry.path)} — ${entry.durationMs}ms</summary>
        <pre>request: ${escapeHtml(JSON.stringify(entry.requestBody, null, 2))}

response: ${escapeHtml(JSON.stringify(entry.responseBody, null, 2))}${entry.errorText ? "\n\nerror: " + escapeHtml(entry.errorText) : ""}</pre>
      </details>`;
  }).join("");
}

qs("inspector-clear-btn").addEventListener("click", () => {
  state.log = [];
  renderInspector();
});

// ----------------------------------------------------------------- session

function populateDemoUserSelect() {
  qs("demo-user-select").innerHTML = DEMO_USERS.map((u) => `<option value="${u.username}">${escapeHtml(u.label)}</option>`).join("");
}

function isLoggedIn() {
  return Boolean(state.token);
}

function renderSession(lastAttempt) {
  qs("session-summary").textContent = isLoggedIn() ? `${state.username} (${state.role})` : "not logged in";

  const details = qs("session-details");
  const parts = [];
  if (isLoggedIn()) {
    const payload = decodeJwtPayload(state.token);
    parts.push(`<p class="hint">Role/provider/patient come from the login response and <code>/api/auth/me</code>, not the token — the JWT payload itself only carries <code>sub</code>/<code>iat</code>/<code>exp</code> (see docs/architecture.md § RBAC).</p>`);
    parts.push(`<pre>logged in as: ${escapeHtml(state.username)}
role: ${escapeHtml(state.role)}
provider_id: ${escapeHtml(state.providerId)}
patient_id: ${escapeHtml(state.patientId)}

decoded JWT payload: ${escapeHtml(JSON.stringify(payload))}</pre>`);
  } else if (lastAttempt && !lastAttempt.ok) {
    parts.push(statusNote(lastAttempt));
  }
  details.innerHTML = parts.join("");

  renderActionAvailability();
}

qs("use-demo-user-btn").addEventListener("click", () => {
  qs("login-username").value = qs("demo-user-select").value;
  qs("login-password").value = DEMO_PASSWORD;
});

qs("login-btn").addEventListener("click", async () => {
  const username = qs("login-username").value.trim();
  const password = qs("login-password").value;
  const entry = await apiCall("POST", "/api/auth/login", { username, password });
  if (entry.ok) {
    Object.assign(state, {
      token: entry.responseBody.access_token,
      role: entry.responseBody.role,
      userId: entry.responseBody.user_id,
      providerId: entry.responseBody.provider_id,
      patientId: entry.responseBody.patient_id,
      username,
    });
  }
  renderSession(entry);
});

qs("logout-btn").addEventListener("click", () => {
  Object.assign(state, { token: null, role: null, userId: null, providerId: null, patientId: null, username: null });
  renderSession();
});

qs("whoami-btn").addEventListener("click", async () => {
  const entry = await apiCall("GET", "/api/auth/me");
  if (entry.ok) {
    Object.assign(state, {
      role: entry.responseBody.role,
      providerId: entry.responseBody.provider_id,
      patientId: entry.responseBody.patient_id,
    });
  }
  renderSession(entry);
});

// -------------------------------------------------------------- sim clock

function renderClockResult(entry) {
  qs("clock-display").innerHTML = entry.ok
    ? tile("Effective time", entry.responseBody.effective_time) +
      tile("Offset (min)", entry.responseBody.offset_minutes) +
      tile("Frozen", entry.responseBody.is_frozen ? "yes" : "no")
    : statusNote(entry);
}

async function refreshClock() {
  renderClockResult(await apiCall("GET", "/api/sim/clock"));
}

document.querySelectorAll("[data-advance]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    renderClockResult(await apiCall("POST", "/api/sim/advance", { minutes: Number(btn.dataset.advance) }));
  });
});
qs("clock-freeze-btn").addEventListener("click", async () => renderClockResult(await apiCall("POST", "/api/sim/freeze")));
qs("clock-resume-btn").addEventListener("click", async () => renderClockResult(await apiCall("POST", "/api/sim/resume")));
qs("clock-reset-btn").addEventListener("click", async () => renderClockResult(await apiCall("POST", "/api/sim/reset")));
qs("clock-reseed-btn").addEventListener("click", async () => {
  await apiCall("POST", "/api/sim/seed");
  await refreshClock();
});
qs("clock-refresh-btn").addEventListener("click", refreshClock);

// ------------------------------------------------------------------ catalog

async function loadDepartments() {
  const entry = await apiCall("GET", "/api/departments");
  const sel = qs("department-select");
  if (entry.ok && Array.isArray(entry.responseBody)) {
    sel.innerHTML = `<option value="">—</option>` + entry.responseBody
      .map((d) => `<option value="${d.id}">${escapeHtml(d.name)} (${d.code})</option>`).join("");
    qs("catalog-status").innerHTML = "";
  } else {
    sel.innerHTML = `<option value="">—</option>`;
    qs("catalog-status").innerHTML = `GET /api/departments: ${statusNote(entry)}`;
  }
}

async function loadProvidersForDepartment() {
  const departmentId = resolvedValue("department-select", "department-override");
  const sel = qs("provider-select");
  sel.innerHTML = `<option value="">—</option>`;
  if (!departmentId) return;

  const entry = await apiCall("GET", `/api/departments/${departmentId}/providers`);
  if (entry.ok && Array.isArray(entry.responseBody)) {
    sel.innerHTML = `<option value="">—</option>` + entry.responseBody
      .map((p) => `<option value="${p.id}">${escapeHtml(p.name)} (${p.kind})</option>`).join("");
    qs("catalog-status").innerHTML = "";
  } else {
    qs("catalog-status").innerHTML = `GET /api/departments/{id}/providers: ${statusNote(entry)}`;
  }
}

async function onProviderChanged() {
  const providerId = resolvedValue("provider-select", "provider-override");
  state.selectedProviderId = providerId || null;
  qs("book-provider-id").value = providerId || "";
  await refreshQueueBoard();
  connectStream();
}

qs("department-select").addEventListener("change", loadProvidersForDepartment);
qs("department-override-go").addEventListener("click", loadProvidersForDepartment);
qs("provider-select").addEventListener("change", onProviderChanged);
qs("provider-override-go").addEventListener("click", onProviderChanged);
qs("catalog-refresh-btn").addEventListener("click", loadDepartments);

async function loadServiceOptions() {
  const entry = await apiCall("GET", "/api/services");
  const options = entry.ok && Array.isArray(entry.responseBody)
    ? `<option value="">—</option>` + entry.responseBody.map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join("")
    : `<option value="">—</option>`;
  qs("book-service-select").innerHTML = options;
  qs("walkin-service-select").innerHTML = options;
}

// -------------------------------------------------------------- queue board

function renderQueueSnapshot(entry) {
  const tbody = document.querySelector("#queue-table tbody");
  if (!entry.ok) {
    tbody.innerHTML = "";
    qs("queue-summary").innerHTML = statusNote(entry);
    return;
  }
  const snapshot = entry.responseBody;
  state.lastQueueSnapshot = snapshot;
  qs("queue-summary").innerHTML =
    tile("Current token", snapshot.current_token) + tile("Load", snapshot.load) + tile("Delayed", snapshot.delayed_count);

  tbody.innerHTML = snapshot.queue.map((v) => `
    <tr class="selectable${state.selectedVisit && state.selectedVisit.id === v.visit_id ? " selected" : ""}"
        data-visit-id="${v.visit_id}" data-token="${escapeHtml(v.token_no)}" data-status="${v.status}">
      <td>${escapeHtml(v.token_no)}</td>
      <td>${escapeHtml(v.status)}</td>
      <td>${escapeHtml(v.source)}</td>
      <td>${v.priority_flag ? "priority" : ""}</td>
      <td>${v.estimated_wait_min ?? "—"}</td>
      <td class="wrap">${escapeHtml(v.eta_reason || "")}</td>
    </tr>`).join("");

  tbody.querySelectorAll("tr[data-visit-id]").forEach((tr) => {
    tr.addEventListener("click", () => selectVisit(Number(tr.dataset.visitId), tr.dataset.token, tr.dataset.status));
  });
}

async function refreshQueueBoard() {
  if (!state.selectedProviderId) {
    document.querySelector("#queue-table tbody").innerHTML = "";
    qs("queue-summary").innerHTML = `<span class="muted">select a provider in Catalog</span>`;
    return;
  }
  renderQueueSnapshot(await apiCall("GET", `/api/queue/providers/${state.selectedProviderId}`));
}

qs("queue-refresh-btn").addEventListener("click", refreshQueueBoard);

// --------------------------------------------------------- live stream (SSE)

function setStreamIndicator(mode, label) {
  const el = qs("stream-indicator");
  el.className = mode; // "", "live", or "down"
  qs("stream-indicator-label").textContent = label;
}

const SSE_RETRY_DELAY_MS = 1500;

function connectStream() {
  if (state.sse) {
    state.sse.close();
    state.sse = null;
  }
  state.sseFailures = 0;
  openStream();
}

/** Per the EventSource spec, a handshake that gets back a non-200 status or a
 * Content-Type other than text/event-stream "fails the connection" outright —
 * the browser does NOT auto-retry the way it does for a mid-stream network
 * drop. Since /api/stream is still a 501 placeholder, every attempt hits
 * exactly that case, so the console drives its own bounded retry loop. */
function openStream() {
  setStreamIndicator("", state.sseFailures === 0 ? "connecting…" : "reconnecting…");

  const source = new EventSource("/api/stream");
  state.sse = source;

  source.onopen = () => {
    state.sseFailures = 0;
    setStreamIndicator("live", "live");
  };
  source.onmessage = (event) => {
    try {
      renderQueueSnapshot({ ok: true, responseBody: JSON.parse(event.data) });
    } catch {
      /* ignore a malformed push — the next one will correct the view */
    }
  };
  source.onerror = () => {
    source.close();
    state.sseFailures += 1;
    if (state.sseFailures >= MAX_SSE_RETRIES) {
      state.sse = null;
      setStreamIndicator("down", "unavailable (endpoint not implemented yet) — click to retry");
    } else {
      setTimeout(openStream, SSE_RETRY_DELAY_MS);
    }
  };
}

qs("stream-indicator").addEventListener("click", connectStream);

// -------------------------------------------------------------- actions panel

function selectVisit(id, token, status) {
  state.selectedVisit = { id, token, status };
  qs("selected-visit-banner").textContent = `Selected visit: ${token} (id ${id}, status ${status})`;
  ["checkin", "start", "delay", "complete", "cancel", "noshow", "priority"].forEach((prefix) => {
    qs(`${prefix}-visit-id`).value = id;
  });
  renderActionAvailability();
  refreshQueueBoard();
}

/** Role gating per docs/api-contract.md. Status gating only applies when the
 * visit id currently in the field came from a queue-board selection (so its
 * status is actually known) — a manually typed id is gated on role alone,
 * since the console has no way to know that visit's state. */
function renderActionAvailability() {
  const role = state.role;
  const knownStatus = (visitIdField) =>
    state.selectedVisit && String(state.selectedVisit.id) === qs(visitIdField).value ? state.selectedVisit.status : null;

  const rules = [
    { btn: "book-submit", allowed: role === "patient" || role === "receptionist" },
    { btn: "walkin-submit", allowed: role === "receptionist" },
    { btn: "checkin-submit", allowed: role === "receptionist", statusOk: (s) => s === null || s === "booked" },
    { btn: "start-submit", allowed: role === "provider", statusOk: (s) => s === null || s === "checked_in" },
    { btn: "delay-submit", allowed: role === "provider" || role === "receptionist", statusOk: (s) => s === null || s === "checked_in" || s === "in_service" },
    { btn: "complete-submit", allowed: role === "provider", statusOk: (s) => s === null || s === "in_service" },
    { btn: "cancel-submit", allowed: role === "patient" || role === "receptionist", statusOk: (s) => s === null || s === "booked" || s === "checked_in" },
    { btn: "noshow-submit", allowed: role === "receptionist" || role === "provider", statusOk: (s) => s === null || s === "booked" || s === "checked_in" },
    { btn: "priority-submit", allowed: role === "receptionist" || role === "admin" },
  ];
  const fieldFor = { "checkin-submit": "checkin-visit-id", "start-submit": "start-visit-id", "delay-submit": "delay-visit-id", "complete-submit": "complete-visit-id", "cancel-submit": "cancel-visit-id", "noshow-submit": "noshow-visit-id" };

  rules.forEach(({ btn, allowed, statusOk }) => {
    const field = fieldFor[btn];
    const status = field ? knownStatus(field) : null;
    qs(btn).disabled = !allowed || (statusOk ? !statusOk(status) : false);
  });
}

qs("book-use-my-patient").addEventListener("click", () => { qs("book-patient-id").value = state.patientId ?? ""; });
qs("walkin-use-my-patient").addEventListener("click", () => { qs("walkin-patient-id").value = state.patientId ?? ""; });

qs("book-load-slots").addEventListener("click", async () => {
  const providerId = qs("book-provider-id").value;
  const date = qs("book-date").value || new Date().toISOString().slice(0, 10);
  const sel = qs("book-slot-select");
  if (!providerId) { sel.innerHTML = `<option value="">—</option>`; return; }
  const entry = await apiCall("GET", `/api/providers/${providerId}/slots?date=${date}`);
  sel.innerHTML = entry.ok && Array.isArray(entry.responseBody)
    ? `<option value="">—</option>` + entry.responseBody.map((s) => `<option value="${s.id}">${escapeHtml(s.start_at)} (${s.remaining} left)</option>`).join("")
    : `<option value="">—</option>`;
});

qs("book-submit").addEventListener("click", async () => {
  await apiCall("POST", "/api/appointments", {
    patient_id: Number(qs("book-patient-id").value),
    provider_id: Number(qs("book-provider-id").value),
    service_id: Number(resolvedValue("book-service-select", "book-service-override")),
    slot_id: Number(resolvedValue("book-slot-select", "book-slot-override")),
  });
  refreshQueueBoard();
});

qs("walkin-submit").addEventListener("click", async () => {
  const body = {
    patient_id: Number(qs("walkin-patient-id").value),
    department_code: qs("walkin-department-code").value.trim(),
    service_id: Number(resolvedValue("walkin-service-select", "walkin-service-override")),
  };
  const providerId = qs("walkin-provider-id").value;
  if (providerId) body.provider_id = Number(providerId);
  await apiCall("POST", "/api/walk-ins", body);
  refreshQueueBoard();
});

function wireVisitAction(buttonId, method, pathFn, bodyFn) {
  qs(buttonId).addEventListener("click", async () => {
    await apiCall(method, pathFn(), bodyFn ? bodyFn() : undefined);
    refreshQueueBoard();
  });
}

wireVisitAction("checkin-submit", "POST", () => `/api/visits/${qs("checkin-visit-id").value}/check-in`);
wireVisitAction("start-submit", "POST", () => `/api/visits/${qs("start-visit-id").value}/start`);
wireVisitAction("delay-submit", "POST", () => `/api/visits/${qs("delay-visit-id").value}/delay`, () => ({
  minutes: Number(qs("delay-minutes").value), reason: qs("delay-reason").value,
}));
wireVisitAction("complete-submit", "POST", () => `/api/visits/${qs("complete-visit-id").value}/complete`);
wireVisitAction("cancel-submit", "POST", () => `/api/appointments/${qs("cancel-visit-id").value}/cancel`);
wireVisitAction("noshow-submit", "POST", () => `/api/visits/${qs("noshow-visit-id").value}/no-show`);
wireVisitAction("priority-submit", "POST", () => `/api/visits/${qs("priority-visit-id").value}/priority`, () => ({
  flag: qs("priority-flag").value === "true", reason: qs("priority-reason").value,
}));

// -------------------------------------------------------------- metrics/events

qs("metrics-refresh-btn").addEventListener("click", async () => {
  const entry = await apiCall("GET", "/api/metrics");
  if (!entry.ok) {
    qs("metrics-tiles").innerHTML = statusNote(entry);
    document.querySelector("#metrics-load-table tbody").innerHTML = "";
    return;
  }
  const m = entry.responseBody;
  qs("metrics-tiles").innerHTML =
    tile("Avg wait (min)", m.average_waiting_minutes) + tile("Delayed", m.total_delayed_cases) + tile("Active visits", m.total_active_visits);
  document.querySelector("#metrics-load-table tbody").innerHTML = m.provider_load.map((p) => `
    <tr><td>${escapeHtml(p.provider_name)}</td><td>${escapeHtml(p.department_code)}</td><td>${p.load}</td><td>${p.delayed_count}</td></tr>
  `).join("");
});

qs("events-refresh-btn").addEventListener("click", async () => {
  const entry = await apiCall("GET", "/api/events");
  const tbody = document.querySelector("#events-table tbody");
  if (!entry.ok) {
    tbody.innerHTML = `<tr><td colspan="4">${statusNote(entry)}</td></tr>`;
    return;
  }
  const items = entry.responseBody.items || [];
  tbody.innerHTML = items.map((e) => `
    <tr><td>${escapeHtml(e.type)}</td><td>${e.visit_id ?? "—"}</td><td>${e.provider_id}</td><td>${escapeHtml(e.sim_time)}</td></tr>
  `).join("");
});

// ------------------------------------------------------------- scenario runner

function renderScenarioResults(results) {
  qs("scenario-output").innerHTML = results.map((r) => {
    const badgeClass = r.outcome === "pass" ? "ok" : r.outcome === "skip" ? "warn" : "err";
    return `<li><span>${escapeHtml(r.label)}</span><span class="badge ${badgeClass}">${escapeHtml(r.outcome)}${r.detail ? ": " + escapeHtml(r.detail) : ""}</span></li>`;
  }).join("");
}

/** Runs steps in order. Each step's `run` returns {outcome: "pass"|"fail"|"skip", detail?}.
 * A step whose action returned 501 should report {outcome: "skip", detail: "not implemented"}. */
async function runScenario(steps) {
  const results = [];
  for (const step of steps) {
    renderScenarioResults([...results, { label: step.label, outcome: "running" }]);
    let result;
    try {
      result = await step.run(results);
    } catch (err) {
      result = { outcome: "fail", detail: err.message || String(err) };
    }
    results.push({ label: step.label, ...result });
    renderScenarioResults(results);
  }
}

function outcomeFor(entry, onOk) {
  if (entry.notImplemented) return { outcome: "skip", detail: "not implemented" };
  if (!entry.ok) return { outcome: "fail", detail: (entry.responseBody && entry.responseBody.error && entry.responseBody.error.message) || `HTTP ${entry.status}` };
  return onOk ? onOk(entry) : { outcome: "pass" };
}

qs("scenario-morning-rush").addEventListener("click", async () => {
  if (!state.selectedProviderId) { renderScenarioResults([{ label: "Morning rush", outcome: "skip", detail: "select a provider first" }]); return; }
  const providerId = state.selectedProviderId;
  const patientId = state.patientId ?? (Number(qs("book-patient-id").value) || 1);
  const serviceId = Number(resolvedValue("book-service-select", "book-service-override")) || 1;
  const steps = [];
  for (let i = 1; i <= 3; i++) {
    steps.push({
      label: `Book appointment #${i}`,
      run: async () => outcomeFor(await apiCall("POST", "/api/appointments", { patient_id: patientId, provider_id: providerId, service_id: serviceId, slot_id: i })),
    });
  }
  for (let i = 1; i <= 2; i++) {
    steps.push({
      label: `Walk-in #${i}`,
      run: async () => outcomeFor(await apiCall("POST", "/api/walk-ins", { patient_id: patientId, department_code: qs("walkin-department-code").value.trim() || "GM", service_id: serviceId })),
    });
  }
  await runScenario(steps);
});

qs("scenario-delay").addEventListener("click", async () => {
  if (!state.selectedVisit) { renderScenarioResults([{ label: "Delay scenario", outcome: "skip", detail: "select a visit from the queue board first" }]); return; }
  const visitId = state.selectedVisit.id;
  let before = null;
  await runScenario([
    {
      label: "Snapshot queue before delay",
      run: async () => {
        const entry = await apiCall("GET", `/api/queue/providers/${state.selectedProviderId}`);
        if (entry.ok) before = entry.responseBody.queue;
        return outcomeFor(entry);
      },
    },
    { label: "Start the consultation", run: async () => outcomeFor(await apiCall("POST", `/api/visits/${visitId}/start`)) },
    { label: "Mark it delayed by 15 minutes", run: async () => outcomeFor(await apiCall("POST", `/api/visits/${visitId}/delay`, { minutes: 15, reason: "Scenario runner test" })) },
    {
      label: "Verify waiting patients' estimated wait increased",
      run: async () => {
        const entry = await apiCall("GET", `/api/queue/providers/${state.selectedProviderId}`);
        return outcomeFor(entry, () => {
          if (!before) return { outcome: "skip", detail: "no baseline snapshot" };
          const after = entry.responseBody.queue;
          const increased = after.some((v) => {
            const prior = before.find((b) => b.visit_id === v.visit_id);
            return prior && v.estimated_wait_min > prior.estimated_wait_min;
          });
          return increased ? { outcome: "pass" } : { outcome: "fail", detail: "no wait times increased" };
        });
      },
    },
  ]);
});

qs("scenario-noshow").addEventListener("click", async () => {
  if (!state.selectedVisit) { renderScenarioResults([{ label: "No-show scenario", outcome: "skip", detail: "select a visit from the queue board first" }]); return; }
  const visitId = state.selectedVisit.id;
  let before = null;
  let graceMinutes = 20; // fallback; overridden below if admin settings are readable
  await runScenario([
    {
      label: "Read no-show grace period (admin settings)",
      run: async () => {
        const entry = await apiCall("GET", "/api/admin/settings");
        if (entry.ok) graceMinutes = entry.responseBody.noshow_grace_minutes;
        return outcomeFor(entry, () => ({ outcome: "pass" }));
      },
    },
    {
      label: "Snapshot queue before advancing the clock",
      run: async () => {
        const entry = await apiCall("GET", `/api/queue/providers/${state.selectedProviderId}`);
        if (entry.ok) before = entry.responseBody.queue;
        return outcomeFor(entry);
      },
    },
    {
      label: `Advance clock past the grace window (+${graceMinutes + 5} min)`,
      run: async () => outcomeFor(await apiCall("POST", "/api/sim/advance", { minutes: graceMinutes + 5 })),
    },
    {
      label: "Verify the visit is marked no-show",
      run: async () => {
        const entry = await apiCall("GET", `/api/queue/providers/${state.selectedProviderId}`);
        return outcomeFor(entry, () => {
          const stillQueued = entry.responseBody.queue.find((v) => v.visit_id === visitId);
          return !stillQueued ? { outcome: "pass" } : { outcome: "fail", detail: "visit is still in the active queue" };
        });
      },
    },
    {
      label: "Verify later patients moved up",
      run: async () => {
        const entry = await apiCall("GET", `/api/queue/providers/${state.selectedProviderId}`);
        return outcomeFor(entry, () => {
          if (!before) return { outcome: "skip", detail: "no baseline snapshot" };
          const after = entry.responseBody.queue;
          const movedUp = after.some((v) => {
            const prior = before.find((b) => b.visit_id === v.visit_id);
            return prior && v.position < prior.position;
          });
          return movedUp ? { outcome: "pass" } : { outcome: "fail", detail: "no positions improved" };
        });
      },
    },
  ]);
});

// -------------------------------------------------------------------- init

function init() {
  populateDemoUserSelect();
  qs("book-date").value = new Date().toISOString().slice(0, 10);
  renderSession();
  refreshClock();
  loadDepartments();
  loadServiceOptions();
  refreshQueueBoard();
  connectStream();
}

document.addEventListener("DOMContentLoaded", init);
