import { STATUS_CONFIG } from "../lib/utils";
import { Clock, CheckCircle, UserCheck, AlertTriangle, CheckCircle2, UserX, XCircle, Star } from "lucide-react";

const iconMap = {
  Clock, CheckCircle, UserCheck, AlertTriangle, CheckCircle2, UserX, XCircle,
};

export function StatusPill({ status, delay }) {
  const displayStatus = status === "in-service" && delay ? "delayed" : status;
  const config = STATUS_CONFIG[displayStatus] || STATUS_CONFIG.booked;
  const Icon = iconMap[config.icon];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.color} ${config.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {Icon && <Icon size={12} />}
      {config.label}
    </span>
  );
}

export function PriorityBadge({ reason }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-status-priority bg-status-priority/15" title={reason}>
      <Star size={11} fill="currentColor" />
      Priority
    </span>
  );
}

export function SourceBadge({ isWalkIn }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
      isWalkIn ? "text-status-delayed bg-status-delayed/10" : "text-brand-700 bg-brand-100"
    }`}>
      {isWalkIn ? "Walk-in" : "Appointment"}
    </span>
  );
}

export function WaitBadge({ minutes, reason }) {
  if (minutes === undefined || minutes === null) return null;

  const label = minutes <= 0 ? "Next up" : `~${minutes} min`;
  return (
    <div className="flex flex-col">
      <span className="text-sm font-semibold tabular-nums text-ink">{label}</span>
      {reason && <span className="text-xs text-ink-muted leading-tight max-w-xs truncate" title={reason}>{reason}</span>}
    </div>
  );
}

export function TokenDisplay({ token, size = "md" }) {
  const sizes = {
    sm: "text-lg font-bold",
    md: "text-2xl font-bold",
    lg: "text-5xl font-bold",
    xl: "text-[96px] leading-none font-bold",
    xxl: "text-[140px] leading-none font-bold",
  };
  return (
    <span className={`${sizes[size]} tabular-nums text-brand-700 tracking-tight`}>
      {token}
    </span>
  );
}

export function Skeleton({ className = "" }) {
  return (
    <div className={`animate-pulse bg-hairline rounded ${className}`} />
  );
}

export function SkeletonRows({ rows = 3 }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3 items-center">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 flex-1" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {Icon && <Icon size={48} className="text-hairline mb-4" strokeWidth={1.5} />}
      <h3 className="text-lg font-semibold text-ink mb-1">{title}</h3>
      <p className="text-sm text-ink-muted max-w-sm">{description}</p>
    </div>
  );
}

export function LiveIndicator({ color = "accent-amber" }) {
  const isGreen = color === "status-inservice";
  const textColor = isGreen ? "text-status-inservice" : "text-accent-amber";
  const dotColor = isGreen ? "bg-status-inservice" : "bg-accent-amber";

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${textColor}`}>
      <span className="relative flex h-2 w-2">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${dotColor} opacity-75`} />
        <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColor}`} />
      </span>
      Live
    </span>
  );
}

export function Modal({ open, onClose, title, children, maxWidth = "max-w-md" }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-ink/30" onClick={onClose} />
      <div className={`relative card p-6 ${maxWidth} w-full mx-4`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-ink">{title}</h3>
          <button onClick={onClose} className="text-ink-muted hover:text-ink p-1">
            <XCircle size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
