import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getPatientVisits,
  cancelVisit,
  store,
  fetchVisitPrescriptions
} from '../../mocks/store';
import { useStoreRefresh, addToast } from '../../hooks/useQueueStore';
import { useLang } from '../../lib/i18n';
import { formatTime, formatDate, DEMO_PATIENT } from '../../lib/utils';
import { 
  TokenDisplay, 
  StatusPill, 
  PriorityBadge, 
  WaitBadge, 
  EmptyState 
} from '../../components/shared';
import { CalendarX2, ExternalLink, CalendarPlus, XCircle } from 'lucide-react';

export default function MyVisits() {
  useStoreRefresh(); // Stay live with store updates
  const { t } = useLang();

  const visits = getPatientVisits(DEMO_PATIENT);

  const [openRxVisitId, setOpenRxVisitId] = useState(null);
  const [rxByVisit, setRxByVisit] = useState({});

  const toggleRx = async (visitId) => {
    if (openRxVisitId === visitId) {
      setOpenRxVisitId(null);
      return;
    }
    setOpenRxVisitId(visitId);
    if (!rxByVisit[visitId]) {
      try {
        const items = await fetchVisitPrescriptions(visitId);
        setRxByVisit((prev) => ({ ...prev, [visitId]: items }));
      } catch {
        setRxByVisit((prev) => ({ ...prev, [visitId]: [] }));
      }
    }
  };

  const handleCancel = async (visitId) => {
    try {
      await cancelVisit(visitId);
      addToast('Appointment cancelled successfully');
    } catch (err) {
      addToast(err.message || 'Failed to cancel appointment', 'error');
    }
  };

  const getProvider = (providerId) => {
    return store.providers.find(p => p.id === providerId);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">{t('my_visits')}</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            Active and past consultations for <span className="font-semibold text-ink">{DEMO_PATIENT}</span>
          </p>
        </div>
        <Link 
          to="/patient/book" 
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent-amber text-white rounded-lg font-medium hover:bg-accent-amber/90 transition-colors text-sm shadow-sm"
        >
          <CalendarPlus size={16} /> {t('book_new_visit')}
        </Link>
      </div>

      {visits.length === 0 ? (
        <div className="card p-12">
          <EmptyState 
            icon={CalendarX2} 
            title={t('no_visits_found')} 
            description="You don't have any appointments or walk-in visits in the system yet. Click 'Book New Visit' above to schedule one." 
          />
        </div>
      ) : (
        <div className="space-y-3">
          {visits.map((visit) => {
            const provider = getProvider(visit.providerId);
            const isWaiting = visit.status === 'booked' || visit.status === 'checked-in';
            const canCancel = isWaiting;

            return (
              <div 
                key={visit.id} 
                className="card p-5 flex flex-col md:flex-row md:flex-wrap gap-5 md:items-center justify-between hover:border-brand-500/40 transition-colors"
              >
                <div className="flex items-start md:items-center gap-4 flex-1">
                  <div className="shrink-0">
                    <TokenDisplay token={visit.token} size="md" />
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill status={visit.status} delay={visit.delay} />
                      {visit.priority && <PriorityBadge reason={visit.priorityReason} />}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                      <span className="font-semibold text-ink">
                        {provider?.name || "Assigned Provider"}
                      </span>
                      <span className="text-hairline">•</span>
                      <span className="text-ink-muted">
                        {provider?.room || "Clinical Wing"}
                      </span>
                      <span className="text-hairline">•</span>
                      <span className="text-ink-muted font-medium">
                        {visit.serviceName}
                      </span>
                      <span className="text-hairline">•</span>
                      <span className="tabular-nums text-ink font-medium">
                        {formatDate(visit.scheduledTime)} at {formatTime(visit.scheduledTime)}
                      </span>
                    </div>

                    {isWaiting && (
                      <div className="pt-1">
                        <WaitBadge minutes={visit.estimatedWait} reason={visit.waitReason} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 border-t border-hairline pt-3 md:pt-0 md:border-0 justify-end shrink-0">
                  {canCancel && (
                    <button
                      onClick={() => handleCancel(visit.id)}
                      className="px-3 py-1.5 text-xs font-semibold text-status-noshow hover:bg-status-noshow/10 rounded border border-hairline transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <XCircle size={14} /> {t('cancel')}
                    </button>
                  )}
                  <button
                    onClick={() => toggleRx(visit.id)}
                    className="px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100/60 rounded border border-hairline transition-colors cursor-pointer"
                  >
                    {t('prescriptions')}
                  </button>
                  <Link
                    to={`/status/${visit.token}`}
                    target="_blank"
                    className="px-3 py-1.5 text-xs font-semibold text-accent-amber hover:underline transition-colors flex items-center gap-1"
                  >
                    {t('departure_board')} <ExternalLink size={13} />
                  </Link>
                </div>

                {openRxVisitId === visit.id && (
                  <div className="w-full md:w-auto md:basis-full pt-3 border-t border-hairline text-xs space-y-2">
                    {(rxByVisit[visit.id] || []).length === 0 ? (
                      <p className="text-ink-muted italic">{t('no_prescriptions')}</p>
                    ) : (
                      rxByVisit[visit.id].map((rx) => (
                        <div key={rx.id} className="bg-canvas border border-hairline rounded-lg p-3">
                          <div className="font-semibold text-ink">{rx.medications}</div>
                          {rx.notes && <div className="text-ink-muted mt-0.5">{rx.notes}</div>}
                          <div className="text-[11px] text-ink-muted mt-1">{rx.providerName}</div>
                        </div>
                      ))
                    )}
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
