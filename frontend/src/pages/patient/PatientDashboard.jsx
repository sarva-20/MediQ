import React from 'react';
import { Link } from 'react-router-dom';
import { 
  getPatientVisits, 
  store 
} from '../../mocks/store';
import { useAuth, useStoreRefresh, useSimClock } from '../../hooks/useQueueStore';
import { useLang } from '../../lib/i18n';
import { formatTime, formatDate, DEMO_PATIENT } from '../../lib/utils';
import { 
  TokenDisplay, 
  StatusPill, 
  PriorityBadge, 
  WaitBadge, 
  EmptyState 
} from '../../components/shared';
import { 
  Calendar, 
  CalendarPlus, 
  Clock, 
  ExternalLink, 
  Activity, 
  ArrowRight, 
  CheckCircle2, 
  Stethoscope, 
  Sparkles,
  MapPin,
  CalendarCheck,
  Zap
} from 'lucide-react';

export default function PatientDashboard() {
  useStoreRefresh(); // Live pub/sub re-renders
  const { user } = useAuth();
  const { t } = useLang();
  const { now: currentTime } = useSimClock();
  
  const patientName = user?.name || DEMO_PATIENT;
  const firstName = patientName.split(' ')[0] || patientName;
  const visits = getPatientVisits(patientName);

  // 1. Upcoming visit: earliest upcoming booked or checked-in visit
  const upcomingVisits = visits.filter(
    (v) => v.status === 'booked' || v.status === 'checked-in'
  ).sort((a, b) => a.scheduledTime - b.scheduledTime);
  const upcomingVisit = upcomingVisits[0] || null;

  // 2. Active live queue token: currently in-service or waiting with immediate ETA
  const activeLiveVisit = visits.find(
    (v) => v.status === 'in-service' || v.status === 'checked-in' || (v.status === 'booked' && v.position <= 2)
  );

  // 3. Compact recent visits list (2–3 most recent)
  const recentVisits = visits.slice(0, 3);

  const getProvider = (providerId) => {
    return store.providers.find((p) => p.id === providerId);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* ─── WELCOME HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight">
            {t('welcome_back')}, {firstName}
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Here's where things stand today. Track live appointments and queue tokens in real time.
          </p>
        </div>

        <Link
          to="/patient/book"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent-amber text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-accent-amber/90 transition-colors shadow-sm self-start sm:self-auto"
        >
          <CalendarPlus size={16} /> {t('book_new_visit')}
        </Link>
      </div>

      {/* ─── SUMMARY STRIP (STAT CARDS) ─── */}
      <div className={`grid grid-cols-1 ${activeLiveVisit ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
        
        {/* Stat Card 1: Upcoming Visit */}
        <div className="card p-5 flex flex-col justify-between text-left">
          <div className="flex items-center justify-between pb-2 border-b border-hairline mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
              <CalendarCheck size={14} className="text-accent-amber" /> Upcoming Visit
            </span>
            {upcomingVisit && (
              <span className="text-[11px] font-semibold text-brand-700 bg-brand-100 px-2 py-0.5 rounded-full">
                Scheduled
              </span>
            )}
          </div>

          {upcomingVisit ? (
            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-base font-bold text-ink">
                    {getProvider(upcomingVisit.providerId)?.name || 'Consulting Doctor'}
                  </div>
                  <div className="text-xs text-ink-muted flex items-center gap-1 mt-0.5">
                    <MapPin size={12} /> {getProvider(upcomingVisit.providerId)?.room || 'Clinical Wing'} · {upcomingVisit.serviceName}
                  </div>
                </div>
                <TokenDisplay token={upcomingVisit.token} size="sm" />
              </div>

              <div className="pt-2 flex items-center justify-between text-xs text-ink-muted border-t border-hairline">
                <span className="font-semibold text-ink tabular-nums">
                  {formatDate(upcomingVisit.scheduledTime)} at {formatTime(upcomingVisit.scheduledTime)}
                </span>
                <Link
                  to={`/status/${upcomingVisit.token}`}
                  target="_blank"
                  className="text-accent-amber font-semibold hover:underline inline-flex items-center gap-1"
                >
                  Status <ExternalLink size={11} />
                </Link>
              </div>
            </div>
          ) : (
            <div className="py-2 text-left">
              <div className="text-sm font-semibold text-ink">{t('none_booked')}</div>
              <p className="text-xs text-ink-muted mt-0.5">
                You have no upcoming consultations scheduled. Book anytime.
              </p>
            </div>
          )}
        </div>

        {/* Stat Card 2: Active Token (Only shown if patient currently has an active queue token) */}
        {activeLiveVisit && (
          <div className="card p-5 border-l-4 border-l-status-active flex flex-col justify-between text-left bg-surface shadow-card">
            <div className="flex items-center justify-between pb-2 border-b border-hairline mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-status-active flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-status-active animate-ping" />
                Active Queue Token
              </span>
              <StatusPill status={activeLiveVisit.status} delay={activeLiveVisit.delay} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-ink-muted uppercase tracking-wider font-semibold block">Your Number</span>
                  <TokenDisplay token={activeLiveVisit.token} size="md" />
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-ink-muted uppercase tracking-wider font-semibold block">Estimated Wait</span>
                  <span className="text-xl font-bold tabular-nums text-brand-700">
                    {activeLiveVisit.estimatedWait <= 0 ? "Ready now" : `~${activeLiveVisit.estimatedWait} min`}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs border-t border-hairline">
                <span className="text-ink-muted truncate max-w-[180px]">
                  {activeLiveVisit.waitReason || "Queue on schedule"}
                </span>
                <Link
                  to={`/status/${activeLiveVisit.token}`}
                  target="_blank"
                  className="font-bold text-accent-amber hover:underline inline-flex items-center gap-1 shrink-0"
                >
                  Live Board <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Stat Card 3: Visits This Year */}
        <div className="card p-5 flex flex-col justify-between text-left">
          <div className="flex items-center justify-between pb-2 border-b border-hairline mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
              <Zap size={14} className="text-accent-amber" /> Visits This Year
            </span>
            <span className="text-[11px] font-mono text-ink-muted">2026 Archive</span>
          </div>

          <div>
            <div className="text-3xl font-bold tabular-nums text-ink">
              {visits.length}
            </div>
            <div className="text-xs text-ink-muted mt-1">
              Consultations & walk-in visits on record
            </div>
          </div>

          <div className="pt-3 border-t border-hairline text-xs">
            <Link
              to="/patient/visits"
              className="text-accent-amber font-semibold hover:underline inline-flex items-center gap-1"
            >
              {t('view_full_history')} <ArrowRight size={12} />
            </Link>
          </div>
        </div>

      </div>

      {/* ─── PRIMARY CTA CARD (WIDE BRAND-700 TEAL BANNER) ─── */}
      <div className="card !bg-brand-700 text-white p-6 sm:p-8 rounded-xl shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 text-left">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-amber text-white text-xs font-semibold shadow-xs">
            <Sparkles size={13} className="text-white" /> 30-Second Instant Scheduling
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight">
            Ready to see a doctor?
          </h2>
          <p className="text-xs sm:text-sm text-white leading-relaxed font-normal">
            Choose from 4 specialist departments, pick an available slot, and receive your live departure token immediately.
          </p>
        </div>

        <Link
          to="/patient/book"
          className="px-6 py-3.5 bg-accent-amber text-white hover:bg-accent-amber/90 font-bold text-sm rounded-xl transition-colors shadow-sm shrink-0 inline-flex items-center gap-2"
        >
          Book an appointment <ArrowRight size={15} />
        </Link>
      </div>

      {/* ─── RECENT VISITS LIST (2–3 MOST RECENT) ─── */}
      <div className="card overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-hairline bg-surface flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-ink">{t('recent_visits')}</h2>
            <p className="text-xs text-ink-muted">Recent appointments and clinical consultations</p>
          </div>
          <Link
            to="/patient/visits"
            className="text-xs font-semibold text-accent-amber hover:underline inline-flex items-center gap-1"
          >
            All visits ({visits.length}) <ArrowRight size={13} />
          </Link>
        </div>

        {recentVisits.length === 0 ? (
          <div className="p-8 text-center">
            <EmptyState 
              icon={Calendar} 
              title="No Visits Yet" 
              description="You have not booked any appointments with MediQ yet." 
            />
          </div>
        ) : (
          <div className="divide-y divide-hairline">
            {recentVisits.map((visit) => {
              const provider = getProvider(visit.providerId);
              const isWaiting = visit.status === 'booked' || visit.status === 'checked-in';

              return (
                <div 
                  key={visit.id} 
                  className="p-4 sm:p-5 flex flex-col md:flex-row gap-4 md:items-center justify-between hover:bg-canvas/50 transition-colors"
                >
                  <div className="flex items-start md:items-center gap-4 flex-1">
                    <TokenDisplay token={visit.token} size="sm" />
                    
                    <div className="flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPill status={visit.status} delay={visit.delay} />
                        {visit.priority && <PriorityBadge reason={visit.priorityReason} />}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink">
                        <span className="font-bold">{provider?.name || "Practitioner"}</span>
                        <span className="text-ink-muted">({provider?.room || "Room"})</span>
                        <span className="text-hairline">•</span>
                        <span className="text-ink-muted font-medium">{visit.serviceName}</span>
                        <span className="text-hairline">•</span>
                        <span className="tabular-nums text-ink font-semibold">
                          {formatDate(visit.scheduledTime)} at {formatTime(visit.scheduledTime)}
                        </span>
                      </div>

                      {isWaiting && (
                        <div className="pt-0.5">
                          <WaitBadge minutes={visit.estimatedWait} reason={visit.waitReason} />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2 md:pt-0 border-t md:border-0 border-hairline">
                    <Link
                      to={`/status/${visit.token}`}
                      target="_blank"
                      className="px-3 py-1.5 text-xs font-semibold text-accent-amber hover:underline rounded-lg transition-colors inline-flex items-center gap-1"
                    >
                      Departure Board <ExternalLink size={12} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
