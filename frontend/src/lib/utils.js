// Format a timestamp as Asia/Kolkata time string
export function formatTime(timestamp) {
  if (!timestamp) return "—";
  return new Date(timestamp).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatDate(timestamp) {
  if (!timestamp) return "—";
  return new Date(timestamp).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(timestamp) {
  if (!timestamp) return "—";
  return `${formatDate(timestamp)} ${formatTime(timestamp)}`;
}

export function formatWaitMinutes(minutes) {
  if (minutes <= 0) return "Now";
  if (minutes < 60) return `~${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `~${h}h ${m}m`;
}

export function getElapsedMinutes(startTime, now) {
  if (!startTime) return 0;
  return Math.max(0, Math.round((now - startTime) / 60000));
}

// Status config: label, color class, dot color, icon name
export const STATUS_CONFIG = {
  booked: { label: "Booked", color: "text-status-waiting", bg: "bg-status-waiting/15", dot: "bg-status-waiting", icon: "Clock" },
  "checked-in": { label: "Checked In", color: "text-status-active", bg: "bg-status-active/15", dot: "bg-status-active", icon: "CheckCircle" },
  "in-service": { label: "In Service", color: "text-status-inservice", bg: "bg-status-inservice/15", dot: "bg-status-inservice", icon: "UserCheck" },
  delayed: { label: "Delayed", color: "text-status-delayed", bg: "bg-status-delayed/15", dot: "bg-status-delayed", icon: "AlertTriangle" },
  completed: { label: "Completed", color: "text-status-inservice", bg: "bg-status-inservice/10", dot: "bg-status-inservice", icon: "CheckCircle2" },
  "no-show": { label: "No Show", color: "text-status-noshow", bg: "bg-status-noshow/15", dot: "bg-status-noshow", icon: "UserX" },
  cancelled: { label: "Cancelled", color: "text-status-noshow", bg: "bg-status-noshow/10", dot: "bg-status-noshow", icon: "XCircle" },
};

export const DEMO_PATIENT = "Arjun Mehta";
export const DEMO_PATIENT_PHONE = "9876543210";

export const ROLES = {
  patient: { label: "Patient", home: "/patient/dashboard" },
  receptionist: { label: "Receptionist", home: "/reception/queue" },
  provider: { label: "Provider", home: "/provider/queue" },
  admin: { label: "Admin", home: "/admin/overview" },
};

export const DEMO_ACCOUNTS = [
  { role: "patient", name: "Arjun Mehta", subtitle: "Patient" },
  { role: "receptionist", name: "Priya Receptionist", subtitle: "Front Desk" },
  { role: "provider", name: "Dr. Priya Sharma", subtitle: "General Medicine" },
  { role: "admin", name: "Admin User", subtitle: "System Admin" },
];
