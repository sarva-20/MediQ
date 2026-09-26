import React, { useState } from "react";
import { 
  store, 
  getProviderNowServing, 
  getProviderWaiting, 
  checkIn, 
  cancelVisit, 
  markNoShow, 
  setPriority, 
  removePriority 
} from "../../mocks/store";
import { useStoreRefresh, useSimClock, addToast } from "../../hooks/useQueueStore";
import { useLang } from "../../lib/i18n";
import { getElapsedMinutes, formatTime, formatWaitMinutes } from "../../lib/utils";
import { 
  StatusPill, 
  PriorityBadge, 
  SourceBadge, 
  WaitBadge, 
  TokenDisplay, 
  EmptyState, 
  Modal 
} from "../../components/shared";
import { 
  Clock, 
  UserX, 
  XCircle, 
  Star, 
  StarOff, 
  CheckCircle2, 
  Stethoscope, 
  Users, 
  ArrowRight,
  AlertTriangle 
} from "lucide-react";

export default function QueueBoard() {
  useStoreRefresh(); // automatically triggers re-render on any store pub/sub event
  const { now: currentTime } = useSimClock();
  const { t } = useLang();
  
  const providers = store.providers.filter(p => p.active);
  const [selectedProviderId, setSelectedProviderId] = useState(providers[0]?.id || "all");
  
  // Priority modal state
  const [priorityModalOpen, setPriorityModalOpen] = useState(false);
  const [priorityVisit, setPriorityVisit] = useState(null);
  const [priorityReason, setPriorityReason] = useState("");

  const handleCheckIn = async (visitId) => {
    try {
      await checkIn(visitId);
      addToast("Patient checked in successfully");
    } catch (err) {
      addToast(err.message || "Failed to check in", "error");
    }
  };

  const handleCancel = async (visitId) => {
    try {
      await cancelVisit(visitId);
      addToast("Visit cancelled");
    } catch (err) {
      addToast(err.message || "Failed to cancel visit", "error");
    }
  };

  const handleNoShow = async (visitId) => {
    try {
      await markNoShow(visitId);
      addToast("Marked as no-show");
    } catch (err) {
      addToast(err.message || "Failed to mark no-show", "error");
    }
  };

  const handleSetPriority = async () => {
    if (!priorityReason.trim() || !priorityVisit) return;
    try {
      await setPriority(priorityVisit.id, priorityReason.trim());
      addToast("Priority status updated with reason");
      setPriorityModalOpen(false);
      setPriorityReason("");
      setPriorityVisit(null);
    } catch (err) {
      addToast(err.message || "Failed to set priority", "error");
    }
  };

  const handleRemovePriority = async (visitId) => {
    try {
      await removePriority(visitId);
      addToast("Priority removed");
    } catch (err) {
      addToast(err.message || "Failed to remove priority", "error");
    }
  };

  const openPriorityModal = (visit) => {
    setPriorityVisit(visit);
    setPriorityReason("");
    setPriorityModalOpen(true);
  };

  const activeProvider = providers.find(p => p.id === selectedProviderId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">{t('reception_queue_title')}</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            {t('reception_queue_subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedProviderId("all")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
              selectedProviderId === "all"
                ? "bg-brand-700 text-white"
                : "bg-surface border border-hairline text-ink-muted hover:text-ink"
            }`}
          >
            All Providers Overview
          </button>
        </div>
      </div>

      {/* Provider Selector Tabs */}
      <div className="flex border-b border-hairline overflow-x-auto gap-2 scrollbar-hide pb-0">
        <button
          onClick={() => setSelectedProviderId("all")}
          className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 cursor-pointer ${
            selectedProviderId === "all"
              ? "border-brand-700 text-brand-700 bg-brand-100/40"
              : "border-transparent text-ink-muted hover:text-ink hover:border-hairline"
          }`}
        >
          All Clinics Overview
        </button>
        {providers.map((p) => {
          const waitingCount = getProviderWaiting(p.id).length;
          const isSelected = selectedProviderId === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setSelectedProviderId(p.id)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 flex items-center gap-2 cursor-pointer ${
                isSelected
                  ? "border-brand-700 text-brand-700 font-semibold bg-brand-100/40"
                  : "border-transparent text-ink-muted hover:text-ink hover:border-hairline"
              }`}
            >
              <span>{p.name}</span>
              <span className={`text-[11px] px-1.5 py-0.2 rounded-full tabular-nums ${
                isSelected ? "bg-brand-700 text-white" : "bg-canvas text-ink-muted"
              }`}>
                {waitingCount}
              </span>
            </button>
          );
        })}
      </div>

      {/* VIEW: All Providers Overview */}
      {selectedProviderId === "all" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {providers.map((provider) => {
            const serving = getProviderNowServing(provider.id);
            const waiting = getProviderWaiting(provider.id);
            const nextPatient = waiting[0];

            return (
              <div 
                key={provider.id} 
                onClick={() => setSelectedProviderId(provider.id)}
                className="card p-5 cursor-pointer hover:border-brand-500 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-ink text-base">{provider.name}</h3>
                      <p className="text-xs text-ink-muted">{provider.kind} • {provider.room}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-xs font-semibold tabular-nums bg-brand-100 text-brand-700">
                      {waiting.length} waiting
                    </span>
                  </div>

                  {/* Now Serving mini card */}
                  <div className={`p-3 rounded-lg border mb-3 ${
                    serving ? "bg-status-inservice/5 border-status-inservice/30" : "bg-canvas border-hairline"
                  }`}>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-ink-muted block mb-1">
                      Now Serving
                    </span>
                    {serving ? (
                      <div className="flex items-center justify-between">
                        <div>
                          <TokenDisplay token={serving.token} size="sm" />
                          <div className="text-xs text-ink font-medium mt-0.5 truncate max-w-[150px]">
                            {serving.patient}
                          </div>
                        </div>
                        <div className="text-right">
                          <StatusPill status={serving.status} delay={serving.delay} />
                          <div className="text-[11px] text-ink-muted mt-1 tabular-nums">
                            {getElapsedMinutes(serving.startedTime, currentTime)}m elapsed
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-ink-muted py-1">Room currently vacant</div>
                    )}
                  </div>
                </div>

                {/* Next up footer */}
                <div className="pt-2 border-t border-hairline flex items-center justify-between text-xs text-ink-muted">
                  <span>
                    Next: <strong className="text-ink">{nextPatient ? `${nextPatient.token} (${nextPatient.patient})` : "None"}</strong>
                  </span>
                  <span className="text-brand-700 font-semibold flex items-center gap-0.5 group">
                    Manage <ArrowRight size={12} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* VIEW: Single Provider Ops Console */
        <div className="space-y-6">
          {/* Hero: Now Serving */}
          {(() => {
            const serving = getProviderNowServing(selectedProviderId);
            return (
              <div className="card p-6 border-l-4 border-l-brand-700">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-brand-700" />
                    <h2 className="text-base font-bold text-ink uppercase tracking-wide">
                      Now Serving in {activeProvider?.room}
                    </h2>
                  </div>
                  <span className="text-xs text-ink-muted font-medium">
                    Practitioner: <strong className="text-ink">{activeProvider?.name}</strong>
                  </span>
                </div>

                {serving ? (
                  <div className="bg-canvas border border-hairline rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 fade-update">
                    <div className="flex items-center gap-5">
                      <TokenDisplay token={serving.token} size="lg" />
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xl font-bold text-ink">{serving.patient}</h3>
                          <SourceBadge isWalkIn={serving.isWalkIn} />
                          {serving.priority && <PriorityBadge reason={serving.priorityReason} />}
                        </div>
                        <p className="text-xs text-ink-muted">
                          Service: <span className="font-semibold text-ink">{serving.serviceName}</span> • Phone: {serving.phone}
                        </p>
                        <div className="mt-2">
                          <StatusPill status={serving.status} delay={serving.delay} />
                        </div>
                      </div>
                    </div>

                    <div className="flex md:flex-col items-end justify-between w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0 border-hairline">
                      <span className="text-xs uppercase tracking-wider font-semibold text-ink-muted">
                        Consultation Elapsed
                      </span>
                      <span className="text-3xl font-bold text-brand-700 tabular-nums">
                        {getElapsedMinutes(serving.startedTime, currentTime)} min
                      </span>
                      {serving.delay && (
                        <span className="text-xs text-status-delayed font-semibold mt-1">
                          +{serving.delay.minutes}m delayed ({serving.delay.reason})
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-canvas border border-hairline rounded-xl p-8 text-center text-ink-muted">
                    <p className="text-sm font-medium">No patient is currently in consultation with {activeProvider?.name}.</p>
                    <p className="text-xs mt-1">Waiting list patients can be checked in or called when ready.</p>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Waiting List Table */}
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-hairline bg-surface flex items-center justify-between">
              <div>
                <h3 className="font-bold text-ink text-base">
                  Waiting Queue ({getProviderWaiting(selectedProviderId).length} patients)
                </h3>
                <p className="text-xs text-ink-muted">
                  Patients sorted by priority triage and appointment time.
                </p>
              </div>
            </div>

            {(() => {
              const waiting = getProviderWaiting(selectedProviderId);
              if (waiting.length === 0) {
                return (
                  <div className="p-8">
                    <EmptyState 
                      icon={Users} 
                      title="No Patients Waiting" 
                      description={`There are no waiting patients in queue for ${activeProvider?.name}.`} 
                    />
                  </div>
                );
              }

              return (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-hairline bg-canvas text-xs uppercase tracking-wider text-ink-muted font-semibold">
                        <th className="py-3 px-4 w-12">#</th>
                        <th className="py-3 px-4">Token</th>
                        <th className="py-3 px-4">Patient Details</th>
                        <th className="py-3 px-4">Source</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Scheduled</th>
                        <th className="py-3 px-4">Est. Wait & Explainability</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline">
                      {waiting.map((visit, idx) => (
                        <tr 
                          key={visit.id} 
                          className={`hover:bg-canvas/60 transition-colors ${
                            visit.priority ? "border-l-4 border-l-status-priority bg-status-priority/5" : ""
                          }`}
                        >
                          <td className="py-3.5 px-4 font-bold text-ink tabular-nums">
                            {idx + 1}
                          </td>
                          <td className="py-3.5 px-4">
                            <TokenDisplay token={visit.token} size="sm" />
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-ink">{visit.patient}</div>
                            <div className="text-xs text-ink-muted flex items-center gap-1.5 mt-0.5">
                              <span>{visit.serviceName}</span>
                              <span>•</span>
                              <span>{visit.phone}</span>
                            </div>
                            {visit.priority && (
                              <div className="mt-1">
                                <PriorityBadge reason={visit.priorityReason} />
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <SourceBadge isWalkIn={visit.isWalkIn} />
                          </td>
                          <td className="py-3.5 px-4">
                            <StatusPill status={visit.status} delay={visit.delay} />
                          </td>
                          <td className="py-3.5 px-4 tabular-nums text-xs font-medium text-ink">
                            {formatTime(visit.scheduledTime)}
                          </td>
                          <td className="py-3.5 px-4 max-w-xs">
                            <WaitBadge minutes={visit.estimatedWait} reason={visit.waitReason} />
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {visit.status === "booked" && (
                                <button 
                                  onClick={() => handleCheckIn(visit.id)}
                                  className="px-2.5 py-1 text-xs font-semibold text-brand-700 bg-brand-100 hover:bg-brand-700 hover:text-white rounded border border-brand-500/30 transition-colors cursor-pointer"
                                  title="Check In Patient"
                                >
                                  {t('check_in')}
                                </button>
                              )}

                              {visit.priority ? (
                                <button 
                                  onClick={() => handleRemovePriority(visit.id)}
                                  className="p-1.5 text-xs text-status-priority hover:bg-status-priority/20 rounded border border-hairline cursor-pointer"
                                  title="Remove Priority Status"
                                >
                                  <StarOff size={14} />
                                </button>
                              ) : (
                                <button 
                                  onClick={() => openPriorityModal(visit)}
                                  className="p-1.5 text-xs text-ink-muted hover:text-status-priority hover:bg-canvas rounded border border-hairline cursor-pointer"
                                  title="Mark Priority with Reason"
                                >
                                  <Star size={14} />
                                </button>
                              )}

                              <button 
                                onClick={() => handleNoShow(visit.id)}
                                className="p-1.5 text-xs text-status-noshow hover:bg-status-noshow/20 rounded border border-hairline cursor-pointer"
                                title="Mark as No-Show"
                              >
                                <UserX size={14} />
                              </button>

                              <button 
                                onClick={() => handleCancel(visit.id)}
                                className="p-1.5 text-xs text-ink-muted hover:text-status-noshow hover:bg-canvas rounded border border-hairline cursor-pointer"
                                title="Cancel Visit"
                              >
                                <XCircle size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Priority Modal with REQUIRED Reason */}
      <Modal 
        open={priorityModalOpen}
        title={`Set Priority: ${priorityVisit?.patient} (${priorityVisit?.token})`} 
        onClose={() => setPriorityModalOpen(false)}
      >
        <div className="space-y-4">
          <p className="text-xs text-ink-muted">
            Marking a visit as Priority places the patient at the top of the waiting queue. A clinical or triage reason is strictly required.
          </p>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-1">
              Clinical / Triage Reason <span className="text-status-noshow">*</span>
            </label>
            <textarea
              value={priorityReason}
              onChange={(e) => setPriorityReason(e.target.value)}
              className="w-full border border-hairline rounded-md p-2.5 text-sm text-ink focus:outline-none focus:border-brand-500"
              rows="3"
              placeholder="e.g. Acute pain, elderly patient, high fever, post-op dressing review..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
            <button 
              onClick={() => setPriorityModalOpen(false)}
              className="px-4 py-2 border border-hairline rounded-md text-xs font-semibold text-ink hover:bg-canvas cursor-pointer"
            >
              Cancel
            </button>
            <button 
              onClick={handleSetPriority}
              disabled={!priorityReason.trim()}
              className="px-4 py-2 bg-brand-700 text-white rounded-md text-xs font-semibold hover:bg-brand-500 disabled:opacity-40 transition-colors cursor-pointer"
            >
              Set Priority
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
