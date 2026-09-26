// ── MediQ Data Layer ──
// USE_MOCKS=true: original in-memory mock engine (untouched, below).
// USE_MOCKS=false: a polling cache backed by the real MediQ API (see src/api/).
// Every exported name below keeps the exact signature screens already call —
// only the implementation swaps based on the flag.

import { USE_MOCKS, api, getSession as getApiSession } from "../api/client";
import { POLL_INTERVAL_MS } from "../api/config";
import {
  mapDepartment,
  mapService,
  mapProvider,
  mapSlot,
  mapVisit,
  mapQueueVisitPatch,
  mapNowServingPatch,
  mapMetrics,
  mapEvent,
  mapSettings,
  settingsToBackend,
  statusToBackend,
  parseShift,
  providerKindToBackend,
} from "../api/mappers";

// ─── Pub/Sub (shared by both modes) ───
const listeners = new Set();
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function notify() {
  listeners.forEach((fn) => fn());
}

// ════════════════════════════════════════════════════════════════════════
// MOCK MODE — original in-memory engine, unchanged.
// ════════════════════════════════════════════════════════════════════════

let simOffset = 0;
let frozen = false;
let frozenAt = null;

function baseNow() {
  return frozen ? frozenAt : Date.now();
}
function mockSimNow() {
  return baseNow() + simOffset;
}
function mockSimDate() {
  return new Date(mockSimNow());
}
function mockAdvanceClock(minutes) {
  simOffset += minutes * 60 * 1000;
  mockRecomputeAllQueues();
  notify();
}
function mockFreezeClock() {
  if (!frozen) {
    frozenAt = Date.now();
    frozen = true;
    notify();
  }
}
function mockResumeClock() {
  if (frozen) {
    const elapsed = Date.now() - frozenAt;
    simOffset -= elapsed;
    frozen = false;
    frozenAt = null;
    notify();
  }
}
function mockIsClockFrozen() {
  return frozen;
}
function mockResetClock() {
  simOffset = 0;
  frozen = false;
  frozenAt = null;
  notify();
}

let nextVisitId = 100;
function genVisitId() {
  return `V${nextVisitId++}`;
}
function genToken(deptCode, isWalkIn) {
  const prefix = deptCode;
  const type = isWalkIn ? "W" : "A";
  const num = String(
    store.visits.filter((v) => v.deptCode === deptCode && v.isWalkIn === isWalkIn).length + 1
  ).padStart(3, "0");
  return `${prefix}-${type}${num}`;
}

export const mockDepartments = [
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

const defaultSettings = {
  noShowGraceMinutes: 10,
  defaultOverbookLimit: 1,
  learningRate: 0.1,
  walkInAutoRouting: true,
};

// ─── Store (mock mode uses this directly; real mode fills the same shape).
// In real mode these start EMPTY — they're only ever filled by refreshCatalog()
// / the poller, never by the mock seed data below (mockSeedData() only runs
// when USE_MOCKS is true, at the bottom of this file). ───
export const store = {
  providers: USE_MOCKS ? [...seedProviders] : [],
  visits: [],
  users: [],
  settings: { ...defaultSettings },
  eventLog: [],
};

export const departments = USE_MOCKS ? [...mockDepartments] : [];

function todayBase() {
  const d = mockSimDate();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

const VISIT_PLAN = [
  { patient: "Arjun Mehta", phone: "9876543210", provider: "p1", dept: "gm", service: "gm-consult", status: "completed", isWalkIn: false, scheduledOffset: -90, startedOffset: -85, completedOffset: -70 },
  { patient: "Lakshmi Venkatesh", phone: "9876543211", provider: "p1", dept: "gm", service: "gm-consult", status: "in-service", isWalkIn: false, scheduledOffset: -20, startedOffset: -10, priority: false },
  { patient: "Deepak Kumar", phone: "9876543212", provider: "p1", dept: "gm", service: "gm-followup", status: "checked-in", isWalkIn: false, scheduledOffset: 5 },
  { patient: "Fatima Begum", phone: "9876543213", provider: "p1", dept: "gm", service: "gm-consult", status: "booked", isWalkIn: false, scheduledOffset: 20 },
  { patient: "Ravi Shankar", phone: "9876543214", provider: "p1", dept: "gm", service: "gm-checkup", status: "booked", isWalkIn: false, scheduledOffset: 40 },
  { patient: "Suresh Reddy", phone: "9876543215", provider: "p2", dept: "gm", service: "gm-consult", status: "in-service", isWalkIn: false, scheduledOffset: -15, startedOffset: -8, delay: { minutes: 8, reason: "Extended consultation for multiple concerns" } },
  { patient: "Ananya Das", phone: "9876543216", provider: "p2", dept: "gm", service: "gm-followup", status: "checked-in", isWalkIn: true, scheduledOffset: 0 },
  { patient: "Mohan Lal", phone: "9876543217", provider: "p2", dept: "gm", service: "gm-consult", status: "booked", isWalkIn: false, scheduledOffset: 15 },
  { patient: "Priya Nambiar", phone: "9876543218", provider: "p2", dept: "gm", service: "gm-consult", status: "no-show", isWalkIn: false, scheduledOffset: -60 },
  { patient: "Kamala Devi", phone: "9876543219", provider: "p4", dept: "oph", service: "oph-exam", status: "in-service", isWalkIn: false, scheduledOffset: -15, startedOffset: -12 },
  { patient: "Rahul Khanna", phone: "9876543220", provider: "p4", dept: "oph", service: "oph-exam", status: "checked-in", isWalkIn: false, scheduledOffset: 10, priority: true, priorityReason: "Elderly patient with acute vision changes" },
  { patient: "Sita Ram", phone: "9876543221", provider: "p4", dept: "oph", service: "oph-followup", status: "booked", isWalkIn: true, scheduledOffset: 25 },
  { patient: "Baby Arun (M/o Divya)", phone: "9876543222", provider: "p6", dept: "ped", service: "ped-consult", status: "in-service", isWalkIn: false, scheduledOffset: -10, startedOffset: -5 },
  { patient: "Baby Zara (F/o Irfan)", phone: "9876543223", provider: "p6", dept: "ped", service: "ped-vaccine", status: "checked-in", isWalkIn: false, scheduledOffset: 5 },
  { patient: "Baby Kiran (M/o Sneha)", phone: "9876543224", provider: "p6", dept: "ped", service: "ped-consult", status: "booked", isWalkIn: false, scheduledOffset: 20 },
  { patient: "Master Rohan (F/o Anil)", phone: "9876543225", provider: "p6", dept: "ped", service: "ped-consult", status: "cancelled", isWalkIn: false, scheduledOffset: -45 },
  { patient: "Vijay Kumar", phone: "9876543226", provider: "p8", dept: "rad", service: "rad-xray", status: "completed", isWalkIn: false, scheduledOffset: -60, startedOffset: -55, completedOffset: -40 },
  { patient: "Geeta Mishra", phone: "9876543227", provider: "p8", dept: "rad", service: "rad-ultra", status: "in-service", isWalkIn: false, scheduledOffset: -5, startedOffset: -2, delay: { minutes: 5, reason: "Equipment calibration needed" } },
  { patient: "Amit Patel", phone: "9876543228", provider: "p8", dept: "rad", service: "rad-xray", status: "checked-in", isWalkIn: true, scheduledOffset: 15 },
];

function mockSeedData() {
  nextVisitId = 100;
  store.visits = [];
  store.eventLog = [];
  store.providers = seedProviders.map((p) => ({ ...p }));
  store.settings = { ...defaultSettings };
  store.users = [
    { id: "u1", name: "Arjun Mehta", phone: "+919876543210", email: "arjun.mehta@example.com", role: "patient" },
  ];

  const now = mockSimNow();

  VISIT_PLAN.forEach((s) => {
    const id = genVisitId();
    const dept = mockDepartments.find((d) => d.id === s.dept);
    const token = genToken(dept.code, s.isWalkIn);
    const scheduled = now + s.scheduledOffset * 60000;
    const service = dept.services.find((sv) => sv.id === s.service);

    store.visits.push({
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
    });
  });

  mockLogEvent("system", null, "Demo data seeded");
  mockRecomputeAllQueues();
  notify();
}

function mockLogEvent(event, visitId, detail) {
  store.eventLog.unshift({ id: Date.now() + Math.random(), time: mockSimNow(), event, visitId, detail });
  if (store.eventLog.length > 100) store.eventLog.length = 100;
}

function mockRecomputeProviderQueue(providerId) {
  const provider = store.providers.find((p) => p.id === providerId);
  if (!provider) return;

  const now = mockSimNow();
  const dept = mockDepartments.find((d) => d.id === provider.department);

  const inService = store.visits.find((v) => v.providerId === providerId && v.status === "in-service");
  const waiting = store.visits
    .filter((v) => v.providerId === providerId && (v.status === "checked-in" || v.status === "booked"))
    .sort((a, b) => {
      if (a.priority && !b.priority) return -1;
      if (!a.priority && b.priority) return 1;
      return a.scheduledTime - b.scheduledTime;
    });

  let currentRemaining = 0;
  if (inService) {
    const elapsed = (now - inService.startedTime) / 60000;
    const totalDuration = inService.serviceDuration + (inService.delay ? inService.delay.minutes : 0);
    currentRemaining = Math.max(0, totalDuration - elapsed);
  }

  let cumulative = currentRemaining;
  waiting.forEach((visit, idx) => {
    visit.position = idx + 1;
    visit.estimatedWait = Math.round(cumulative);

    const reasons = [];
    if (inService && idx === 0) {
      if (inService.delay) {
        reasons.push(`+${inService.delay.minutes} min: ${provider.name}'s current consultation overran — ${inService.delay.reason}`);
      } else if (currentRemaining > 0) {
        reasons.push(`${provider.name} is with a patient (~${Math.round(currentRemaining)} min remaining)`);
      }
    }
    if (idx > 0) reasons.push(`${idx} patient${idx > 1 ? "s" : ""} ahead in queue`);
    if (visit.priority) reasons.push(`Priority: ${visit.priorityReason}`);

    visit.waitReason = reasons.join(". ") || "On track";

    const svc = dept?.services.find((s) => s.id === visit.serviceId);
    cumulative += (svc?.duration || 15) + (svc?.prepTime || 2);
  });
}

function mockRecomputeAllQueues() {
  const providerIds = new Set(store.visits.map((v) => v.providerId));
  providerIds.forEach((pid) => mockRecomputeProviderQueue(pid));
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function mockBookAppointment({ patient, phone, departmentId, serviceId, providerId, scheduledTime }) {
  await delay(300);
  const dept = mockDepartments.find((d) => d.id === departmentId);
  const service = dept.services.find((s) => s.id === serviceId);
  const id = genVisitId();
  const token = genToken(dept.code, false);

  let actualProvider = providerId;
  if (providerId === "any") {
    const deptProviders = store.providers.filter((p) => p.department === departmentId && p.active);
    let minQueue = Infinity;
    deptProviders.forEach((p) => {
      const qLen = store.visits.filter(
        (v) => v.providerId === p.id && (v.status === "booked" || v.status === "checked-in" || v.status === "in-service")
      ).length;
      if (qLen < minQueue) {
        minQueue = qLen;
        actualProvider = p.id;
      }
    });
  }

  const visit = {
    id, token, patient, phone, providerId: actualProvider, departmentId, deptCode: dept.code, serviceId,
    serviceName: service.name, serviceDuration: service.duration, isWalkIn: false, status: "booked",
    scheduledTime, checkedInTime: null, startedTime: null, completedTime: null, cancelledTime: null,
    noShowTime: null, delay: null, priority: false, priorityReason: null, estimatedWait: 0, waitReason: "",
    position: 0, createdAt: mockSimNow(),
  };

  store.visits.push(visit);
  mockLogEvent("booked", id, `${patient} booked ${service.name} with token ${token}`);
  mockRecomputeAllQueues();
  notify();
  return visit;
}

async function mockCreateWalkIn({ patient, phone, departmentId, serviceId, providerId }) {
  await delay(300);
  const dept = mockDepartments.find((d) => d.id === departmentId);
  const service = dept.services.find((s) => s.id === serviceId);
  const id = genVisitId();
  const token = genToken(dept.code, true);

  let actualProvider = providerId;
  if (!providerId || providerId === "auto") {
    const deptProviders = store.providers.filter((p) => p.department === departmentId && p.active);
    let minQueue = Infinity;
    deptProviders.forEach((p) => {
      const qLen = store.visits.filter(
        (v) => v.providerId === p.id && (v.status === "booked" || v.status === "checked-in" || v.status === "in-service")
      ).length;
      if (qLen < minQueue) {
        minQueue = qLen;
        actualProvider = p.id;
      }
    });
  }

  const visit = {
    id, token, patient, phone, providerId: actualProvider, departmentId, deptCode: dept.code, serviceId,
    serviceName: service.name, serviceDuration: service.duration, isWalkIn: true, status: "checked-in",
    scheduledTime: mockSimNow(), checkedInTime: mockSimNow(), startedTime: null, completedTime: null,
    cancelledTime: null, noShowTime: null, delay: null, priority: false, priorityReason: null,
    estimatedWait: 0, waitReason: "", position: 0, createdAt: mockSimNow(),
  };

  store.visits.push(visit);
  mockLogEvent("walk-in", id, `${patient} walked in for ${service.name}, token ${token}`);
  mockRecomputeAllQueues();
  notify();
  return visit;
}

async function mockCheckIn(visitId) {
  await delay(200);
  const visit = store.visits.find((v) => v.id === visitId);
  if (!visit || visit.status !== "booked") return null;
  visit.status = "checked-in";
  visit.checkedInTime = mockSimNow();
  mockLogEvent("checked-in", visitId, `${visit.patient} checked in (${visit.token})`);
  mockRecomputeAllQueues();
  notify();
  return visit;
}

async function mockStartVisit(visitId) {
  await delay(200);
  const visit = store.visits.find((v) => v.id === visitId);
  if (!visit || (visit.status !== "checked-in" && visit.status !== "booked")) return null;
  visit.status = "in-service";
  visit.startedTime = mockSimNow();
  if (!visit.checkedInTime) visit.checkedInTime = mockSimNow();
  mockLogEvent("started", visitId, `${visit.patient} consultation started (${visit.token})`);
  mockRecomputeAllQueues();
  notify();
  return visit;
}

async function mockDelayVisit(visitId, minutes, reason) {
  await delay(200);
  const visit = store.visits.find((v) => v.id === visitId);
  if (!visit || visit.status !== "in-service") return null;
  visit.delay = { minutes, reason };
  mockLogEvent("delayed", visitId, `${visit.patient} delayed +${minutes} min: ${reason}`);
  mockRecomputeAllQueues();
  notify();
  return visit;
}

async function mockCompleteVisit(visitId) {
  await delay(200);
  const visit = store.visits.find((v) => v.id === visitId);
  if (!visit || visit.status !== "in-service") return null;
  visit.status = "completed";
  visit.completedTime = mockSimNow();
  mockLogEvent("completed", visitId, `${visit.patient} consultation completed (${visit.token})`);
  mockRecomputeAllQueues();
  notify();
  return visit;
}

async function mockMarkNoShow(visitId) {
  await delay(200);
  const visit = store.visits.find((v) => v.id === visitId);
  if (!visit || (visit.status !== "booked" && visit.status !== "checked-in")) return null;
  visit.status = "no-show";
  visit.noShowTime = mockSimNow();
  mockLogEvent("no-show", visitId, `${visit.patient} marked no-show (${visit.token})`);
  mockRecomputeAllQueues();
  notify();
  return visit;
}

async function mockCancelVisit(visitId) {
  await delay(200);
  const visit = store.visits.find((v) => v.id === visitId);
  if (!visit || (visit.status !== "booked" && visit.status !== "checked-in")) return null;
  visit.status = "cancelled";
  visit.cancelledTime = mockSimNow();
  mockLogEvent("cancelled", visitId, `${visit.patient} cancelled (${visit.token})`);
  mockRecomputeAllQueues();
  notify();
  return visit;
}

async function mockSetPriority(visitId, reason) {
  await delay(200);
  const visit = store.visits.find((v) => v.id === visitId);
  if (!visit) return null;
  visit.priority = true;
  visit.priorityReason = reason;
  mockLogEvent("priority-set", visitId, `${visit.patient} priority: ${reason}`);
  mockRecomputeAllQueues();
  notify();
  return visit;
}

async function mockRemovePriority(visitId) {
  await delay(200);
  const visit = store.visits.find((v) => v.id === visitId);
  if (!visit) return null;
  visit.priority = false;
  visit.priorityReason = null;
  mockLogEvent("priority-removed", visitId, `${visit.patient} priority removed`);
  mockRecomputeAllQueues();
  notify();
  return visit;
}

async function mockAddProvider(data) {
  await delay(300);
  const id = "p" + (store.providers.length + 1) + "_" + Date.now();
  const provider = { ...data, id, active: true };
  store.providers.push(provider);
  mockLogEvent("provider-added", null, `${data.name} added`);
  notify();
  return provider;
}

async function mockUpdateProvider(id, data) {
  await delay(300);
  const idx = store.providers.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  store.providers[idx] = { ...store.providers[idx], ...data };
  mockLogEvent("provider-updated", null, `${store.providers[idx].name} updated`);
  notify();
  return store.providers[idx];
}

async function mockDeactivateProvider(id) {
  await delay(200);
  const provider = store.providers.find((p) => p.id === id);
  if (!provider) return null;
  provider.active = !provider.active;
  mockLogEvent("provider-toggled", null, `${provider.name} ${provider.active ? "activated" : "deactivated"}`);
  notify();
  return provider;
}

async function mockUpdateSettings(newSettings) {
  await delay(200);
  Object.assign(store.settings, newSettings);
  mockLogEvent("settings-updated", null, "Settings updated");
  notify();
  return store.settings;
}

async function mockUpdateService(deptId, serviceId, data) {
  await delay(200);
  const dept = mockDepartments.find((d) => d.id === deptId);
  if (!dept) return null;
  const svc = dept.services.find((s) => s.id === serviceId);
  if (!svc) return null;
  Object.assign(svc, data);
  mockLogEvent("service-updated", null, `${svc.name} updated`);
  notify();
  return svc;
}

function mockGetVisit(id) {
  return store.visits.find((v) => v.id === id) || null;
}
function mockGetVisitByToken(token) {
  return store.visits.find((v) => v.token === token) || null;
}
function mockGetProviderVisits(providerId) {
  return store.visits
    .filter((v) => v.providerId === providerId)
    .sort((a, b) => {
      if (a.priority && !b.priority) return -1;
      if (!a.priority && b.priority) return 1;
      return a.scheduledTime - b.scheduledTime;
    });
}
function mockGetProviderNowServing(providerId) {
  return store.visits.find((v) => v.providerId === providerId && v.status === "in-service") || null;
}
function mockGetProviderWaiting(providerId) {
  return store.visits
    .filter((v) => v.providerId === providerId && (v.status === "checked-in" || v.status === "booked"))
    .sort((a, b) => {
      if (a.priority && !b.priority) return -1;
      if (!a.priority && b.priority) return 1;
      return a.scheduledTime - b.scheduledTime;
    });
}
function mockGetProviderCompleted(providerId) {
  return store.visits
    .filter((v) => v.providerId === providerId && (v.status === "completed" || v.status === "no-show" || v.status === "cancelled"))
    .sort((a, b) => (b.completedTime || b.noShowTime || b.cancelledTime || 0) - (a.completedTime || a.noShowTime || a.cancelledTime || 0));
}
function mockGetPatientVisits(patientName) {
  return store.visits.filter((v) => v.patient === patientName).sort((a, b) => b.scheduledTime - a.scheduledTime);
}
function mockGetDepartmentProviders(departmentId) {
  return store.providers.filter((p) => p.department === departmentId && p.active);
}
function mockGetSlotAvailability(providerId, dateTimestamp) {
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
      (v) => v.providerId === providerId && v.scheduledTime >= slotTime && v.scheduledTime < slotTime + provider.slotLength * 60000 && v.status !== "cancelled" && v.status !== "no-show"
    ).length;

    const capacity = provider.slotCapacity + provider.overbookLimit;
    slots.push({ time: slotTime, booked, capacity, available: capacity - booked, full: booked >= capacity });
    cursor += provider.slotLength * 60000;
  }
  return slots;
}
function mockGetMetrics() {
  const todayStart = todayBase();
  const todayVisits = store.visits.filter((v) => v.scheduledTime >= todayStart);

  const completed = todayVisits.filter((v) => v.status === "completed");
  const waiting = todayVisits.filter((v) => v.status === "checked-in" || v.status === "booked");
  const inService = todayVisits.filter((v) => v.status === "in-service");
  const delayed = todayVisits.filter((v) => v.delay);
  const noShows = todayVisits.filter((v) => v.status === "no-show");

  const avgWait = completed.length > 0
    ? Math.round(completed.reduce((sum, v) => sum + ((v.startedTime || v.completedTime) - (v.checkedInTime || v.scheduledTime)) / 60000, 0) / completed.length)
    : 0;

  const providerLoad = store.providers.filter((p) => p.active).map((p) => {
    const pVisits = todayVisits.filter((v) => v.providerId === p.id);
    const completedWithTimes = pVisits.filter((v) => v.status === "completed" && v.startedTime && v.checkedInTime);
    return {
      name: p.name.replace("Dr. ", ""),
      total: pVisits.length,
      waiting: pVisits.filter((v) => v.status === "checked-in" || v.status === "booked").length,
      inService: pVisits.filter((v) => v.status === "in-service").length,
      completed: pVisits.filter((v) => v.status === "completed").length,
      avgWait: completedWithTimes.length > 0
        ? Math.round(completedWithTimes.reduce((s, v) => s + (v.startedTime - v.checkedInTime) / 60000, 0) / completedWithTimes.length)
        : 0,
    };
  });

  return { avgWait, delayed: delayed.length, waiting: waiting.length, inService: inService.length, completed: completed.length, noShows: noShows.length, total: todayVisits.length, providerLoad };
}
async function mockCreateAccount({ name, phone, email, password }) {
  await delay(350);
  const id = "u" + (store.users.length + 1) + "_" + Date.now();
  const user = { id, name: name.trim(), phone: phone.trim(), email: email.trim().toLowerCase(), role: "patient", createdAt: mockSimNow() };
  store.users.push(user);
  mockLogEvent("account-created", null, `New patient account created: ${user.name} (${user.phone})`);
  notify();
  return user;
}
function mockGetUserByEmail(email) {
  return store.users.find((u) => u.email === email?.trim().toLowerCase()) || null;
}

// ════════════════════════════════════════════════════════════════════════
// REAL MODE — polling cache backed by the FastAPI backend.
// ════════════════════════════════════════════════════════════════════════

let rDeptFeIdByBackendId = {}; // backend dept id -> 'gm'/'oph'/'ped'/'rad'
let rDeptCodeByBackendId = {}; // backend dept id -> 'GM'/'OPH'/'PED'/'RAD'
let rServiceById = {}; // string service id -> mapped service
let rProviderDeptByBackendId = {}; // string provider id -> backend dept id
let rSimClock = { effectiveMs: Date.now(), isFrozen: false, fetchedAtWall: Date.now() };
let rQueueByProviderId = {}; // string provider id -> raw QueueSnapshotOut

function realSimNow() {
  if (rSimClock.isFrozen) return rSimClock.effectiveMs;
  return rSimClock.effectiveMs + (Date.now() - rSimClock.fetchedAtWall);
}
function realIsClockFrozen() {
  return rSimClock.isFrozen;
}

function dateStrFromMs(ms) {
  const d = new Date(ms);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function refreshCatalog() {
  const [depts, services, providers] = await Promise.all([
    api.get("/api/departments"),
    api.get("/api/services"),
    api.get("/api/providers"),
  ]);

  const mappedServices = services.map(mapService);
  rServiceById = {};
  mappedServices.forEach((s) => (rServiceById[s.id] = s));

  rDeptFeIdByBackendId = {};
  rDeptCodeByBackendId = {};
  depts.forEach((d) => {
    rDeptFeIdByBackendId[d.id] = d.code.toLowerCase();
    rDeptCodeByBackendId[d.id] = d.code;
  });

  const mappedDepts = depts.map((d) => mapDepartment(d, mappedServices));
  departments.length = 0;
  departments.push(...mappedDepts);

  rProviderDeptByBackendId = {};
  const mappedProviders = providers.map((p) => {
    rProviderDeptByBackendId[String(p.id)] = p.department_id;
    return mapProvider(p, rDeptFeIdByBackendId);
  });
  store.providers.length = 0;
  store.providers.push(...mappedProviders);
}

function visitMapCtx() {
  return {
    serviceById: rServiceById,
    departmentCodeByBackendId: rDeptCodeByBackendId,
    providerDeptByBackendId: rProviderDeptByBackendId,
  };
}

function overlayQueueSnapshot(rawSnapshot) {
  if (!rawSnapshot) return;
  const byId = new Map(store.visits.map((v) => [v.id, v]));
  if (rawSnapshot.now_serving) {
    const v = byId.get(String(rawSnapshot.now_serving.visit_id));
    if (v) Object.assign(v, mapNowServingPatch(rawSnapshot.now_serving));
  }
  (rawSnapshot.queue || []).forEach((qv) => {
    const v = byId.get(String(qv.visit_id));
    if (v) Object.assign(v, mapQueueVisitPatch(qv));
  });
}

async function refreshQueueSnapshotsForProviders(providerIds) {
  const results = await Promise.all(
    providerIds.map((id) =>
      api.get(`/api/queue/providers/${id}`).catch(() => null)
    )
  );
  rQueueByProviderId = {};
  results.forEach((snap, i) => {
    if (snap) {
      rQueueByProviderId[providerIds[i]] = snap;
      overlayQueueSnapshot(snap);
    }
  });
}

async function refreshVisitsAndQueues(session) {
  const page = await api.get("/api/appointments", { page_size: 200 });
  const mapped = page.items.map((v) => mapVisit(v, visitMapCtx()));
  store.visits.length = 0;
  store.visits.push(...mapped);

  if (session.role === "provider" && session.providerId) {
    await refreshQueueSnapshotsForProviders([session.providerId]);
  } else if (session.role === "receptionist" || session.role === "admin") {
    const activeIds = store.providers.filter((p) => p.active).map((p) => p.id);
    await refreshQueueSnapshotsForProviders(activeIds);
  }
  // Patient role has no authorized access to GET /api/queue/providers/{id}
  // (receptionist/provider/admin only) — patients' own estimated_wait_min/
  // eta_reason already come straight from GET /api/appointments, just
  // without a live `position` number. See final report gap list.
}

async function refreshSimClock(session) {
  if (session.role !== "admin") {
    // Non-admin roles have no authorized way to read the simulated clock
    // (GET /api/sim/clock is admin-only) — fall back to real wall time.
    rSimClock = { effectiveMs: Date.now(), isFrozen: false, fetchedAtWall: Date.now() };
    return;
  }
  try {
    const clock = await api.get("/api/sim/clock");
    rSimClock = {
      effectiveMs: Date.parse(clock.effective_time),
      isFrozen: clock.is_frozen,
      fetchedAtWall: Date.now(),
    };
  } catch {
    // keep last known value
  }
}

async function refreshEventsAndSettings(session) {
  if (session.role !== "admin") return;
  const [events, settings] = await Promise.all([
    api.get("/api/events", { page_size: 25, order: "desc" }),
    api.get("/api/admin/settings"),
  ]);
  store.eventLog.length = 0;
  store.eventLog.push(...events.items.map(mapEvent));
  Object.assign(store.settings, mapSettings(settings));
}

async function refreshMetricsCache(session) {
  if (!["receptionist", "provider", "admin"].includes(session.role)) return;
  try {
    const m = await api.get("/api/metrics");
    rLastMetrics = mapMetrics(m);
  } catch {
    // ignore
  }
}

let rLastMetrics = { avgWait: 0, delayed: 0, waiting: 0, inService: 0, completed: 0, noShows: 0, total: 0, providerLoad: [] };

let rCatalogLoaded = false;

export async function refreshRealCacheNow() {
  const session = getApiSession();
  if (!session?.token) return;
  try {
    if (!rCatalogLoaded) {
      await refreshCatalog();
      rCatalogLoaded = true;
    }
    await Promise.all([
      refreshVisitsAndQueues(session),
      refreshSimClock(session),
      refreshEventsAndSettings(session),
      refreshMetricsCache(session),
    ]);
    notify();
  } catch {
    // A single failed poll tick shouldn't break the loop; next tick retries.
  }
}

let rPollStarted = false;
function startRealPolling() {
  if (USE_MOCKS || rPollStarted) return;
  rPollStarted = true;
  const tick = () => {
    if (typeof document === "undefined" || document.visibilityState !== "hidden") {
      refreshRealCacheNow();
    }
  };
  tick();
  setInterval(tick, POLL_INTERVAL_MS);
}

function realGetVisit(id) {
  return store.visits.find((v) => v.id === id) || null;
}
function realGetProviderVisits(providerId) {
  return store.visits.filter((v) => v.providerId === providerId).sort((a, b) => {
    if (a.priority && !b.priority) return -1;
    if (!a.priority && b.priority) return 1;
    return a.scheduledTime - b.scheduledTime;
  });
}
function realGetProviderNowServing(providerId) {
  return store.visits.find((v) => v.providerId === providerId && v.status === "in-service") || null;
}
function realGetProviderWaiting(providerId) {
  return store.visits
    .filter((v) => v.providerId === providerId && (v.status === "checked-in" || v.status === "booked"))
    .sort((a, b) => (a.position || 0) - (b.position || 0));
}
function realGetProviderCompleted(providerId) {
  return store.visits
    .filter((v) => v.providerId === providerId && (v.status === "completed" || v.status === "no-show" || v.status === "cancelled"))
    .sort((a, b) => (b.completedTime || b.noShowTime || b.cancelledTime || 0) - (a.completedTime || a.noShowTime || a.cancelledTime || 0));
}
function realGetPatientVisits() {
  // The backend already scopes GET /api/appointments to the caller's own
  // patient_id for role=patient, so the whole cache IS "my visits" — the
  // patientName argument (kept for signature compatibility) is unused.
  return [...store.visits].sort((a, b) => b.scheduledTime - a.scheduledTime);
}
function realGetDepartmentProviders(departmentId) {
  return store.providers.filter((p) => p.department === departmentId && p.active);
}
async function realGetSlotAvailability(providerId, dateTimestamp) {
  const provider = store.providers.find((p) => p.id === providerId);
  if (!provider) return [];
  const dateStr = dateStrFromMs(dateTimestamp);
  const slots = await api.get(`/api/providers/${providerId}/slots`, { date: dateStr });
  return slots.map(mapSlot);
}
function realGetMetrics() {
  return rLastMetrics;
}
function realGetUserByEmail() {
  return null; // No backend lookup-by-email exists beyond login itself.
}

async function findSlotForProviderAtTime(providerId, scheduledTime) {
  const slots = await realGetSlotAvailability(providerId, scheduledTime);
  return slots.find((s) => s.time === scheduledTime && !s.full) || null;
}

async function realBookAppointment({ departmentId, serviceId, providerId, scheduledTime }) {
  const session = getApiSession();
  let targetProviderId = providerId;
  let slot = null;

  if (providerId === "any") {
    const candidates = store.providers.filter((p) => p.department === departmentId && p.active);
    const withCapacity = [];
    for (const p of candidates) {
      const s = await findSlotForProviderAtTime(p.id, scheduledTime);
      if (s) withCapacity.push({ provider: p, slot: s });
    }
    if (!withCapacity.length) throw new Error("No provider has capacity at that time. Please pick another slot.");
    // Approximate "shortest current wait" via live queue length — the
    // engine's true hypothetical-wait routing only exists server-side for
    // walk-ins (see final report gap list).
    withCapacity.sort((a, b) => realGetProviderWaiting(a.provider.id).length - realGetProviderWaiting(b.provider.id).length);
    targetProviderId = withCapacity[0].provider.id;
    slot = withCapacity[0].slot;
  } else {
    slot = await findSlotForProviderAtTime(providerId, scheduledTime);
    if (!slot) throw new Error("That slot is no longer available. Please pick another.");
  }

  const body = {
    patient_id: Number(session.patientId),
    provider_id: Number(targetProviderId),
    service_id: Number(serviceId),
    slot_id: slot._id,
  };
  const visit = await api.post("/api/appointments", body);
  await refreshRealCacheNow();
  const mapped = mapVisit(visit, visitMapCtx());
  mapped.patient = session.name;
  return mapped;
}

async function realCreateWalkIn({ patient, phone, departmentId, serviceId, providerId }) {
  const dept = departments.find((d) => d.id === departmentId);
  const body = {
    full_name: patient,
    phone,
    department_id: dept?._backendId,
    service_id: Number(serviceId),
  };
  if (providerId && providerId !== "auto") body.provider_id = Number(providerId);

  const resp = await api.post("/api/walk-ins", body);
  await refreshRealCacheNow();

  const matchedProvider = store.providers.find((p) => p.name === resp.provider_name);
  return {
    id: undefined,
    token: resp.token_no,
    patient,
    phone,
    providerId: matchedProvider?.id || "",
    departmentId,
    serviceId,
    serviceName: rServiceById[serviceId]?.name || "",
    isWalkIn: true,
    status: "checked-in",
    estimatedWait: resp.estimated_wait_min,
    waitReason: resp.eta_reason,
    position: resp.queue_position,
  };
}

async function realCheckIn(visitId) {
  const visit = await api.post(`/api/visits/${visitId}/check-in`);
  await refreshRealCacheNow();
  return mapVisit(visit, visitMapCtx());
}
async function realStartVisit(visitId) {
  const visit = await api.post(`/api/visits/${visitId}/start`);
  await refreshRealCacheNow();
  return mapVisit(visit, visitMapCtx());
}
async function realDelayVisit(visitId, minutes, reason) {
  const visit = await api.post(`/api/visits/${visitId}/delay`, { minutes, reason });
  await refreshRealCacheNow();
  return mapVisit(visit, visitMapCtx());
}
async function realCompleteVisit(visitId) {
  const visit = await api.post(`/api/visits/${visitId}/complete`);
  await refreshRealCacheNow();
  return mapVisit(visit, visitMapCtx());
}
async function realMarkNoShow(visitId) {
  const visit = await api.post(`/api/visits/${visitId}/no-show`);
  await refreshRealCacheNow();
  return mapVisit(visit, visitMapCtx());
}
async function realCancelVisit(visitId) {
  const visit = await api.post(`/api/appointments/${visitId}/cancel`);
  await refreshRealCacheNow();
  return mapVisit(visit, visitMapCtx());
}
async function realSetPriority(visitId, reason) {
  const visit = await api.post(`/api/visits/${visitId}/priority`, { flag: true, reason });
  await refreshRealCacheNow();
  return mapVisit(visit, visitMapCtx());
}
async function realRemovePriority(visitId) {
  const visit = await api.post(`/api/visits/${visitId}/priority`, { flag: false, reason: "Priority removed" });
  await refreshRealCacheNow();
  return mapVisit(visit, visitMapCtx());
}

async function realAddProvider(data) {
  const dept = departments.find((d) => d.id === data.department);
  const { shift_start, shift_end } = parseShift(data.shift);
  const body = {
    department_id: dept?._backendId,
    name: data.name,
    kind: providerKindToBackend(data.kind),
    room_label: data.room,
    shift_start,
    shift_end,
    slot_length_min: data.slotLength,
    slot_capacity: data.slotCapacity,
    overbook_limit: data.overbookLimit,
  };
  const provider = await api.post("/api/admin/providers", body);
  await refreshCatalog();
  notify();
  return mapProvider(provider, rDeptFeIdByBackendId);
}

async function realUpdateProvider(id, data) {
  const body = {};
  if (data.name !== undefined) body.name = data.name;
  if (data.room !== undefined) body.room_label = data.room;
  if (data.slotLength !== undefined) body.slot_length_min = data.slotLength;
  if (data.slotCapacity !== undefined) body.slot_capacity = data.slotCapacity;
  if (data.overbookLimit !== undefined) body.overbook_limit = data.overbookLimit;
  if (data.shift !== undefined) Object.assign(body, parseShift(data.shift));

  const provider = await api.put(`/api/admin/providers/${id}`, body);
  await refreshCatalog();
  notify();
  return mapProvider(provider, rDeptFeIdByBackendId);
}

async function realDeactivateProvider(id) {
  const provider = await api.patch(`/api/admin/providers/${id}/active`);
  await refreshCatalog();
  notify();
  return mapProvider(provider, rDeptFeIdByBackendId);
}

async function realUpdateSettings(newSettings) {
  const settings = await api.put("/api/admin/settings", settingsToBackend(newSettings));
  Object.assign(store.settings, mapSettings(settings));
  notify();
  return store.settings;
}

async function realUpdateService(_deptId, serviceId, data) {
  const body = {};
  if (data.name !== undefined) body.name = data.name;
  if (data.duration !== undefined) body.default_duration_min = data.duration;
  if (data.prepTime !== undefined) body.prep_time_min = data.prepTime;
  if (data.active !== undefined) body.is_active = data.active;
  const service = await api.put(`/api/admin/services/${serviceId}`, body);
  await refreshCatalog();
  notify();
  return mapService(service);
}

async function realCreateAccount({ name, phone, email, password }) {
  const resp = await api.postPublic("/api/auth/register", { name, phone, email, password });
  return {
    id: String(resp.user_id),
    name,
    phone,
    email: email.trim().toLowerCase(),
    role: "patient",
    token: resp.access_token,
    userId: String(resp.user_id),
    patientId: resp.patient_id != null ? String(resp.patient_id) : undefined,
    patientType: resp.patient_type || "out",
    createdAt: Date.now(),
  };
}

// Real login — new capability the mock never had (login was pure local state).
export async function apiLogin(username, password, { displayName } = {}) {
  const resp = await api.postPublic("/api/auth/login", { username, password });
  const session = {
    role: resp.role,
    token: resp.access_token,
    userId: String(resp.user_id),
    providerId: resp.provider_id != null ? String(resp.provider_id) : undefined,
    patientId: resp.patient_id != null ? String(resp.patient_id) : undefined,
    patientType: resp.patient_type || undefined,
    name: displayName || username,
  };
  if (resp.role === "provider" && resp.provider_id != null) {
    try {
      const provider = await api.getPublic(`/api/providers/${resp.provider_id}`);
      session.name = provider.name;
    } catch {
      // keep the fallback display name
    }
  }
  return session;
}

// Public token status — always a direct fetch, never the cache (per spec).
export async function fetchPublicStatus(tokenNo) {
  return api.getPublic(`/api/status/${encodeURIComponent(tokenNo)}`);
}

// Public — in/out-patient booking windows + lunch break, for slot color-coding.
const MOCK_BOOKING_WINDOWS = {
  in_patient_window_start: "07:00", in_patient_window_end: "11:00",
  out_patient_window_start: "11:00", out_patient_window_end: "19:00",
  lunch_break_start: "13:00", lunch_break_end: "14:00",
};
export async function fetchBookingWindows() {
  if (USE_MOCKS) return MOCK_BOOKING_WINDOWS;
  return api.getPublic("/api/booking-windows");
}

// ── Prescriptions — new feature, not part of the original mock surface, so
// these are direct (non-cached) calls rather than dispatched sync getters. ──
export async function addPrescription(visitId, { medications, notes }) {
  if (USE_MOCKS) {
    return { id: Date.now(), visitId, medications, notes, providerName: "Dr. Priya Sharma", createdAt: Date.now() };
  }
  const rx = await api.post(`/api/visits/${visitId}/prescriptions`, { medications, notes });
  return {
    id: rx.id,
    visitId: String(rx.visit_id),
    medications: rx.medications,
    notes: rx.notes,
    providerName: rx.provider_name,
    createdAt: Date.parse(rx.created_at),
  };
}

export async function fetchVisitPrescriptions(visitId) {
  if (USE_MOCKS) return [];
  const items = await api.get(`/api/visits/${visitId}/prescriptions`);
  return items.map((rx) => ({
    id: rx.id,
    visitId: String(rx.visit_id),
    medications: rx.medications,
    notes: rx.notes,
    providerName: rx.provider_name,
    createdAt: Date.parse(rx.created_at),
  }));
}

export async function fetchPatientPrescriptions(patientId) {
  if (USE_MOCKS) return [];
  const items = await api.get(`/api/patients/${patientId}/prescriptions`);
  return items.map((rx) => ({
    id: rx.id,
    visitId: String(rx.visit_id),
    medications: rx.medications,
    notes: rx.notes,
    providerName: rx.provider_name,
    createdAt: Date.parse(rx.created_at),
  }));
}

startRealPolling();

// ════════════════════════════════════════════════════════════════════════
// PUBLIC EXPORTS — one name per screen-facing function, dispatching on mode.
// ════════════════════════════════════════════════════════════════════════

export function simNow() {
  return USE_MOCKS ? mockSimNow() : realSimNow();
}
export function simDate() {
  return new Date(simNow());
}
export function isClockFrozen() {
  return USE_MOCKS ? mockIsClockFrozen() : realIsClockFrozen();
}
export async function advanceClock(minutes) {
  if (USE_MOCKS) return mockAdvanceClock(minutes);
  await api.post("/api/sim/advance", { minutes });
  await refreshRealCacheNow();
}
export async function freezeClock() {
  if (USE_MOCKS) return mockFreezeClock();
  await api.post("/api/sim/freeze");
  await refreshRealCacheNow();
}
export async function resumeClock() {
  if (USE_MOCKS) return mockResumeClock();
  await api.post("/api/sim/resume");
  await refreshRealCacheNow();
}
export async function resetClock() {
  if (USE_MOCKS) return mockResetClock();
  await api.post("/api/sim/reset");
  await refreshRealCacheNow();
}
export async function seedData() {
  if (USE_MOCKS) return mockSeedData();
  await api.post("/api/sim/seed", { scenario: "demo" });
  rCatalogLoaded = false;
  await refreshRealCacheNow();
}

export async function bookAppointment(args) {
  return USE_MOCKS ? mockBookAppointment(args) : realBookAppointment(args);
}
export async function createWalkIn(args) {
  return USE_MOCKS ? mockCreateWalkIn(args) : realCreateWalkIn(args);
}
export async function checkIn(visitId) {
  return USE_MOCKS ? mockCheckIn(visitId) : realCheckIn(visitId);
}
export async function startVisit(visitId) {
  return USE_MOCKS ? mockStartVisit(visitId) : realStartVisit(visitId);
}
export async function delayVisit(visitId, minutes, reason) {
  return USE_MOCKS ? mockDelayVisit(visitId, minutes, reason) : realDelayVisit(visitId, minutes, reason);
}
export async function completeVisit(visitId) {
  return USE_MOCKS ? mockCompleteVisit(visitId) : realCompleteVisit(visitId);
}
export async function markNoShow(visitId) {
  return USE_MOCKS ? mockMarkNoShow(visitId) : realMarkNoShow(visitId);
}
export async function cancelVisit(visitId) {
  return USE_MOCKS ? mockCancelVisit(visitId) : realCancelVisit(visitId);
}
export async function setPriority(visitId, reason) {
  return USE_MOCKS ? mockSetPriority(visitId, reason) : realSetPriority(visitId, reason);
}
export async function removePriority(visitId) {
  return USE_MOCKS ? mockRemovePriority(visitId) : realRemovePriority(visitId);
}
export async function addProvider(data) {
  return USE_MOCKS ? mockAddProvider(data) : realAddProvider(data);
}
export async function updateProvider(id, data) {
  return USE_MOCKS ? mockUpdateProvider(id, data) : realUpdateProvider(id, data);
}
export async function deactivateProvider(id) {
  return USE_MOCKS ? mockDeactivateProvider(id) : realDeactivateProvider(id);
}
export async function updateSettings(newSettings) {
  return USE_MOCKS ? mockUpdateSettings(newSettings) : realUpdateSettings(newSettings);
}
export async function updateService(deptId, serviceId, data) {
  return USE_MOCKS ? mockUpdateService(deptId, serviceId, data) : realUpdateService(deptId, serviceId, data);
}
export async function createAccount(args) {
  return USE_MOCKS ? mockCreateAccount(args) : realCreateAccount(args);
}

export function getVisit(id) {
  return USE_MOCKS ? mockGetVisit(id) : realGetVisit(id);
}
export function getVisitByToken(token) {
  // Real mode: synchronous cache lookup only (best-effort); PublicStatus.jsx
  // uses fetchPublicStatus() directly for the authoritative, unauthenticated read.
  return USE_MOCKS ? mockGetVisitByToken(token) : store.visits.find((v) => v.token === token) || null;
}
export function getProviderVisits(providerId) {
  return USE_MOCKS ? mockGetProviderVisits(providerId) : realGetProviderVisits(providerId);
}
export function getProviderNowServing(providerId) {
  return USE_MOCKS ? mockGetProviderNowServing(providerId) : realGetProviderNowServing(providerId);
}
export function getProviderWaiting(providerId) {
  return USE_MOCKS ? mockGetProviderWaiting(providerId) : realGetProviderWaiting(providerId);
}
export function getProviderCompleted(providerId) {
  return USE_MOCKS ? mockGetProviderCompleted(providerId) : realGetProviderCompleted(providerId);
}
export function getPatientVisits(patientName) {
  return USE_MOCKS ? mockGetPatientVisits(patientName) : realGetPatientVisits(patientName);
}
export function getDepartmentProviders(departmentId) {
  return USE_MOCKS ? mockGetDepartmentProviders(departmentId) : realGetDepartmentProviders(departmentId);
}
export async function getSlotAvailability(providerId, dateTimestamp) {
  return USE_MOCKS ? mockGetSlotAvailability(providerId, dateTimestamp) : realGetSlotAvailability(providerId, dateTimestamp);
}
export function getMetrics() {
  return USE_MOCKS ? mockGetMetrics() : realGetMetrics();
}
export function getUserByEmail(email) {
  return USE_MOCKS ? mockGetUserByEmail(email) : realGetUserByEmail(email);
}

export function recomputeAllQueues() {
  if (USE_MOCKS) mockRecomputeAllQueues();
}

if (USE_MOCKS) mockSeedData();
