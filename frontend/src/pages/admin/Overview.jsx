import React from 'react';
import { useStoreRefresh, useSimClock } from '../../hooks/useQueueStore';
import { useLang } from '../../lib/i18n';
import { store, getMetrics } from '../../mocks/store';
import { formatTime } from '../../lib/utils';
import { 
  Clock, 
  AlertTriangle, 
  Users, 
  CheckCircle, 
  UserX, 
  Activity,
  BarChart3,
  ListOrdered
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid,
  Legend
} from 'recharts';

export default function Overview() {
  useStoreRefresh();
  const { t } = useLang();
  const { now: currentTime } = useSimClock();
  const metrics = getMetrics();
  
  const events = store.eventLog.slice(0, 25);
  const providerData = metrics.providerLoad || [];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">{t('overview_title')}</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            Real-time operational health, queue throughput, and clinical delay tracking.
          </p>
        </div>
      </div>
      
      {/* KPI Tiles Row (6 tiles in grid) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <MetricCard 
          icon={<Clock size={20} className="text-brand-700" />} 
          label="Avg Wait Time" 
          value={`${metrics.avgWait}m`} 
          subtitle="All completed visits"
        />
        <MetricCard 
          icon={<AlertTriangle size={20} className="text-status-delayed" />} 
          label="Delayed Cases" 
          value={metrics.delayed} 
          subtitle="Active overruns"
        />
        <MetricCard 
          icon={<Users size={20} className="text-status-waiting" />} 
          label="Patients Waiting" 
          value={metrics.waiting} 
          subtitle="In queue currently"
        />
        <MetricCard 
          icon={<Activity size={20} className="text-status-active" />} 
          label="In Consultation" 
          value={metrics.inService} 
          subtitle="Currently with doctor"
        />
        <MetricCard 
          icon={<CheckCircle size={20} className="text-status-inservice" />} 
          label="Completed Today" 
          value={metrics.completed} 
          subtitle="Discharged visits"
        />
        <MetricCard 
          icon={<UserX size={20} className="text-status-noshow" />} 
          label="No-Shows" 
          value={metrics.noShows} 
          subtitle="Missed call turns"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Per-Provider Patient Load */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-ink">Provider Workload Distribution</h2>
              <p className="text-xs text-ink-muted">Active, waiting, and completed consultations</p>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={providerData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#DCE6E6" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 11, fill: '#5B7178' }} 
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                />
                <YAxis tick={{ fontSize: 11, fill: '#5B7178' }} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DCE6E6', borderRadius: '8px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="waiting" name="Waiting" fill="#5B7C99" stackId="load" radius={[0, 0, 0, 0]} />
                <Bar dataKey="inService" name="In Service" fill="#0E93A6" stackId="load" radius={[0, 0, 0, 0]} />
                <Bar dataKey="completed" name="Completed" fill="#2E8B57" stackId="load" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Average Wait Time by Provider */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-ink">Average Wait Time per Provider (min)</h2>
              <p className="text-xs text-ink-muted">Historical wait duration from check-in to consultation</p>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={providerData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#DCE6E6" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 11, fill: '#5B7178' }} 
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                />
                <YAxis tick={{ fontSize: 11, fill: '#5B7178' }} unit="m" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DCE6E6', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(val) => [`${val} minutes`, 'Avg Wait']}
                />
                <Bar dataKey="avgWait" name="Avg Wait (min)" fill="#0B6E7D" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Event Log */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-hairline bg-surface flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-ink">System Audit & Live Event Stream</h2>
            <p className="text-xs text-ink-muted">Live dispatch transactions, delays, status updates and simulator actions</p>
          </div>
          <span className="text-xs text-ink-muted font-medium">Last {events.length} events</span>
        </div>

        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-canvas z-10">
              <tr className="border-b border-hairline uppercase font-bold text-ink-muted">
                <th className="py-2.5 px-4 w-32">Time (IST)</th>
                <th className="py-2.5 px-4 w-36">Action / Event</th>
                <th className="py-2.5 px-4 w-28">Visit ID</th>
                <th className="py-2.5 px-4">Event Detail & Explainability Log</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {events.map((log) => (
                <tr key={log.id} className="hover:bg-canvas/50 transition-colors">
                  <td className="py-2.5 px-4 tabular-nums font-mono text-ink-muted">
                    {formatTime(log.time)}
                  </td>
                  <td className="py-2.5 px-4 font-semibold">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      log.event === 'delayed' ? 'bg-status-delayed/15 text-status-delayed' :
                      log.event === 'completed' ? 'bg-status-inservice/15 text-status-inservice' :
                      log.event === 'priority-set' ? 'bg-status-priority/15 text-status-priority' :
                      log.event === 'no-show' ? 'bg-status-noshow/15 text-status-noshow' :
                      'bg-brand-100 text-brand-700'
                    }`}>
                      {log.event}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 tabular-nums font-mono text-ink">
                    {log.visitId || "—"}
                  </td>
                  <td className="py-2.5 px-4 text-ink font-medium">
                    {log.detail}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, subtitle }) {
  return (
    <div className="card p-4 flex flex-col justify-between text-left">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">{label}</span>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold tabular-nums text-ink fade-update">{value}</div>
        <div className="text-[11px] text-ink-muted mt-0.5">{subtitle}</div>
      </div>
    </div>
  );
}
