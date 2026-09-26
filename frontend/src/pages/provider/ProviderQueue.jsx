import React, { useState } from 'react';
import { 
  Clock, 
  CheckCircle, 
  Play, 
  User, 
  Activity, 
  AlertTriangle,
  Stethoscope,
  ChevronRight
} from 'lucide-react';
import { 
  store, 
  getProviderNowServing, 
  getProviderWaiting, 
  startVisit, 
  delayVisit, 
  completeVisit,
  getProviderVisits
} from '../../mocks/store';
import { useAuth } from '../../hooks/useQueueStore';
import { useStoreRefresh, useSimClock, addToast } from '../../hooks/useQueueStore';
import { formatTime, getElapsedMinutes, formatWaitMinutes } from '../../lib/utils';
import { 
  StatusPill, 
  PriorityBadge, 
  SourceBadge, 
  WaitBadge, 
  TokenDisplay, 
  EmptyState, 
  Modal 
} from '../../components/shared';

// Timer showing mm:ss elapsed driven by sim clock
function ElapsedTimer({ startTime, currentTime }) {
  if (!startTime) return <span className="tabular-nums font-mono font-bold">00:00</span>;
  const diffMs = Math.max(0, currentTime - startTime);
  const totalSeconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const str = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return <span className="font-mono tabular-nums font-bold text-brand-700 text-2xl">{str}</span>;
}

export default function ProviderQueue() {
  const { user } = useAuth();
  useStoreRefresh();
  const { now: currentTime } = useSimClock();
  
  // Default to Dr. Priya Sharma (p1) if not logged in as a specific provider
  const providerId = user?.providerId || 'p1';
  const provider = store.providers.find(p => p.id === providerId) || store.providers[0];
  
  const nowServing = getProviderNowServing(provider?.id);
  const allVisits = getProviderVisits(provider?.id);
  
  // Categorize for Kanban
  const waitingVisits = allVisits.filter(v => ['checked-in', 'booked'].includes(v.status));
  const inServiceVisits = allVisits.filter(v => v.status === 'in-service');
  const doneVisits = allVisits.filter(v => ['completed', 'no-show', 'cancelled'].includes(v.status));

  // Next up: top 5
  const nextUp = waitingVisits.slice(0, 5);

  // Delay Modal
  const [isDelayModalOpen, setIsDelayModalOpen] = useState(false);
  const [delayMinutes, setDelayMinutes] = useState(8);
  const [delayReason, setDelayReason] = useState('');

  const handleStart = async (visitId) => {
    await startVisit(visitId);
    addToast('Patient consultation started');
  };

  const handleComplete = async (visitId) => {
    await completeVisit(visitId);
    addToast('Consultation marked completed');
  };

  const handleDelaySubmit = async (e) => {
    e.preventDefault();
    if (!nowServing) return;
    
    if (!delayReason.trim()) {
      addToast('Please provide a reason for the delay', 'error');
      return;
    }
    
    await delayVisit(nowServing.id, parseInt(delayMinutes, 10), delayReason.trim());
    setIsDelayModalOpen(false);
    setDelayMinutes(8);
    setDelayReason('');
    addToast(`Added +${delayMinutes} min delay with explainability reason`);
  };

  if (!provider) {
    return <div className="p-6">Provider record not found</div>;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-hairline pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-ink tracking-tight">Provider Operations Console</h1>
            <span className="text-xs px-2 py-0.5 rounded bg-brand-100 text-brand-700 font-semibold font-mono">
              {provider.room}
            </span>
          </div>
          <p className="text-sm text-ink-muted mt-0.5">
            {provider.name} • {provider.kind} • Shift {provider.shift}
          </p>
        </div>
        
        {/* Quick KPI stats */}
        <div className="flex gap-2.5">
          <div className="card px-3.5 py-2 flex flex-col items-center min-w-[75px]">
            <span className="text-[10px] text-ink-muted font-bold uppercase tracking-wider">Total</span>
            <span className="text-lg font-bold tabular-nums text-ink">{allVisits.length}</span>
          </div>
          <div className="card px-3.5 py-2 flex flex-col items-center min-w-[75px]">
            <span className="text-[10px] text-ink-muted font-bold uppercase tracking-wider">Waiting</span>
            <span className="text-lg font-bold tabular-nums text-status-waiting">{waitingVisits.length}</span>
          </div>
          <div className="card px-3.5 py-2 flex flex-col items-center min-w-[75px]">
            <span className="text-[10px] text-ink-muted font-bold uppercase tracking-wider">Done</span>
            <span className="text-lg font-bold tabular-nums text-status-inservice">{doneVisits.length}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 Cols) — Hero Now Serving & Next Up */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* NOW SERVING HERO */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                Active Consultation Room
              </h2>
              {nowServing && (
                <span className="text-xs text-status-inservice font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-status-inservice animate-pulse" />
                  In Session
                </span>
              )}
            </div>

            {nowServing ? (
              <div className="card p-6 border-l-4 border-l-status-inservice shadow-card fade-update">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
                  <div className="flex items-center gap-4">
                    <TokenDisplay token={nowServing.token} size="lg" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold text-ink">{nowServing.patient}</h3>
                        <SourceBadge isWalkIn={nowServing.isWalkIn} />
                        {nowServing.priority && <PriorityBadge reason={nowServing.priorityReason} />}
                      </div>
                      <p className="text-xs text-ink-muted mt-0.5">
                        {nowServing.serviceName} ({nowServing.serviceDuration} min scheduled) • Phone: {nowServing.phone}
                      </p>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-end justify-between w-full sm:w-auto">
                    <StatusPill status={nowServing.status} delay={nowServing.delay} />
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted">
                      <Clock size={13} />
                      <ElapsedTimer startTime={nowServing.startedTime} currentTime={currentTime} />
                    </div>
                  </div>
                </div>

                {/* Delay Warning Callout */}
                {nowServing.delay && (
                  <div className="mb-5 bg-status-delayed/10 border border-status-delayed/30 text-ink p-3 rounded-lg flex items-start gap-2.5">
                    <AlertTriangle size={18} className="text-status-delayed mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold text-xs text-status-delayed">
                        Overrun Delay Active: +{nowServing.delay.minutes} minutes
                      </p>
                      <p className="text-xs text-ink-muted mt-0.5">{nowServing.delay.reason}</p>
                    </div>
                  </div>
                )}

                {/* Hero Actions */}
                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-hairline">
                  <button 
                    onClick={() => setIsDelayModalOpen(true)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-status-delayed bg-status-delayed/10 hover:bg-status-delayed/20 border border-status-delayed/30 transition-colors cursor-pointer"
                  >
                    + Add Overrun Delay
                  </button>
                  <button 
                    onClick={() => handleComplete(nowServing.id)}
                    className="px-5 py-2 rounded-lg text-xs font-semibold text-white bg-status-inservice hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <CheckCircle size={15} />
                    Complete Consultation
                  </button>
                </div>
              </div>
            ) : (
              <div className="card p-8 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-canvas border border-hairline flex items-center justify-center mb-3 text-ink-muted">
                  <User size={24} />
                </div>
                <h3 className="text-base font-bold text-ink mb-1">Consultation Room Vacant</h3>
                <p className="text-xs text-ink-muted max-w-sm mb-5">
                  No patient is currently in service. Call the next waiting patient when ready.
                </p>
                {nextUp.length > 0 ? (
                  <button 
                    onClick={() => handleStart(nextUp[0].id)}
                    className="px-6 py-2.5 rounded-lg text-xs font-semibold text-white bg-brand-700 hover:bg-brand-500 transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
                  >
                    <Play size={14} />
                    Call Next Patient ({nextUp[0].token} — {nextUp[0].patient})
                  </button>
                ) : (
                  <span className="text-xs text-ink-muted italic">No patients waiting in queue</span>
                )}
              </div>
            )}
          </section>

          {/* NEXT 5 WAITING */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                Upcoming Queue ({waitingVisits.length} waiting)
              </h2>
              <span className="text-xs text-ink-muted">Showing next {nextUp.length}</span>
            </div>

            {nextUp.length > 0 ? (
              <div className="space-y-2.5">
                {nextUp.map((visit, idx) => (
                  <div 
                    key={visit.id} 
                    className={`card p-4 flex items-center justify-between transition-colors ${
                      visit.priority ? "border-l-4 border-l-status-priority bg-status-priority/5" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <span className="text-ink-muted font-bold text-sm w-4 tabular-nums">
                        #{idx + 1}
                      </span>
                      <TokenDisplay token={visit.token} size="sm" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-ink text-sm">{visit.patient}</span>
                          <SourceBadge isWalkIn={visit.isWalkIn} />
                          {visit.priority && <PriorityBadge reason={visit.priorityReason} />}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-ink-muted mt-0.5">
                          <span>{visit.serviceName}</span>
                          <span>•</span>
                          <span className="tabular-nums">{formatTime(visit.scheduledTime)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <WaitBadge minutes={visit.estimatedWait} reason={visit.waitReason} />
                      
                      {!nowServing && idx === 0 && (
                        <button
                          onClick={() => handleStart(visit.id)}
                          className="px-3 py-1.5 bg-brand-700 text-white rounded-md text-xs font-semibold hover:bg-brand-500 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Play size={12} /> Call Now
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card p-8">
                <EmptyState 
                  icon={Activity} 
                  title="Queue is Empty" 
                  description="No patients are currently queued for your consultation room." 
                />
              </div>
            )}
          </section>
        </div>

        {/* Right Column — Kanban Style (Waiting -> In Service -> Done Today) */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
            Today's Flow Kanban
          </h2>

          {/* Column 1: Waiting */}
          <div className="card p-3.5 bg-canvas/40">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-status-waiting">
                Waiting ({waitingVisits.length})
              </span>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {waitingVisits.length > 0 ? waitingVisits.map(visit => (
                <div key={visit.id} className="card p-2.5 bg-surface text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold tabular-nums text-ink">{visit.token}</span>
                    <StatusPill status={visit.status} delay={visit.delay} />
                  </div>
                  <div className="font-semibold text-ink truncate">{visit.patient}</div>
                  <div className="text-[11px] text-ink-muted flex justify-between">
                    <span>{visit.serviceName}</span>
                    <span className="tabular-nums">{formatTime(visit.scheduledTime)}</span>
                  </div>
                </div>
              )) : (
                <div className="text-center py-4 text-xs text-ink-muted">None waiting</div>
              )}
            </div>
          </div>

          {/* Column 2: In Service */}
          <div className="card p-3.5 bg-canvas/40">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-status-inservice">
                In Service ({inServiceVisits.length})
              </span>
            </div>
            <div className="space-y-2">
              {inServiceVisits.length > 0 ? inServiceVisits.map(visit => (
                <div key={visit.id} className="card p-2.5 bg-surface text-xs space-y-1 border-l-3 border-l-status-inservice">
                  <div className="flex items-center justify-between">
                    <span className="font-bold tabular-nums text-ink">{visit.token}</span>
                    <span className="text-status-inservice font-semibold">Active</span>
                  </div>
                  <div className="font-semibold text-ink truncate">{visit.patient}</div>
                  <div className="text-[11px] text-ink-muted flex justify-between">
                    <span>{visit.serviceName}</span>
                    <span className="tabular-nums font-mono font-medium">
                      {getElapsedMinutes(visit.startedTime, currentTime)}m elapsed
                    </span>
                  </div>
                </div>
              )) : (
                <div className="text-center py-4 text-xs text-ink-muted">No consultation active</div>
              )}
            </div>
          </div>

          {/* Column 3: Done Today */}
          <div className="card p-3.5 bg-canvas/40">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                Done Today ({doneVisits.length})
              </span>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {doneVisits.length > 0 ? doneVisits.map(visit => (
                <div key={visit.id} className="card p-2.5 bg-surface text-xs space-y-1 opacity-80">
                  <div className="flex items-center justify-between">
                    <span className="font-bold tabular-nums text-ink">{visit.token}</span>
                    <StatusPill status={visit.status} delay={visit.delay} />
                  </div>
                  <div className="font-medium text-ink truncate">{visit.patient}</div>
                  <div className="text-[11px] text-ink-muted flex justify-between">
                    <span>{visit.serviceName}</span>
                    <span className="tabular-nums">
                      {visit.completedTime ? formatTime(visit.completedTime) : "—"}
                    </span>
                  </div>
                </div>
              )) : (
                <div className="text-center py-4 text-xs text-ink-muted">No completed visits</div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Delay Modal */}
      <Modal 
        open={isDelayModalOpen} 
        onClose={() => setIsDelayModalOpen(false)} 
        title={`Apply Consultation Overrun Delay — ${nowServing?.patient}`}
      >
        <form onSubmit={handleDelaySubmit} className="space-y-4">
          <p className="text-xs text-ink-muted">
            Adding a delay immediately recalculates estimated wait times for all downstream patients and cascades an explainability reason to the departure boards.
          </p>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-1">
              Delay Duration (Minutes)
            </label>
            <input 
              type="number" 
              min="1" 
              max="60"
              value={delayMinutes} 
              onChange={e => setDelayMinutes(e.target.value)}
              className="w-full rounded-md border border-hairline p-2 text-sm text-ink focus:outline-none focus:border-brand-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-1">
              Clinical Reason <span className="text-status-noshow">*</span>
            </label>
            <textarea 
              rows={3}
              value={delayReason} 
              onChange={e => setDelayReason(e.target.value)}
              className="w-full rounded-md border border-hairline p-2 text-sm text-ink focus:outline-none focus:border-brand-500"
              placeholder="e.g. Extended consultation for multiple concerns, diagnostic dressing review, complex ECG interpretation..."
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-hairline">
            <button 
              type="button" 
              onClick={() => setIsDelayModalOpen(false)}
              className="px-4 py-2 rounded-md text-xs font-semibold text-ink border border-hairline hover:bg-canvas cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={!delayReason.trim()}
              className="px-4 py-2 rounded-md bg-status-delayed text-white text-xs font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity cursor-pointer"
            >
              Apply Delay & Recompute ETAs
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
