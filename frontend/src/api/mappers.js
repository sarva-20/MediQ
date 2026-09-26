// ── MediQ mapper: backend (snake_case ISO, int ids) <-> frontend (camelCase
// Unix-ms, string ids) shapes matching ROUTE_MAP.md / src/mocks/store.js. ──

const DEPT_ICON_BY_CODE = { GM: "Stethoscope", OPH: "Eye", PED: "Baby", RAD: "ScanLine" };

export function statusToBackend(feStatus) {
  return feStatus.replace(/-/g, "_");
}
export function statusToFrontend(beStatus) {
  return beStatus.replace(/_/g, "-");
}

function toMs(iso) {
  return iso ? Date.parse(iso) : null;
}

export function mapService(s) {
  return {
    id: String(s.id),
    _departmentBackendId: s.department_id,
    name: s.name,
    duration: s.default_duration_min,
    prepTime: s.prep_time_min,
    active: s.is_active,
  };
}

export function mapDepartment(d, allServices) {
  return {
    id: d.code.toLowerCase(),
    _backendId: d.id,
    code: d.code,
    name: d.name,
    icon: DEPT_ICON_BY_CODE[d.code] || "Stethoscope",
    services: allServices.filter((s) => s._departmentBackendId === d.id),
  };
}

function formatShift(shiftStart, shiftEnd) {
  return `${(shiftStart || "").slice(0, 5)}–${(shiftEnd || "").slice(0, 5)}`;
}

// Reverse of formatShift — admin Provider form edits the combined string back.
export function parseShift(shiftStr) {
  const parts = String(shiftStr || "").split(/[–-]/).map((s) => s.trim());
  const start = parts[0] || "09:00";
  const end = parts[1] || start;
  return {
    shift_start: start.length === 5 ? `${start}:00` : start,
    shift_end: end.length === 5 ? `${end}:00` : end,
  };
}

export function providerKindToFrontend(kind) {
  return kind === "scanner" ? "Radiologist" : "Consultant";
}
export function providerKindToBackend(kindLabel) {
  return /radio/i.test(kindLabel || "") ? "scanner" : "doctor";
}

export function mapProvider(p, deptFeIdByBackendId) {
  return {
    id: String(p.id),
    _backendId: p.id,
    department: deptFeIdByBackendId[p.department_id] || "",
    _departmentBackendId: p.department_id,
    name: p.name,
    kind: providerKindToFrontend(p.kind),
    room: p.room_label,
    shift: formatShift(p.shift_start, p.shift_end),
    slotLength: p.slot_length_min,
    slotCapacity: p.slot_capacity,
    overbookLimit: p.overbook_limit,
    active: p.is_active,
  };
}

export function mapSlot(s) {
  return {
    _id: s.id,
    time: toMs(s.start_at),
    booked: s.booked_count,
    capacity: s.capacity + (s.remaining_with_overbook - s.remaining),
    available: Math.max(0, s.remaining_with_overbook),
    full: s.remaining_with_overbook <= 0 || !s.is_available,
  };
}

// v: VisitOut (from /api/appointments, booking, walk-in, or lifecycle responses)
export function mapVisit(v, ctx) {
  const { serviceById = {}, departmentCodeByBackendId = {}, providerDeptByBackendId = {} } = ctx || {};
  const service = serviceById[String(v.service_id)];
  const deptBackendId = v.department_id ?? providerDeptByBackendId[String(v.provider_id)];
  const deptCode = departmentCodeByBackendId[deptBackendId] || "";
  const scheduledTime =
    toMs(v.scheduled_start) ?? toMs(v.checked_in_at) ?? toMs(v.created_at);

  return {
    id: String(v.id),
    token: v.token_no,
    patient:
      v.patient_name ||
      (v.phone ? `Patient (${v.phone})` : `Patient #${v.patient_id}`),
    phone: v.phone ?? null,
    providerId: String(v.provider_id),
    departmentId: deptCode.toLowerCase(),
    deptCode,
    serviceId: String(v.service_id),
    serviceName: v.service_name || service?.name || "",
    serviceDuration: service?.duration ?? 15,
    isWalkIn: v.source === "walkin",
    status: statusToFrontend(v.status),
    scheduledTime,
    checkedInTime: toMs(v.checked_in_at),
    startedTime: toMs(v.started_at),
    completedTime: toMs(v.completed_at),
    cancelledTime: v.status === "cancelled" ? toMs(v.created_at) : null,
    noShowTime: v.status === "no_show" ? toMs(v.created_at) : null,
    delay: v.delay_minutes > 0 ? { minutes: v.delay_minutes, reason: v.delay_reason } : null,
    priority: !!v.priority_flag,
    priorityReason: v.priority_reason || null,
    estimatedWait: v.estimated_wait_min ?? 0,
    waitReason: v.eta_reason || "",
    position: v.position ?? 0,
    createdAt: toMs(v.created_at),
  };
}

// qv: QueueVisitOut (from GET /api/queue/providers/{id}) — richer for active visits.
export function mapQueueVisitPatch(qv) {
  return {
    patient: qv.patient_name,
    status: statusToFrontend(qv.status),
    position: qv.position,
    estimatedWait: qv.estimated_wait_min,
    waitReason: qv.eta_reason,
    delay:
      qv.delay_minutes > 0 ? { minutes: qv.delay_minutes, reason: qv.delay_reason } : null,
    priority: !!qv.priority_flag,
    isWalkIn: !!qv.is_walkin,
    phone: qv.phone ?? null,
    serviceName: qv.service_name,
    serviceDuration: qv.service_duration_min,
  };
}

export function mapNowServingPatch(ns) {
  return {
    patient: ns.patient_name,
    status: statusToFrontend(ns.status),
    startedTime: toMs(ns.started_at),
    serviceName: ns.service_name,
  };
}

export function mapMetrics(m) {
  const total =
    (m.waiting_count || 0) +
    (m.in_service_count || 0) +
    (m.completed_today || 0) +
    (m.no_show_count || 0) +
    (m.cancelled_count || 0);

  return {
    avgWait: Math.round(m.avg_waiting_time_min ?? m.average_waiting_minutes ?? 0),
    delayed: m.delayed_cases ?? m.total_delayed_cases ?? 0,
    waiting: m.waiting_count ?? 0,
    inService: m.in_service_count ?? 0,
    completed: m.completed_today ?? 0,
    noShows: m.no_show_count ?? 0,
    total,
    providerLoad: (m.provider_load || []).map((p) => ({
      name: (p.provider_name || "").replace("Dr. ", ""),
      total: p.load,
      waiting: p.load,
      inService: 0,
      completed: 0,
      avgWait: Math.round(p.avg_wait_min || 0),
    })),
  };
}

export function mapEvent(e) {
  return {
    id: e.id,
    time: toMs(e.sim_time) || toMs(e.created_at),
    event: e.type,
    visitId: e.visit_id != null ? String(e.visit_id) : null,
    detail: e.detail || "",
  };
}

export function mapSettings(s) {
  return {
    noShowGraceMinutes: s.noshow_grace_minutes,
    defaultOverbookLimit: s.default_overbook_limit,
    learningRate: s.ewma_alpha,
    walkInAutoRouting: s.walkin_routing_enabled,
  };
}
export function settingsToBackend(fe) {
  return {
    noshow_grace_minutes: fe.noShowGraceMinutes,
    default_overbook_limit: fe.defaultOverbookLimit,
    ewma_alpha: fe.learningRate,
    walkin_routing_enabled: fe.walkInAutoRouting,
  };
}
