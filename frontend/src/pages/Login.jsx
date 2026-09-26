import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useQueueStore';
import { ROLES, DEMO_ACCOUNTS } from '../lib/utils';
import { 
  User, 
  UserCog, 
  Stethoscope, 
  Shield, 
  ArrowRight, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  Activity, 
  Star,
  ArrowLeft
} from 'lucide-react';
import { LiveIndicator } from '../components/shared';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleManualLogin = (e) => {
    e.preventDefault();
    const role = 'patient';
    const user = { name: username.trim() || 'Arjun Mehta', role };
    login(user);
    navigate(ROLES[role]?.home || '/patient/dashboard');
  };

  const handleDemoLogin = (account) => {
    const user = { 
      name: account.name, 
      role: account.role, 
      providerId: account.role === 'provider' ? 'p1' : undefined 
    };
    login(user);
    const dest = ROLES[account.role]?.home || '/patient/dashboard';
    navigate(dest);
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'patient': return <User className="w-4 h-4 text-brand-700" />;
      case 'receptionist': return <UserCog className="w-4 h-4 text-brand-700" />;
      case 'provider': return <Stethoscope className="w-4 h-4 text-brand-700" />;
      case 'admin': return <Shield className="w-4 h-4 text-brand-700" />;
      default: return <User className="w-4 h-4 text-brand-700" />;
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col lg:flex-row font-sans selection:bg-brand-100 selection:text-brand-700">
      
      {/* ─── LEFT PANEL (~55% width, brand-700 #0B6E7D background): BRAND MOMENT ─── */}
      <div className="lg:w-[55%] bg-brand-700 text-white p-6 sm:p-10 lg:p-14 flex flex-col justify-between shrink-0 relative overflow-hidden">
        
        {/* Top Header: Logo + Back to Home */}
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-white">MediQ</span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-brand-100/80 border border-white/25 px-2 py-0.5 rounded">
              Departure System
            </span>
          </Link>
          
          <Link 
            to="/" 
            className="flex items-center gap-1.5 text-xs font-semibold text-brand-100 hover:text-white transition-colors"
          >
            <ArrowLeft size={13} />
            <span className="hidden sm:inline">Back to</span> Home
          </Link>
        </div>

        {/* Middle Content: Headline, Subcopy & Mini Live Queue Ticker Mockup */}
        <div className="my-8 lg:my-auto space-y-6 max-w-xl">
          
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-amber/20 text-accent-amber text-xs font-semibold border border-accent-amber/30">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-amber opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-amber" />
              </span>
              <span>Live Queue Proof Engine</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-[1.15]">
              Every token, <br className="hidden sm:inline" />
              tracked live.
            </h1>

            <p className="text-sm sm:text-base text-brand-100/90 leading-relaxed max-w-md">
              Calm, explainable departure-board queues for modern clinics and hospitals — transparent wait times with zero lobby guessing.
            </p>
          </div>

          {/* Mini Live Queue Ticker Mockup — Desktop only visual proof */}
          <div className="hidden lg:block space-y-2.5 pt-2">
            <div className="text-[11px] uppercase tracking-wider font-bold text-brand-100/70 mb-1 flex items-center justify-between">
              <span>Live Ops Departure Stream (Simulated IST)</span>
              <span className="text-white/60 font-mono">Room 101–103</span>
            </div>

            {/* Row 1 — Actively Pulsing (In-Service) */}
            <div className="bg-white/15 border-2 border-white/40 rounded-xl p-3.5 flex items-center justify-between shadow-sm animate-pulse">
              <div className="flex items-center gap-3">
                <div className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-inservice opacity-80" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-status-inservice" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold tabular-nums text-white">GM-A002</span>
                    <span className="text-xs font-semibold text-white/95">Lakshmi Venkatesh</span>
                  </div>
                  <div className="text-[11px] text-brand-100/80">Dr. Priya Sharma · In consultation</div>
                </div>
              </div>

              <div className="text-right">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-status-inservice/30 text-white border border-status-inservice/40">
                  In Service
                </span>
                <div className="text-[10px] tabular-nums text-brand-100/80 mt-0.5">8m elapsed</div>
              </div>
            </div>

            {/* Row 2 — Next Up (Checked In) */}
            <div className="bg-white/10 border border-white/20 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-brand-100 shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold tabular-nums text-white">GM-A003</span>
                    <span className="text-xs font-medium text-white/90">Deepak Kumar</span>
                  </div>
                  <div className="text-[11px] text-brand-100/70">Dr. Priya Sharma · Next patient</div>
                </div>
              </div>

              <div className="text-right">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-brand-100/20 text-white">
                  Next Up (~4m)
                </span>
                <div className="text-[10px] text-brand-100/60 mt-0.5">0 ahead</div>
              </div>
            </div>

            {/* Row 3 — Walk-In Scheduled */}
            <div className="bg-white/10 border border-white/20 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-status-delayed shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold tabular-nums text-white">GM-W001</span>
                    <span className="text-xs font-medium text-white/90">Ananya Das</span>
                    <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded font-semibold text-brand-100">Walk-in</span>
                  </div>
                  <div className="text-[11px] text-brand-100/70">Dr. Arvind Rao · Shortest queue</div>
                </div>
              </div>

              <div className="text-right">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white/15 text-white">
                  ~14 min
                </span>
                <div className="text-[10px] text-brand-100/60 mt-0.5">1 ahead</div>
              </div>
            </div>

            {/* Row 4 — Priority Case */}
            <div className="bg-white/10 border border-status-priority/40 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-status-priority shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold tabular-nums text-white">OPH-A002</span>
                    <span className="text-xs font-medium text-white/90">Rahul Khanna</span>
                    <span className="text-[10px] bg-status-priority/30 text-white px-1.5 py-0.2 rounded font-bold flex items-center gap-0.5">
                      <Star size={9} fill="currentColor" /> Priority
                    </span>
                  </div>
                  <div className="text-[11px] text-brand-100/70">Dr. Sunita Nair · Acute vision triage</div>
                </div>
              </div>

              <div className="text-right">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-status-priority/20 text-white">
                  ~10 min
                </span>
                <div className="text-[10px] text-brand-100/60 mt-0.5">Triaged top</div>
              </div>
            </div>

          </div>

        </div>

        {/* Bottom Stat Line */}
        <div className="pt-4 border-t border-white/15 text-xs text-brand-100/80 flex items-center justify-between">
          <span className="font-medium">500+ providers · 15,000+ visits queued</span>
          <span className="text-[11px] font-mono text-white/60">MediQ Engine v2.4</span>
        </div>

      </div>

      {/* ─── RIGHT PANEL (~45% width, canvas #F6F8F7 background): LOGIN CONTROLS ─── */}
      <div className="lg:w-[45%] bg-canvas p-6 sm:p-10 lg:p-12 flex flex-col justify-center items-center overflow-y-auto">
        <div className="w-full max-w-md space-y-6 text-left">
          
          {/* Header */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-brand-700">Account Access</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight mt-1">
              Sign in to MediQ
            </h2>
            <p className="text-xs sm:text-sm text-ink-muted mt-1 leading-relaxed">
              Use one-click demo profiles for instant role simulation, or sign in with credentials.
            </p>
          </div>

          {/* Demo Accounts Panel */}
          <div className="card p-4 bg-surface border border-hairline rounded-xl shadow-card space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-hairline">
              <span className="text-xs font-bold uppercase tracking-wider text-accent-amber flex items-center gap-1.5">
                <Sparkles size={13} className="text-accent-amber" /> One-Click Demo Access
              </span>
              <span className="text-[11px] text-ink-muted">Instant role switch</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.role}
                  onClick={() => handleDemoLogin(account)}
                  className="flex items-center justify-between p-2.5 card bg-canvas hover:border-brand-500 hover:bg-brand-100/40 transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1.5 bg-brand-100 rounded-md group-hover:bg-brand-700 group-hover:text-white transition-colors shrink-0">
                      {getRoleIcon(account.role)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-ink text-xs truncate group-hover:text-brand-700 transition-colors">
                        {account.name}
                      </div>
                      <div className="text-[11px] text-ink-muted truncate">{account.subtitle}</div>
                    </div>
                  </div>
                  <ArrowRight size={13} className="text-ink-muted group-hover:text-brand-700 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-1">
            <div className="absolute border-t border-hairline w-full"></div>
            <div className="bg-canvas px-3 text-[11px] uppercase tracking-wider text-ink-muted relative z-10 font-medium">
              or enter credentials
            </div>
          </div>

          {/* Manual Login Form */}
          <form onSubmit={handleManualLogin} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-1">
                Username / Patient ID
              </label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-surface border border-hairline rounded-lg px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:border-brand-500"
                placeholder="e.g. arjun.mehta or demo user"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-1">
                Password
              </label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-surface border border-hairline rounded-lg px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:border-brand-500"
                placeholder="•••••••• (any password accepted)"
              />
            </div>

            <button 
              type="submit" 
              className="w-full py-3 bg-accent-amber text-white text-sm font-semibold rounded-lg hover:bg-accent-amber/90 transition-colors cursor-pointer shadow-sm mt-1"
            >
              Sign In to MediQ
            </button>
          </form>

          {/* Bottom Links: Create Account & Home */}
          <div className="pt-3 border-t border-hairline flex flex-col sm:flex-row items-center justify-between text-xs text-ink-muted gap-2">
            <div>
              Don't have an account?{' '}
              <Link to="/signup" className="font-bold text-accent-amber hover:underline">
                Create account
              </Link>
            </div>
            <Link to="/" className="text-ink-muted hover:text-brand-700 transition-colors">
              ← Return to Home
            </Link>
          </div>

        </div>
      </div>

    </div>
  );
}
