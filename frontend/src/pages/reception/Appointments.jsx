import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { store, departments } from "../../mocks/store";
import { useStoreRefresh } from "../../hooks/useQueueStore";
import { 
  StatusPill, 
  SourceBadge, 
  WaitBadge, 
  TokenDisplay,
  PriorityBadge,
  EmptyState
} from "../../components/shared";
import { formatTime, formatDate } from "../../lib/utils";
import { Calendar, ExternalLink, Filter } from "lucide-react";

const FILTERS = {
  all: "All Visits",
  booked: "Booked",
  "checked-in": "Checked In",
  "in-service": "In Service",
  completed: "Completed",
  cancelled_noshow: "No-Show / Cancelled"
};

export default function Appointments() {
  useStoreRefresh();
  
  const [filter, setFilter] = useState("all");
  const allVisits = store.visits;
  
  const filteredVisits = useMemo(() => {
    let list = [...allVisits];
    
    if (filter === "cancelled_noshow") {
      list = list.filter(v => v.status === "cancelled" || v.status === "no-show");
    } else if (filter !== "all") {
      list = list.filter(v => v.status === filter);
    }
    
    // Sort by scheduled time ascending
    list.sort((a, b) => (a.scheduledTime || a.createdAt) - (b.scheduledTime || b.createdAt));
    return list;
  }, [allVisits, filter]);
  
  const counts = useMemo(() => {
    const c = { all: allVisits.length, cancelled_noshow: 0 };
    Object.keys(FILTERS).forEach(k => {
      if (k !== 'all' && k !== 'cancelled_noshow') c[k] = 0;
    });
    
    allVisits.forEach(v => {
      if (c[v.status] !== undefined) {
        c[v.status]++;
      }
      if (v.status === 'cancelled' || v.status === 'no-show') {
        c.cancelled_noshow++;
      }
    });
    
    return c;
  }, [allVisits]);

  const getProvider = (id) => {
    return store.providers.find(prov => prov.id === id);
  };

  const getDept = (id) => {
    return departments.find(dept => dept.id === id);
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">Clinic Appointment Roster</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            Complete master list of booked appointments and walk-in clinic tokens.
          </p>
        </div>
        <div className="text-xs text-ink-muted bg-canvas border border-hairline px-3 py-1.5 rounded-md flex items-center gap-1.5 self-start">
          <Filter size={13} />
          <span>{allVisits.length} total visits today</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-hairline overflow-x-auto gap-1 scrollbar-hide">
        {Object.entries(FILTERS).map(([key, label]) => {
          const isSelected = filter === key;
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
                isSelected
                  ? "border-brand-700 text-brand-700 bg-brand-100/50"
                  : "border-transparent text-ink-muted hover:text-ink hover:border-hairline"
              }`}
            >
              <span>{label}</span>
              <span className={`py-0.5 px-2 rounded-full text-[11px] tabular-nums font-bold ${
                isSelected ? "bg-brand-700 text-white" : "bg-canvas text-ink-muted"
              }`}>
                {counts[key] || 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* Roster Table Card */}
      <div className="card overflow-hidden">
        {filteredVisits.length === 0 ? (
          <div className="py-16">
            <EmptyState 
              icon={Calendar}
              title="No Appointments in Category" 
              description={`There are currently no visits with status: ${FILTERS[filter]}.`} 
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-hairline bg-canvas text-xs uppercase tracking-wider text-ink-muted font-semibold">
                  <th className="py-3 px-4">Token</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Department & Service</th>
                  <th className="py-3 px-4">Provider / Room</th>
                  <th className="py-3 px-4">Scheduled Slot</th>
                  <th className="py-3 px-4">Source & Status</th>
                  <th className="py-3 px-4">Wait Estimate</th>
                  <th className="py-3 px-4 text-right">Departure Board</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {filteredVisits.map((visit) => {
                  const provider = getProvider(visit.providerId);
                  const dept = getDept(visit.departmentId);
                  const isWaiting = visit.status === 'booked' || visit.status === 'checked-in';

                  return (
                    <tr key={visit.id} className="hover:bg-canvas/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <TokenDisplay token={visit.token} size="sm" />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-ink">{visit.patient}</div>
                        <div className="text-xs text-ink-muted font-mono">{visit.phone}</div>
                        {visit.priority && (
                          <div className="mt-1">
                            <PriorityBadge reason={visit.priorityReason} />
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-ink text-xs">{dept?.name || visit.deptCode}</div>
                        <div className="text-xs text-ink-muted">{visit.serviceName} ({visit.serviceDuration}m)</div>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <div className="font-medium text-ink">{provider?.name || "Assigned Provider"}</div>
                        <div className="text-ink-muted">{provider?.room}</div>
                      </td>
                      <td className="py-3.5 px-4 tabular-nums text-xs">
                        <div className="font-medium text-ink">{formatTime(visit.scheduledTime)}</div>
                        <div className="text-ink-muted">{formatDate(visit.scheduledTime)}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1.5 items-start">
                          <StatusPill status={visit.status} delay={visit.delay} />
                          <SourceBadge isWalkIn={visit.isWalkIn} />
                        </div>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        {isWaiting ? (
                          <WaitBadge minutes={visit.estimatedWait} reason={visit.waitReason} />
                        ) : (
                          <span className="text-xs text-ink-muted">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          to={`/status/${visit.token}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-xs text-brand-700 font-semibold hover:underline"
                        >
                          View <ExternalLink size={12} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
