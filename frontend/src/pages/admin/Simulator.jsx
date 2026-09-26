import React from 'react';
import { Link } from 'react-router-dom';
import { useStoreRefresh, useSimClock, addToast } from '../../hooks/useQueueStore';
import { useLang } from '../../lib/i18n';
import { 
  advanceClock, 
  freezeClock, 
  resumeClock, 
  resetClock, 
  seedData, 
  store, 
  getMetrics 
} from '../../mocks/store';
import { formatTime, formatDate } from '../../lib/utils';
import { 
  FastForward, 
  Pause, 
  Play, 
  RotateCcw, 
  Database, 
  Clock, 
  ExternalLink,
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';

export default function Simulator() {
  useStoreRefresh();
  const { t } = useLang();
  const { now: currentTime, frozen } = useSimClock();
  const metrics = getMetrics();
  const recentEvents = store.eventLog.slice(0, 6);

  const handleAdvance = async (mins) => {
    try {
      await advanceClock(mins);
      addToast(`Fast-forwarded simulation clock by +${mins} minutes`);
    } catch (err) {
      addToast(err.message || 'Failed to advance clock', 'error');
    }
  };

  const handleToggleFreeze = async () => {
    try {
      if (frozen) {
        await resumeClock();
        addToast('Simulation clock resumed');
      } else {
        await freezeClock();
        addToast('Simulation clock paused');
      }
    } catch (err) {
      addToast(err.message || 'Failed to update clock', 'error');
    }
  };

  const handleReset = async () => {
    try {
      await resetClock();
      addToast('Simulation clock reset to wall time');
    } catch (err) {
      addToast(err.message || 'Failed to reset clock', 'error');
    }
  };

  const handleReseed = async () => {
    try {
      await seedData();
      addToast('Full demo dataset freshly reseeded');
    } catch (err) {
      addToast(err.message || 'Failed to reseed data', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">{t('simulator_title')}</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            Advance time and watch ETAs, queues, and explainability strings cascade in real time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/status/GM-A002"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-100 text-brand-700 text-xs font-semibold rounded-md hover:bg-brand-500 hover:text-white transition-colors"
          >
            Open Live Token Screen <ExternalLink size={12} />
          </Link>
          <Link
            to="/reception/queue"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 card border border-hairline text-ink text-xs font-semibold hover:bg-canvas transition-colors"
          >
            Open Queue Board <ExternalLink size={12} />
          </Link>
        </div>
      </div>

      {/* Hero: Simulation Clock Card */}
      <div className="card p-8 border-2 border-brand-700/30 flex flex-col items-center justify-center text-center shadow-card bg-surface relative overflow-hidden">
        {/* Subtle decorative banner */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-status-delayed/15 text-status-delayed text-xs font-bold uppercase tracking-wider mb-3">
          <Clock size={13} />
          <span>Simulated Departure Engine Clock</span>
        </div>

        {/* Big Display Clock */}
        <div className="flex items-center gap-4 my-2">
          <div className="text-5xl sm:text-6xl tabular-nums font-bold text-brand-700 tracking-tight fade-update">
            {formatTime(currentTime)}
          </div>
          <div className={`p-2.5 rounded-full border ${
            frozen ? "bg-status-delayed/15 border-status-delayed text-status-delayed" : "bg-status-inservice/15 border-status-inservice text-status-inservice"
          }`}>
            {frozen ? <Pause size={24} /> : <Play size={24} />}
          </div>
        </div>

        <div className="text-sm font-medium text-ink-muted mt-1 tabular-nums fade-update">
          {formatDate(currentTime)} • {frozen ? "CLOCK PAUSED (FROZEN)" : "RUNNING LIVE"}
        </div>

        <p className="text-xs text-ink-muted mt-3 max-w-md">
          All appointment overruns, queue positions, and estimated wait durations derive dynamically from this simulated clock.
        </p>
      </div>

      {/* Primary Action Controls */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-2.5">
          Time Warp Controls
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <button 
            onClick={() => handleAdvance(5)} 
            className="flex flex-col items-center justify-center gap-1.5 p-4 bg-brand-700 text-white rounded-lg hover:bg-brand-500 transition-colors font-semibold text-xs cursor-pointer shadow-sm group"
          >
            <FastForward size={22} className="group-hover:scale-110 transition-transform" />
            <span className="text-sm font-bold tabular-nums">+5 Min</span>
            <span className="text-[10px] text-brand-100 font-normal">Slight overrun</span>
          </button>

          <button 
            onClick={() => handleAdvance(10)} 
            className="flex flex-col items-center justify-center gap-1.5 p-4 bg-brand-700 text-white rounded-lg hover:bg-brand-500 transition-colors font-semibold text-xs cursor-pointer shadow-sm group"
          >
            <FastForward size={22} className="group-hover:scale-110 transition-transform" />
            <span className="text-sm font-bold tabular-nums">+10 Min</span>
            <span className="text-[10px] text-brand-100 font-normal">Noticeable shift</span>
          </button>

          <button 
            onClick={() => handleAdvance(30)} 
            className="flex flex-col items-center justify-center gap-1.5 p-4 bg-brand-700 text-white rounded-lg hover:bg-brand-500 transition-colors font-semibold text-xs cursor-pointer shadow-sm group"
          >
            <FastForward size={22} className="group-hover:scale-110 transition-transform" />
            <span className="text-sm font-bold tabular-nums">+30 Min</span>
            <span className="text-[10px] text-brand-100 font-normal">Cascade next visits</span>
          </button>

          <button 
            onClick={handleToggleFreeze} 
            className={`flex flex-col items-center justify-center gap-1.5 p-4 rounded-lg font-semibold text-xs cursor-pointer shadow-sm transition-colors ${
              frozen 
                ? "bg-status-inservice text-white hover:opacity-90" 
                : "bg-status-delayed text-white hover:opacity-90"
            }`}
          >
            {frozen ? <Play size={22} /> : <Pause size={22} />}
            <span className="text-sm font-bold">{frozen ? "Resume Time" : "Freeze Time"}</span>
            <span className="text-[10px] opacity-80 font-normal">{frozen ? "Unfreeze tick" : "Hold for demo"}</span>
          </button>

          <button 
            onClick={handleReset} 
            className="flex flex-col items-center justify-center gap-1.5 p-4 card border border-hairline text-ink hover:bg-canvas transition-colors font-semibold text-xs cursor-pointer shadow-sm"
          >
            <RotateCcw size={20} className="text-ink-muted" />
            <span className="text-xs font-bold text-ink">Reset Clock</span>
            <span className="text-[10px] text-ink-muted font-normal">Sync to present</span>
          </button>

          <button 
            onClick={handleReseed} 
            className="flex flex-col items-center justify-center gap-1.5 p-4 card border border-brand-500/40 bg-brand-100/30 text-brand-700 hover:bg-brand-100 transition-colors font-semibold text-xs cursor-pointer shadow-sm"
          >
            <Database size={20} />
            <span className="text-xs font-bold">Reseed Data</span>
            <span className="text-[10px] text-brand-700/70 font-normal">Reset 19 demo visits</span>
          </button>
        </div>
      </div>

      {/* Live Preview: Metrics + Audit Log */}
      <div className="grid md:grid-cols-2 gap-6">
        
        {/* Live Metrics preview */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-ink uppercase tracking-wider">
              Real-Time Cascaded Metrics
            </h2>
            <span className="text-xs px-2 py-0.5 rounded bg-status-inservice/10 text-status-inservice font-semibold">
              Live Synced
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 bg-canvas rounded-lg border border-hairline">
              <span className="text-[11px] text-ink-muted font-semibold uppercase tracking-wider block">
                Patients Waiting
              </span>
              <span className="text-3xl font-bold tabular-nums text-brand-700 mt-1 block fade-update">
                {metrics.waiting}
              </span>
              <span className="text-[11px] text-ink-muted">In queue across clinics</span>
            </div>

            <div className="p-3.5 bg-canvas rounded-lg border border-hairline">
              <span className="text-[11px] text-ink-muted font-semibold uppercase tracking-wider block">
                Active Consultations
              </span>
              <span className="text-3xl font-bold tabular-nums text-status-inservice mt-1 block fade-update">
                {metrics.inService}
              </span>
              <span className="text-[11px] text-ink-muted">Rooms in service</span>
            </div>

            <div className="p-3.5 bg-canvas rounded-lg border border-hairline">
              <span className="text-[11px] text-ink-muted font-semibold uppercase tracking-wider block">
                Overrun Delays
              </span>
              <span className="text-3xl font-bold tabular-nums text-status-delayed mt-1 block fade-update">
                {metrics.delayed}
              </span>
              <span className="text-[11px] text-ink-muted">Active delay adjustments</span>
            </div>

            <div className="p-3.5 bg-canvas rounded-lg border border-hairline">
              <span className="text-[11px] text-ink-muted font-semibold uppercase tracking-wider block">
                Average Wait
              </span>
              <span className="text-3xl font-bold tabular-nums text-ink mt-1 block fade-update">
                {metrics.avgWait}m
              </span>
              <span className="text-[11px] text-ink-muted">Completed consultations</span>
            </div>
          </div>
        </div>
        
        {/* Recent Events */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-ink uppercase tracking-wider">
              Recent State Transitions
            </h2>
            <span className="text-xs text-ink-muted font-medium">Audit Trail</span>
          </div>

          <div className="space-y-2.5">
            {recentEvents.map((ev) => (
              <div 
                key={ev.id} 
                className="flex items-start gap-2.5 text-xs p-2 rounded bg-canvas border border-hairline fade-update"
              >
                <span className="tabular-nums font-mono text-ink-muted shrink-0 text-[11px]">
                  {formatTime(ev.time)}
                </span>
                <span className="font-semibold text-brand-700 shrink-0 uppercase text-[10px] px-1.5 py-0.5 rounded bg-brand-100">
                  {ev.event}
                </span>
                <span className="text-ink font-medium truncate flex-1" title={ev.detail}>
                  {ev.detail}
                </span>
              </div>
            ))}
            {recentEvents.length === 0 && (
              <div className="text-ink-muted text-xs py-4 text-center">No recent simulation events.</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
