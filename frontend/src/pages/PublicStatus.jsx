import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStoreRefresh, useSimClock } from '../hooks/useQueueStore';
import { store, getVisitByToken, getProviderNowServing } from '../mocks/store';
import { formatTime, formatWaitMinutes } from '../lib/utils';
import { TokenDisplay, StatusPill, LiveIndicator } from '../components/shared';
import { Clock, MapPin, Stethoscope, ArrowLeft, Users, AlertTriangle } from 'lucide-react';

export default function PublicStatus() {
  const { tokenNo } = useParams();
  
  // Re-render when store updates
  useStoreRefresh();
  
  // Get current sim time
  const { now: currentTime } = useSimClock();
  
  // Look up visit by token
  const visit = getVisitByToken(tokenNo);
  const provider = visit ? store.providers.find(p => p.id === visit.providerId) : null;
  const nowServing = provider ? getProviderNowServing(provider.id) : null;

  if (!visit) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-6">
        <div className="card max-w-md w-full p-8 text-center flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-status-noshow/10 text-status-noshow flex items-center justify-center">
            <AlertTriangle size={24} />
          </div>
          <div className="text-xl font-bold text-ink">Token Not Found</div>
          <p className="text-ink-muted text-sm leading-relaxed">
            We couldn't find an active clinic visit matching <span className="font-mono font-semibold text-ink">"{tokenNo}"</span>. Please double-check your token or speak to the reception desk.
          </p>
          <Link
            to="/login"
            className="mt-2 inline-flex items-center gap-1.5 text-sm text-brand-700 font-medium hover:underline"
          >
            <ArrowLeft size={14} /> Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  const isWaiting = visit.status === 'booked' || visit.status === 'checked-in';
  const isInService = visit.status === 'in-service';
  const isCompleted = visit.status === 'completed';
  const isDelayed = !!visit.delay;

  // Ahead of you calculation:
  const aheadCount = Math.max(0, (visit.position || 1) - 1);

  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-between p-4 sm:p-8">
      {/* Top Departure Board Brand Bar */}
      <header className="w-full max-w-2xl flex items-center justify-between py-2 border-b border-hairline mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold tracking-tight text-brand-700">MediQ</span>
          <span className="text-xs uppercase tracking-widest text-ink-muted font-semibold border-l border-hairline pl-3">
            Public Live Board
          </span>
        </div>
        <div className="flex items-center gap-4">
          <LiveIndicator color="status-inservice" />
          <div className="text-xs tabular-nums text-ink-muted flex items-center gap-1">
            <Clock size={13} />
            <span>{formatTime(currentTime)}</span>
          </div>
        </div>
      </header>

      {/* Main Board Hero Card */}
      <main className="w-full max-w-2xl card p-8 sm:p-12 flex flex-col items-center text-center shadow-card fade-update my-auto">
        
        {/* Token Label */}
        <div className="text-xs font-bold uppercase tracking-widest text-ink-muted mb-2">
          Your Token Number
        </div>

        {/* Huge Token Display — Departure Board Moment */}
        <div className="py-2">
          <TokenDisplay token={visit.token} size="xxl" />
        </div>

        {/* Status Pill */}
        <div className="mt-4 mb-8">
          <StatusPill status={visit.status} delay={visit.delay} />
        </div>

        {/* Dynamic Status Sections */}
        {isWaiting && (
          <div className="w-full flex flex-col gap-6 fade-update">
            {/* Queue Position and ETA Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-canvas border border-hairline rounded-lg p-5 flex flex-col items-center justify-center">
                <span className="text-xs uppercase font-semibold text-ink-muted tracking-wider flex items-center gap-1 mb-1">
                  <Users size={14} /> Queue Position
                </span>
                <span className="text-3xl font-bold text-ink tabular-nums">
                  {aheadCount === 0 ? "You're next!" : `${aheadCount} ahead`}
                </span>
                <span className="text-xs text-ink-muted mt-1">
                  Position #{visit.position || 1} in queue
                </span>
              </div>

              <div className="bg-canvas border border-hairline rounded-lg p-5 flex flex-col items-center justify-center">
                <span className="text-xs uppercase font-semibold text-ink-muted tracking-wider flex items-center gap-1 mb-1">
                  <Clock size={14} /> Estimated Wait
                </span>
                <span className="text-3xl font-bold text-brand-700 tabular-nums">
                  {visit.estimatedWait <= 0 ? "Ready soon" : formatWaitMinutes(visit.estimatedWait)}
                </span>
                <span className="text-xs text-ink-muted mt-1">
                  {visit.status === 'booked' ? "Please check in at desk" : "Checked in & waiting"}
                </span>
              </div>
            </div>

            {/* Explainability Reason String — Core Feature */}
            <div className="bg-brand-100/60 border border-brand-500/20 rounded-lg px-4 py-3 text-left">
              <div className="text-[11px] font-bold uppercase tracking-wider text-brand-700 mb-0.5">
                Why this wait time?
              </div>
              <p className="text-xs text-ink font-medium leading-relaxed">
                {visit.waitReason || "Queue proceeding as scheduled based on standard consultation duration."}
              </p>
            </div>

            {/* Provider and Departure Board Now Serving */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-hairline text-left">
              <div className="flex flex-col">
                <span className="text-xs text-ink-muted flex items-center gap-1">
                  <Stethoscope size={13} /> Provider & Room
                </span>
                <span className="text-sm font-bold text-ink mt-0.5">
                  {provider?.name || "Assigned Doctor"}
                </span>
                <span className="text-xs text-ink-muted flex items-center gap-1">
                  <MapPin size={12} /> {provider?.room || "Clinical Wing"}
                </span>
              </div>

              <div className="flex flex-col items-end text-right">
                <span className="text-xs text-ink-muted uppercase tracking-wider">
                  Now Serving
                </span>
                <span className="text-xl font-bold text-status-inservice tabular-nums mt-0.5">
                  {nowServing ? nowServing.token : "— None —"}
                </span>
                <span className="text-xs text-ink-muted">
                  {nowServing ? `${nowServing.patient} in room` : "Ready for next call"}
                </span>
              </div>
            </div>
          </div>
        )}

        {isInService && (
          <div className="w-full bg-status-inservice/10 border border-status-inservice/30 rounded-lg p-6 flex flex-col items-center gap-3 fade-update">
            <span className="text-xs font-bold uppercase tracking-widest text-status-inservice">
              Currently In Service
            </span>
            <div className="text-xl font-bold text-ink">
              Please be in {provider?.room || "the consultation room"}
            </div>
            <p className="text-sm text-ink-muted">
              {provider?.name} is currently consulting with you for {visit.serviceName}.
            </p>
            {isDelayed && (
              <div className="mt-2 text-xs text-status-delayed bg-status-delayed/15 px-3 py-1.5 rounded font-medium">
                Delayed +{visit.delay.minutes} min: {visit.delay.reason}
              </div>
            )}
          </div>
        )}

        {isCompleted && (
          <div className="w-full bg-surface border border-hairline rounded-lg p-6 flex flex-col items-center gap-2 fade-update">
            <span className="text-xs font-bold uppercase tracking-widest text-status-inservice">
              Visit Completed
            </span>
            <div className="text-lg font-bold text-ink">Thank you for visiting MediQ</div>
            <p className="text-xs text-ink-muted">
              Your consultation with {provider?.name} has concluded. Please proceed to pharmacy or reception if prescribed.
            </p>
          </div>
        )}

        {visit.status === 'no-show' && (
          <div className="w-full bg-status-noshow/10 border border-status-noshow/30 rounded-lg p-6 flex flex-col items-center gap-2 fade-update">
            <span className="text-xs font-bold uppercase tracking-widest text-status-noshow">
              Marked As No-Show
            </span>
            <div className="text-base font-bold text-ink">Turn was missed</div>
            <p className="text-xs text-ink-muted">
              Your token was called but marked as absent. Please speak to the receptionist to be placed back in the queue.
            </p>
          </div>
        )}

        {visit.status === 'cancelled' && (
          <div className="w-full bg-canvas border border-hairline rounded-lg p-6 flex flex-col items-center gap-2 fade-update">
            <span className="text-xs font-bold uppercase tracking-widest text-ink-muted">
              Appointment Cancelled
            </span>
            <p className="text-xs text-ink-muted">
              This visit was cancelled. Please book another slot when convenient.
            </p>
          </div>
        )}
      </main>

      {/* Footer Info */}
      <footer className="w-full max-w-2xl flex items-center justify-between text-[11px] text-ink-muted py-2 border-t border-hairline">
        <span>Patient: {visit.patient}</span>
        <span>Service: {visit.serviceName} ({visit.serviceDuration} min)</span>
        <span>MediQ Queue Departure Engine</span>
      </footer>
    </div>
  );
}
