// ── MediQ Mock Data Layer ──
// In-memory queue engine with pub/sub, sim clock, and seed data.
// This is the single source of truth the entire UI runs against.

// ─── Pub/Sub ───
const listeners = new Set();
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function notify() {
  listeners.forEach((fn) => fn());
}

// ─── Simulated Clock ───
let simOffset = 0; // ms offset from real clock
let frozen = false;
let frozenAt = null;

function baseNow() {
  return frozen ? frozenAt : Date.now();
}

export function simNow() {
  return baseNow() + simOffset;
}
export function simDate() {
  return new Date(simNow());
}
export function advanceClock(minutes) {
  simOffset += minutes * 60 * 1000;
  recomputeAllQueues();
  notify();
}
export function freezeClock() {
  if (!frozen) {
    frozenAt = Date.now();
    frozen = true;
    notify();
  }
}
export function resumeClock() {
  if (frozen) {
    const elapsed = Date.now() - frozenAt;
    simOffset -= elapsed; // compensate for wall-clock drift while frozen
    frozen = false;
    frozenAt = null;
    notify();
  }
}
export function isClockFrozen() {
  return frozen;
}
export function resetClock() {
  simOffset = 0;
  frozen = false;
  frozenAt = null;
  notify();
}

// ─── ID Generators ───
let nextVisitId = 100;
function genVisitId() {
  return `V${nextVisitId++}`;
}
function genToken(deptCode, isWalkIn) {
  const prefix = deptCode;
  const type = isWalkIn ? "W" : "A";
  const num = String(
    store.visits.filter(
      (v) => v.deptCode === deptCode && v.isWalkIn === isWalkIn
    ).length + 1
  ).padStart(3, "0");
  return `${prefix}-${type}${num}`;
}

// ─── Departments & Services ───
export const departments = [
  {
    id: "gm",
    name: "General Medicine",
    code: "GM",
    icon: "Stethoscope",
    services: [
      { id: "gm-consult", name: "Consultation", duration: 15, prepTime: 2, active: true },
      { id: "gm-followup", name: "Follow-up", duration: 10, prepTime: 2, active: true },
      { id: "gm-checkup", name: "Annual Checkup", duration: 30, prepTime: 5, active: true },
    ],
  },
  {
    id: "oph",
    name: "Ophthalmology",
    code: "OPH",
    icon: "Eye",
    services: [
      { id: "oph-exam", name: "Eye Exam", duration: 20, prepTime: 3, active: true },
      { id: "oph-followup", name: "Follow-up", duration: 10, prepTime: 2, active: true },
    ],
  },
  {
    id: "ped",
    name: "Paediatrics",
    code: "PED",
    icon: "Baby",
    services: [
      { id: "ped-consult", name: "Consultation", duration: 15, prepTime: 2, active: true },
      { id: "ped-vaccine", name: "Vaccination", duration: 10, prepTime: 5, active: true },
    ],
  },
  {
    id: "rad",
    name: "Radiology",
    code: "RAD",
    icon: "ScanLine",
    services: [
      { id: "rad-xray", name: "X-Ray", duration: 15, prepTime: 5, active: true },
      { id: "rad-ultra", name: "Ultrasound", duration: 25, prepTime: 5, active: true },
    ],
  },
];

// ─── Providers ───
const seedProviders = [
  { id: "p1", name: "Dr. Priya Sharma", department: "gm", kind: "Senior Consultant", room: "Room 101", shift: "09:00–17:00", slotLength: 15, slotCapacity: 4, overbookLimit: 1, active: true },
  { id: "p2", name: "Dr. Arvind Rao", department: "gm", kind: "Consultant", room: "Room 102", shift: "09:00–17:00", slotLength: 15, slotCapacity: 4, overbookLimit: 1, active: true },
  { id: "p3", name: "Dr. Meena Iyer", department: "gm", kind: "Junior Consultant", room: "Room 103", shift: "10:00–16:00", slotLength: 15, slotCapacity: 3, overbookLimit: 0, active: true },
  { id: "p4", name: "Dr. Sunita Nair", department: "oph", kind: "Senior Consultant", room: "Room 201", shift: "09:00–17:00", slotLength: 20, slotCapacity: 3, overbookLimit: 1, active: true },
  { id: "p5", name: "Dr. Rajesh Menon", department: "oph", kind: "Consultant", room: "Room 202", shift: "09:00–15:00", slotLength: 20, slotCapacity: 3, overbookLimit: 0, active: true },
  { id: "p6", name: "Dr. Kavita Joshi", department: "ped", kind: "Senior Consultant", room: "Room 301", shift: "09:00–17:00", slotLength: 15, slotCapacity: 4, overbookLimit: 1, active: true },
  { id: "p7", name: "Dr. Ramesh Gupta", department: "ped", kind: "Consultant", room: "Room 302", shift: "10:00–16:00", slotLength: 15, slotCapacity: 3, overbookLimit: 0, active: true },
  { id: "p8", name: "Dr. Anita Desai", department: "rad", kind: "Senior Radiologist", room: "Room 401", shift: "09:00–17:00", slotLength: 15, slotCapacity: 3, overbookLimit: 0, active: true },
  { id: "p9", name: "Dr. Vikram Patel", department: "rad", kind: "Radiologist", room: "Room 402", shift: "09:00–15:00", slotLength: 25, slotCapacity: 2, overbookLimit: 0, active: true },
];

// ─── Settings ───
const defaultSettings = {
  noShowGraceMinutes: 10,
  defaultOverbookLimit: 1,
  learningRate: 0.1,
  walkInAutoRouting: true,
};

// ─── Store ───
export const store = {
  providers: [...seedProviders],
  visits: [],
  users: [],
  settings: { ...defaultSettings },
  eventLog: [],
};

// ─── Helper: time from sim clock ───
function todayBase() {
  const d = simDate();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function timeSlot(hour, minute) {
  return todayBase() + hour * 3600000 + minute * 60000;
}

// ─── Seed Visits ───
export function seedData() {
  nextVisitId = 100;
  store.visits = [];
  store.eventLog = [];
  store.providers = seedProviders.map((p) => ({ ...p }));
  store.settings = { ...defaultSettings };
  store.users = [
    { id: "u1", name: "Arjun Mehta", phone: "+919876543210", email: "arjun.mehta@example.com", role: "patient" },
  ];

  const now = simNow();

  // Create seed visits relative to sim clock
  const seeds = [
    // GM - Dr. Priya Sharma (p1)
    { patient: "Arjun Mehta", phone: "9876543210", provider: "p1", dept: "gm", service: "gm-consult", status: "completed", isWalkIn: false, scheduledOffset: -90, startedOffset: -85, completedOffset: -70 },
    { patient: "Lakshmi Venkatesh", phone: "9876543211", provider: "p1", dept: "gm", service: "gm-consult", status: "in-service", isWalkIn: false, scheduledOffset: -20, startedOffset: -10, priority: false },
    { patient: "Deepak Kumar", phone: "9876543212", provider: "p1", dept: "gm", service: "gm-followup", status: "checked-in", isWalkIn: false, scheduledOffset: 5 },
    { patient: "Fatima Begum", phone: "9876543213", provider: "p1", dept: "gm", service: "gm-consult", status: "booked", isWalkIn: false, scheduledOffset: 20 },
    { patient: "Ravi Shankar", phone: "9876543214", provider: "p1", dept: "gm", service: "gm-checkup", status: "booked", isWalkIn: false, scheduledOffset: 40 },

    // GM - Dr. Arvind Rao (p2)
    { patient: "Suresh Reddy", phone: "9876543215", provider: "p2", dept: "gm", service: "gm-consult", status: "in-service", isWalkIn: false, scheduledOffset: -15, startedOffset: -8, delay: { minutes: 8, reason: "Extended consultation for multiple concerns" } },
    { patient: "Ananya Das", phone: "9876543216", provider: "p2", dept: "gm", service: "gm-followup", status: "checked-in", isWalkIn: true, scheduledOffset: 0 },
    { patient: "Mohan Lal", phone: "9876543217", provider: "p2", dept: "gm", service: "gm-consult", status: "booked", isWalkIn: false, scheduledOffset: 15 },
    { patient: "Priya Nambiar", phone: "9876543218", provider: "p2", dept: "gm", service: "gm-consult", status: "no-show", isWalkIn: false, scheduledOffset: -60 },

    // OPH - Dr. Sunita Nair (p4)
    { patient: "Kamala Devi", phone: "9876543219", provider: "p4", dept: "oph", service: "oph-exam", status: "in-service", isWalkIn: false, scheduledOffset: -15, startedOffset: -12 },
    { patient: "Rahul Khanna", phone: "9876543220", provider: "p4", dept: "oph", service: "oph-exam", status: "checked-in", isWalkIn: false, scheduledOffset: 10, priority: true, priorityReason: "Elderly patient with acute vision changes" },
    { patient: "Sita Ram", phone: "9876543221", provider: "p4", dept: "oph", service: "oph-followup", status: "booked", isWalkIn: true, scheduledOffset: 25 },

    // PED - Dr. Kavita Joshi (p6)
    { patient: "Baby Arun (M/o Divya)", phone: "9876543222", provider: "p6", dept: "ped", service: "ped-consult", status: "in-service", isWalkIn: false, scheduledOffset: -10, startedOffset: -5 },
    { patient: "Baby Zara (F/o Irfan)", phone: "9876543223", provider: "p6", dept: "ped", service: "ped-vaccine", status: "checked-in", isWalkIn: false, scheduledOffset: 5 },
    { patient: "Baby Kiran (M/o Sneha)", phone: "9876543224", provider: "p6", dept: "ped", service: "ped-consult", status: "booked", isWalkIn: false, scheduledOffset: 20 },
    { patient: "Master Rohan (F/o Anil)", phone: "9876543225", provider: "p6", dept: "ped", service: "ped-consult", status: "cancelled", isWalkIn: false, scheduledOffset: -45 },

    // RAD - Dr. Anita Desai (p8)
    { patient: "Vijay Kumar", phone: "9876543226", provider: "p8", dept: "rad", service: "rad-xray", status: "completed", isWalkIn: false, scheduledOffset: -60, startedOffset: -55, completedOffset: -40 },
    { patient: "Geeta Mishra", phone: "9876543227", provider: "p8", dept: "rad", service: "rad-ultra", status: "in-service", isWalkIn: false, scheduledOffset: -5, startedOffset: -2, delay: { minutes: 5, reason: "Equipment calibration needed" } },
    { patient: "Amit Patel", phone: "9876543228", provider: "p8", dept: "rad", service: "rad-xray", status: "checked-in", isWalkIn: true, scheduledOffset: 15 },
  ];

  seeds.forEach((s) => {
    const id = genVisitId();
    const dept = departments.find((d) => d.id === s.dept);
    const token = genToken(dept.code, s.isWalkIn);
    const scheduled = now + s.scheduledOffset * 60000;
    const service = dept.services.find((sv) => sv.id === s.service);

    const visit = {
      id,
      token,
      patient: s.patient,
      phone: s.phone,
      providerId: s.provider,
      departmentId: s.dept,
      deptCode: dept.code,
      serviceId: s.service,
      serviceName: service.name,
      serviceDuration: service.duration,
      isWalkIn: s.isWalkIn,
      status: s.status,
      scheduledTime: scheduled,
      checkedInTime: ["checked-in", "in-service", "completed", "no-show"].includes(s.status) ? scheduled - 5 * 60000 : null,
      startedTime: s.startedOffset != null ? now + s.startedOffset * 60000 : null,
      completedTime: s.completedOffset != null ? now + s.completedOffset * 60000 : null,
      cancelledTime: s.status === "cancelled" ? scheduled + 10 * 60000 : null,
      noShowTime: s.status === "no-show" ? scheduled + 15 * 60000 : null,
      delay: s.delay || null,
      priority: s.priority || false,
      priorityReason: s.priorityReason || null,
      estimatedWait: 0,
      waitReason: "",
      position: 0,
      createdAt: scheduled - 30 * 60000,
    };

    store.visits.push(visit);
  });

  // Set the demo patient's visits (a few belong to "Arjun Mehta" who is our demo patient)
  logEvent("system", null, "Demo data seeded");
  recomputeAllQueues();
  notify();
}

// ─── Event Log ───
function logEvent(event, visitId, detail) {
  store.eventLog.unshift({
    id: Date.now() + Math.random(),
    time: simNow(),
    event,
    visitId,
    detail,
  });
  // keep last 100
  if (store.eventLog.length > 100) store.eventLog.length = 100;
}

// ─── Queue Recompute ───
function recomputeProviderQueue(providerId) {
  const provider = store.providers.find((p) => p.id === providerId);
  if (!provider) return;

  const now = simNow();
  const dept = departments.find((d) => d.id === provider.department);

  // Get current in-service visit
  const inService = store.visits.find(
    (v) => v.providerId === providerId && v.status === "in-service"
  );

  // Get waiting visits (checked-in + booked), sorted: priority first, then scheduled time
  const waiting = store.visits
    .filter(
      (v) =>
        v.providerId === providerId &&
        (v.status === "checked-in" || v.status === "booked")
    )
    .sort((a, b) => {
      if (a.priority && !b.priority) return -1;
      if (!a.priority && b.priority) return 1;
      return a.scheduledTime - b.scheduledTime;
    });

  // Calculate remaining time for current in-service
  let currentRemaining = 0;
  if (inService) {
    const elapsed = (now - inService.startedTime) / 60000;
    const totalDuration =
      inService.serviceDuration + (inService.delay ? inService.delay.minutes : 0);
    currentRemaining = Math.max(0, totalDuration - elapsed);
  }

  // Compute cumulative wait for each waiting visit
  let cumulative = currentRemaining;
  waiting.forEach((visit, idx) => {
    visit.position = idx + 1;
    visit.estimatedWait = Math.round(cumulative);

    // Build reason string
    const reasons = [];
    if (inService && idx === 0) {
      if (inService.delay) {
        reasons.push(
          `+${inService.delay.minutes} min: ${provider.name}'s current consultation overran — ${inService.delay.reason}`
        );
      } else if (currentRemaining > 0) {
        reasons.push(
          `${provider.name} is with a patient (~${Math.round(currentRemaining)} min remaining)`
        );
      }
    }
    if (idx > 0) {
      reasons.push(`${idx} patient${idx > 1 ? "s" : ""} ahead in queue`);
    }
    if (visit.priority) {
      reasons.push(`Priority: ${visit.priorityReason}`);
    }

    visit.waitReason = reasons.join(". ") || "On track";

    // Accumulate this visit's duration for next
    const svc = dept?.services.find((s) => s.id === visit.serviceId);
    cumulative += (svc?.duration || 15) + (svc?.prepTime || 2);
  });
}

export function recomputeAllQueues() {
  const providerIds = new Set(store.visits.map((v) => v.providerId));
  providerIds.forEach((pid) => recomputeProviderQueue(pid));
}

// ─── State Transitions ───
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function bookAppointment({ patient, phone, departmentId, serviceId, providerId, scheduledTime }) {
  await delay(300);
  const dept = departments.find((d) => d.id === departmentId);
  const service = dept.services.find((s) => s.id === serviceId);
  const id = genVisitId();
  const token = genToken(dept.code, false);

  // If providerId is "any", pick provider with shortest queue
  let actualProvider = providerId;
  if (providerId === "any") {
    const deptProviders = store.providers.filter(
      (p) => p.department === departmentId && p.active
    );
    let minQueue = Infinity;
    deptProviders.forEach((p) => {
      const qLen = store.visits.filter(
        (v) =>
          v.providerId === p.id &&
          (v.status === "booked" || v.status === "checked-in" || v.status === "in-service")
      ).length;
      if (qLen < minQueue) {
        minQueue = qLen;
        actualProvider = p.id;
      }
    });
  }

  const visit = {
    id,
    token,
    patient,
    phone,
    providerId: actualProvider,
    departmentId,
    deptCode: dept.code,
    serviceId,
    serviceName: service.name,
    serviceDuration: service.duration,
    isWalkIn: false,
    status: "booked",
    scheduledTime,
    checkedInTime: null,
    startedTime: null,
    completedTime: null,
    cancelledTime: null,
    noShowTime: null,
    delay: null,
    priority: false,
    priorityReason: null,
    estimatedWait: 0,
    waitReason: "",
    position: 0,
    createdAt: simNow(),
  };

  store.visits.push(visit);
  logEvent("booked", id, `${patient} booked ${service.name} with token ${token}`);
  recomputeAllQueues();
  notify();
  return visit;
}

export async function createWalkIn({ patient, phone, departmentId, serviceId, providerId }) {
  await delay(300);
  const dept = departments.find((d) => d.id === departmentId);
  const service = dept.services.find((s) => s.id === serviceId);
  const id = genVisitId();
  const token = genToken(dept.code, true);

  let actualProvider = providerId;
  if (!providerId || providerId === "auto") {
    const deptProviders = store.providers.filter(
      (p) => p.department === departmentId && p.active
    );
    let minQueue = Infinity;
    deptProviders.forEach((p) => {
      const qLen = store.visits.filter(
        (v) =>
          v.providerId === p.id &&
          (v.status === "booked" || v.status === "checked-in" || v.status === "in-service")
      ).length;
      if (qLen < minQueue) {
        minQueue = qLen;
        actualProvider = p.id;
      }
    });
  }

  const visit = {
    id,
    token,
    patient,
    phone,
    providerId: actualProvider,
    departmentId,
    deptCode: dept.code,
    serviceId,
    serviceName: service.name,
    serviceDuration: service.duration,
    isWalkIn: true,
    status: "checked-in",
    scheduledTime: simNow(),
    checkedInTime: simNow(),
    startedTime: null,
    completedTime: null,
    cancelledTime: null,
    noShowTime: null,
    delay: null,
    priority: false,
    priorityReason: null,
    estimatedWait: 0,
    waitReason: "",
    position: 0,
    createdAt: simNow(),
  };

  store.visits.push(visit);
  logEvent("walk-in", id, `${patient} walked in for ${service.name}, token ${token}`);
  recomputeAllQueues();
  notify();
  return visit;
}

export async function checkIn(visitId) {
  await delay(200);
  const visit = store.visits.find((v) => v.id === visitId);
  if (!visit || visit.status !== "booked") return null;
  visit.status = "checked-in";
  visit.checkedInTime = simNow();
  logEvent("checked-in", visitId, `${visit.patient} checked in (${visit.token})`);
  recomputeAllQueues();
  notify();
  return visit;
}

export async function startVisit(visitId) {
  await delay(200);
  const visit = store.visits.find((v) => v.id === visitId);
  if (!visit || (visit.status !== "checked-in" && visit.status !== "booked"))
    return null;
  visit.status = "in-service";
  visit.startedTime = simNow();
  if (!visit.checkedInTime) visit.checkedInTime = simNow();
  logEvent("started", visitId, `${visit.patient} consultation started (${visit.token})`);
  recomputeAllQueues();
  notify();
  return visit;
}

export async function delayVisit(visitId, minutes, reason) {
  await delay(200);
  const visit = store.visits.find((v) => v.id === visitId);
  if (!visit || visit.status !== "in-service") return null;
  visit.delay = { minutes, reason };
  logEvent(
    "delayed",
    visitId,
    `${visit.patient} delayed +${minutes} min: ${reason}`
  );
  recomputeAllQueues();
  notify();
  return visit;
}

export async function completeVisit(visitId) {
  await delay(200);
  const visit = store.visits.find((v) => v.id === visitId);
  if (!visit || visit.status !== "in-service") return null;
  visit.status = "completed";
  visit.completedTime = simNow();
  logEvent("completed", visitId, `${visit.patient} consultation completed (${visit.token})`);
  recomputeAllQueues();
  notify();
  return visit;
}

export async function markNoShow(visitId) {
  await delay(200);
  const visit = store.visits.find((v) => v.id === visitId);
  if (!visit || (visit.status !== "booked" && visit.status !== "checked-in"))
    return null;
  visit.status = "no-show";
  visit.noShowTime = simNow();
  logEvent("no-show", visitId, `${visit.patient} marked no-show (${visit.token})`);
  recomputeAllQueues();
  notify();
  return visit;
}

export async function cancelVisit(visitId) {
  await delay(200);
  const visit = store.visits.find((v) => v.id === visitId);
  if (!visit || (visit.status !== "booked" && visit.status !== "checked-in"))
    return null;
  visit.status = "cancelled";
  visit.cancelledTime = simNow();
  logEvent("cancelled", visitId, `${visit.patient} cancelled (${visit.token})`);
  recomputeAllQueues();
  notify();
  return visit;
}

export async function setPriority(visitId, reason) {
  await delay(200);
  const visit = store.visits.find((v) => v.id === visitId);
  if (!visit) return null;
  visit.priority = true;
  visit.priorityReason = reason;
  logEvent("priority-set", visitId, `${visit.patient} priority: ${reason}`);
  recomputeAllQueues();
  notify();
  return visit;
}

export async function removePriority(visitId) {
  await delay(200);
  const visit = store.visits.find((v) => v.id === visitId);
  if (!visit) return null;
  visit.priority = false;
  visit.priorityReason = null;
  logEvent("priority-removed", visitId, `${visit.patient} priority removed`);
  recomputeAllQueues();
  notify();
  return visit;
}

// ─── Provider CRUD ───
export async function addProvider(data) {
  await delay(300);
  const id = "p" + (store.providers.length + 1) + "_" + Date.now();
  const provider = { ...data, id, active: true };
  store.providers.push(provider);
  logEvent("provider-added", null, `${data.name} added`);
  notify();
  return provider;
}

export async function updateProvider(id, data) {
  await delay(300);
  const idx = store.providers.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  store.providers[idx] = { ...store.providers[idx], ...data };
  logEvent("provider-updated", null, `${store.providers[idx].name} updated`);
  notify();
  return store.providers[idx];
}

export async function deactivateProvider(id) {
  await delay(200);
  const provider = store.providers.find((p) => p.id === id);
  if (!provider) return null;
  provider.active = !provider.active;
  logEvent("provider-toggled", null, `${provider.name} ${provider.active ? "activated" : "deactivated"}`);
  notify();
  return provider;
}

// ─── Settings ───
export async function updateSettings(newSettings) {
  await delay(200);
  Object.assign(store.settings, newSettings);
  logEvent("settings-updated", null, "Settings updated");
  notify();
  return store.settings;
}

export async function updateService(deptId, serviceId, data) {
  await delay(200);
  const dept = departments.find((d) => d.id === deptId);
  if (!dept) return null;
  const svc = dept.services.find((s) => s.id === serviceId);
  if (!svc) return null;
  Object.assign(svc, data);
  logEvent("service-updated", null, `${svc.name} updated`);
  notify();
  return svc;
}

// ─── Query Helpers ───
export function getVisit(id) {
  return store.visits.find((v) => v.id === id) || null;
}

export function getVisitByToken(token) {
  return store.visits.find((v) => v.token === token) || null;
}

export function getProviderVisits(providerId) {
  return store.visits
    .filter((v) => v.providerId === providerId)
    .sort((a, b) => {
      if (a.priority && !b.priority) return -1;
      if (!a.priority && b.priority) return 1;
      return a.scheduledTime - b.scheduledTime;
    });
}

export function getProviderNowServing(providerId) {
  return store.visits.find(
    (v) => v.providerId === providerId && v.status === "in-service"
  ) || null;
}

export function getProviderWaiting(providerId) {
  return store.visits
    .filter(
      (v) =>
        v.providerId === providerId &&
        (v.status === "checked-in" || v.status === "booked")
    )
    .sort((a, b) => {
      if (a.priority && !b.priority) return -1;
      if (!a.priority && b.priority) return 1;
      return a.scheduledTime - b.scheduledTime;
    });
}

export function getProviderCompleted(providerId) {
  return store.visits
    .filter(
      (v) =>
        v.providerId === providerId &&
        (v.status === "completed" || v.status === "no-show" || v.status === "cancelled")
    )
    .sort((a, b) => (b.completedTime || b.noShowTime || b.cancelledTime || 0) - (a.completedTime || a.noShowTime || a.cancelledTime || 0));
}

export function getPatientVisits(patientName) {
  return store.visits
    .filter((v) => v.patient === patientName)
    .sort((a, b) => b.scheduledTime - a.scheduledTime);
}

export function getDepartmentProviders(departmentId) {
  return store.providers.filter(
    (p) => p.department === departmentId && p.active
  );
}

export function getSlotAvailability(providerId, dateTimestamp) {
  const provider = store.providers.find((p) => p.id === providerId);
  if (!provider) return [];

  const [startH, startM] = provider.shift.split("–")[0].split(":").map(Number);
  const [endH, endM] = provider.shift.split("–")[1].split(":").map(Number);

  const dayBase = new Date(dateTimestamp);
  dayBase.setHours(0, 0, 0, 0);
  const base = dayBase.getTime();

  const slots = [];
  let cursor = base + startH * 3600000 + startM * 60000;
  const end = base + endH * 3600000 + endM * 60000;

  while (cursor < end) {
    const slotTime = cursor;
    const booked = store.visits.filter(
      (v) =>
        v.providerId === providerId &&
        v.scheduledTime >= slotTime &&
        v.scheduledTime < slotTime + provider.slotLength * 60000 &&
        v.status !== "cancelled" &&
        v.status !== "no-show"
    ).length;

    const capacity = provider.slotCapacity + provider.overbookLimit;
    slots.push({
      time: slotTime,
      booked,
      capacity,
      available: capacity - booked,
      full: booked >= capacity,
    });
    cursor += provider.slotLength * 60000;
  }

  return slots;
}

// ─── Metrics ───
export function getMetrics() {
  const now = simNow();
  const todayStart = todayBase();
  const todayVisits = store.visits.filter((v) => v.scheduledTime >= todayStart);

  const completed = todayVisits.filter((v) => v.status === "completed");
  const waiting = todayVisits.filter(
    (v) => v.status === "checked-in" || v.status === "booked"
  );
  const inService = todayVisits.filter((v) => v.status === "in-service");
  const delayed = todayVisits.filter((v) => v.delay);
  const noShows = todayVisits.filter((v) => v.status === "no-show");

  const avgWait =
    completed.length > 0
      ? Math.round(
          completed.reduce((sum, v) => {
            const waitMs = (v.startedTime || v.completedTime) - (v.checkedInTime || v.scheduledTime);
            return sum + waitMs / 60000;
          }, 0) / completed.length
        )
      : 0;

  // Per-provider load
  const providerLoad = store.providers
    .filter((p) => p.active)
    .map((p) => {
      const pVisits = todayVisits.filter((v) => v.providerId === p.id);
      return {
        name: p.name.replace("Dr. ", ""),
        total: pVisits.length,
        waiting: pVisits.filter((v) => v.status === "checked-in" || v.status === "booked").length,
        inService: pVisits.filter((v) => v.status === "in-service").length,
        completed: pVisits.filter((v) => v.status === "completed").length,
        avgWait: pVisits.filter((v) => v.status === "completed" && v.startedTime && v.checkedInTime).length > 0
          ? Math.round(
              pVisits
                .filter((v) => v.status === "completed" && v.startedTime && v.checkedInTime)
                .reduce((s, v) => s + (v.startedTime - v.checkedInTime) / 60000, 0) /
                pVisits.filter((v) => v.status === "completed" && v.startedTime && v.checkedInTime).length
            )
          : 0,
      };
    });

  return {
    avgWait,
    delayed: delayed.length,
    waiting: waiting.length,
    inService: inService.length,
    completed: completed.length,
    noShows: noShows.length,
    total: todayVisits.length,
    providerLoad,
  };
}

// ─── Account Creation (Mock) ───
export async function createAccount({ name, phone, email, password }) {
  await delay(350);
  const id = "u" + (store.users.length + 1) + "_" + Date.now();
  const user = {
    id,
    name: name.trim(),
    phone: phone.trim(),
    email: email.trim().toLowerCase(),
    role: "patient",
    createdAt: simNow(),
  };
  store.users.push(user);
  logEvent("account-created", null, `New patient account created: ${user.name} (${user.phone})`);
  notify();
  return user;
}

export function getUserByEmail(email) {
  return store.users.find(u => u.email === email?.trim().toLowerCase()) || null;
}

// ─── Initialize ───
seedData();
