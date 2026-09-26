import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  Clock, 
  CalendarCheck, 
  Smartphone, 
  BellRing, 
  ShieldCheck, 
  Star, 
  CheckCircle2, 
  Users, 
  Stethoscope, 
  Sparkles,
  ExternalLink,
  Building2,
  ChevronRight
} from 'lucide-react';
import { LiveIndicator } from '../components/shared';

export default function Landing() {
  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col font-sans selection:bg-brand-100 selection:text-brand-700">
      
      {/* ─── PUBLIC TOP NAV ─── */}
      <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-none border-b border-hairline transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo & Status */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-2xl font-bold tracking-tight text-brand-700">MediQ</span>
            </Link>
            <div className="hidden sm:block pl-3 border-l border-hairline">
              <LiveIndicator />
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-ink-muted">
            <a href="#how-it-works" className="hover:text-brand-700 transition-colors">How it works</a>
            <a href="#impact" className="hover:text-brand-700 transition-colors">Impact & Stats</a>
            <a href="#testimonials" className="hover:text-brand-700 transition-colors">Reviews</a>
            <Link to="/status/GM-A002" target="_blank" className="text-accent-amber hover:underline transition-colors flex items-center gap-1 font-medium">
              Live Departure Board <ExternalLink size={12} />
            </Link>
          </nav>

          {/* CTAs */}
          <div className="flex items-center gap-3">
            <Link 
              to="/login" 
              className="text-xs sm:text-sm font-semibold text-ink-muted hover:text-brand-700 px-3 py-2 transition-colors"
            >
              Sign In
            </Link>
            <Link 
              to="/signup" 
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent-amber text-white rounded-lg text-xs sm:text-sm font-semibold hover:bg-accent-amber/90 transition-colors shadow-sm"
            >
              Get Started <ArrowRight size={14} />
            </Link>
          </div>

        </div>
      </header>

      {/* ─── HERO SECTION ─── */}
      <section className="py-12 sm:py-20 lg:py-24 border-b border-hairline bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Column (Content) */}
            <div className="lg:col-span-7 flex flex-col items-start text-left space-y-6">
              
              {/* Tag chip */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-amber/15 text-accent-amber text-xs font-semibold border border-accent-amber/30">
                <Sparkles size={14} className="text-accent-amber" />
                <span>The Clinical Departure Board System</span>
              </div>

              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-ink leading-[1.12]">
                Skip the wait. <br />
                <span className="text-brand-700">Know exactly</span> when it's your turn.
              </h1>

              {/* Subcopy */}
              <p className="text-base sm:text-lg text-ink-muted max-w-xl leading-relaxed">
                MediQ turns crowded clinic waiting rooms into calm, predictable departure lounges with transparent wait times, explainable delays, and instant booking.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto pt-2">
                <Link
                  to="/signup"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-accent-amber text-white rounded-xl text-sm font-semibold hover:bg-accent-amber/90 transition-colors shadow-sm text-center"
                >
                  Book an appointment
                  <ArrowRight size={16} />
                </Link>
                <Link
                  to="/status/GM-A002"
                  target="_blank"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 card border border-hairline text-accent-amber rounded-xl text-sm font-semibold hover:bg-canvas transition-colors text-center"
                >
                  Explore live departure board
                  <ExternalLink size={14} className="text-accent-amber" />
                </Link>
              </div>

              {/* Stat Chip: 98% wait-time accuracy with circular ring */}
              <div className="pt-4 flex items-center gap-4 border-t border-hairline w-full max-w-md">
                <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                  <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-hairline"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-accent-amber"
                      strokeDasharray="98, 100"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <span className="absolute text-[11px] font-bold tabular-nums text-accent-amber">98%</span>
                </div>
                <div>
                  <div className="text-xs font-bold text-ink uppercase tracking-wider">
                    Wait-Time Accuracy
                  </div>
                  <div className="text-xs text-ink-muted mt-0.5">
                    Trained on real consultation throughput & buffer models
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column (Visual Mockup Panel with Overlaid Floating Cards) */}
            <div className="lg:col-span-5 relative">
              
              {/* Main Panel Canvas */}
              <div className="card rounded-xl border border-hairline p-6 bg-canvas shadow-card relative overflow-hidden">
                
                {/* Live Departure Preview Hero */}
                <div className="card p-6 bg-surface border border-hairline rounded-xl shadow-sm text-left space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-hairline">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-status-inservice animate-pulse" />
                      <span className="text-xs font-bold uppercase tracking-wider text-brand-700">Live Departure Display</span>
                    </div>
                    <span className="text-[11px] font-mono text-ink-muted">ROOM 101</span>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <div>
                      <div className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Your Token</div>
                      <div className="text-4xl font-bold tabular-nums text-brand-700 tracking-tight mt-1">GM-A003</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Estimated Wait</div>
                      <div className="text-2xl font-bold tabular-nums text-ink mt-1">~12 min</div>
                    </div>
                  </div>

                  <div className="bg-brand-100/70 border border-brand-500/20 rounded-lg p-3 text-xs">
                    <span className="font-bold text-brand-700 block mb-0.5">Explainable Queue Reason</span>
                    <span className="text-ink">Dr. Priya Sharma is consulting with token GM-A002 (~4m left).</span>
                  </div>

                  <div className="flex items-center justify-between pt-2 text-xs text-ink-muted border-t border-hairline">
                    <span className="flex items-center gap-1 font-medium text-ink">
                      <Stethoscope size={13} className="text-brand-700" /> Dr. Priya Sharma
                    </span>
                    <span className="tabular-nums font-semibold text-status-inservice">1 Patient ahead</span>
                  </div>
                </div>

                {/* Bottom decorative preview row */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="card p-3 bg-surface border border-hairline rounded-lg text-left">
                    <div className="text-[10px] uppercase font-bold text-ink-muted">Now Serving</div>
                    <div className="text-lg font-bold text-status-inservice tabular-nums mt-0.5">GM-A002</div>
                    <div className="text-[11px] text-ink-muted truncate">Lakshmi V.</div>
                  </div>

                  <div className="card p-3 bg-surface border border-hairline rounded-lg text-left">
                    <div className="text-[10px] uppercase font-bold text-ink-muted">Queue Status</div>
                    <div className="text-lg font-bold text-brand-700 tabular-nums mt-0.5">On Schedule</div>
                    <div className="text-[11px] text-ink-muted">No delays reported</div>
                  </div>
                </div>

              </div>

              {/* Floating Stat Card 1: 300+ Providers (Top-Right Offset) */}
              <div className="absolute -top-4 -right-2 sm:-right-4 card p-3.5 bg-surface border border-hairline rounded-xl shadow-md flex items-center gap-3 z-10">
                <div className="w-10 h-10 rounded-lg bg-brand-100 flex items-center justify-center text-brand-700 shrink-0">
                  <Users size={20} />
                </div>
                <div className="text-left pr-2">
                  <div className="text-base font-bold tabular-nums text-ink">300+</div>
                  <div className="text-[11px] text-ink-muted font-medium">Onboarded Providers</div>
                </div>
              </div>

              {/* Floating Stat Card 2: Live Queue Tracking (Bottom-Left Offset) */}
              <div className="absolute -bottom-4 -left-2 sm:-left-4 card p-3.5 bg-surface border border-hairline rounded-xl shadow-md flex items-center gap-3 z-10">
                <div className="w-10 h-10 rounded-lg bg-status-inservice/15 text-status-inservice flex items-center justify-center shrink-0">
                  <Clock size={20} />
                </div>
                <div className="text-left pr-2">
                  <div className="text-xs font-bold text-ink flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-status-inservice animate-ping" />
                    Live Queue Tracking
                  </div>
                  <div className="text-[11px] text-ink-muted">Real-time mobile updates</div>
                </div>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* ─── TRUST & STATS BAND ─── */}
      <section id="impact" className="py-14 sm:py-18 bg-canvas border-b border-hairline">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="mb-8 text-left">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-700">Proven Operational Metrics</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight mt-1">
              Trusted by clinical teams across the country
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Stat 1 */}
            <div className="card p-6 rounded-xl border border-hairline bg-surface text-left flex flex-col justify-between">
              <div>
                <div className="text-3xl sm:text-4xl font-bold tabular-nums text-brand-700 tracking-tight">
                  120+
                </div>
                <div className="text-sm font-bold text-ink mt-2">Clinics & Polyclinics</div>
                <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                  Operating with zero waiting room congestion and calm patient flow.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-hairline text-[11px] text-brand-700 font-semibold flex items-center gap-1">
                <Building2 size={13} /> Across 14 metropolitan cities
              </div>
            </div>

            {/* Stat 2 */}
            <div className="card p-6 rounded-xl border border-hairline bg-surface text-left flex flex-col justify-between">
              <div>
                <div className="text-3xl sm:text-4xl font-bold tabular-nums text-brand-700 tracking-tight">
                  45,000+
                </div>
                <div className="text-sm font-bold text-ink mt-2">Patients Queued Daily</div>
                <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                  Receiving automated live token updates right on their smartphones.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-hairline text-[11px] text-brand-700 font-semibold flex items-center gap-1">
                <Smartphone size={13} /> 99.4% mobile tracking rate
              </div>
            </div>

            {/* Stat 3 */}
            <div className="card p-6 rounded-xl border border-hairline bg-surface text-left flex flex-col justify-between">
              <div>
                <div className="text-3xl sm:text-4xl font-bold tabular-nums text-brand-700 tracking-tight">
                  1,800+
                </div>
                <div className="text-sm font-bold text-ink mt-2">Specialist Doctors</div>
                <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                  Using the provider operations console for orderly, focused care.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-hairline text-[11px] text-brand-700 font-semibold flex items-center gap-1">
                <Stethoscope size={13} /> 4 core clinical departments
              </div>
            </div>

            {/* Stat 4: Mixed with supporting visual badge */}
            <div className="card p-6 rounded-xl border border-hairline bg-brand-100/40 text-left flex flex-col justify-between relative overflow-hidden">
              <div>
                <div className="text-3xl sm:text-4xl font-bold tabular-nums text-brand-700 tracking-tight">
                  42%
                </div>
                <div className="text-sm font-bold text-ink mt-2">Avg. Wait Reduction</div>
                <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                  Patients arrive just in time instead of waiting 60+ minutes in clinic lobbies.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-brand-500/20 text-[11px] text-brand-700 font-bold flex items-center gap-1">
                <CheckCircle2 size={13} className="text-status-inservice" /> Verified clinic audit
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ─── HOW IT WORKS SECTION ─── */}
      <section id="how-it-works" className="py-16 sm:py-24 bg-surface border-b border-hairline">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="max-w-2xl text-left mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-700">Simple 3-Step Process</span>
            <h2 className="text-3xl font-bold text-ink tracking-tight mt-1">
              How MediQ reimagines the clinic visit
            </h2>
            <p className="text-sm text-ink-muted mt-2">
              From appointment booking to doctor consultation, every step is transparent and glanceable.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Step 1 */}
            <div className="card p-6 rounded-xl border border-hairline bg-surface text-left relative flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-base mb-4">
                  01
                </div>
                <h3 className="text-lg font-bold text-ink">Book or walk in</h3>
                <p className="text-xs text-ink-muted mt-2 leading-relaxed">
                  Schedule an online slot in 30 seconds or generate a walk-in token at reception. Our smart triage automatically pairs you with the shortest available queue.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-hairline flex items-center gap-2 text-xs font-medium text-brand-700">
                <CalendarCheck size={16} /> Instant slot capacity validation
              </div>
            </div>

            {/* Step 2 */}
            <div className="card p-6 rounded-xl border border-hairline bg-surface text-left relative flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-base mb-4">
                  02
                </div>
                <h3 className="text-lg font-bold text-ink">Get a live token</h3>
                <p className="text-xs text-ink-muted mt-2 leading-relaxed">
                  Open your personalized departure board link on any mobile browser. Watch your queue position, estimated consultation time, and explainable delay reasons.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-hairline flex items-center gap-2 text-xs font-medium text-brand-700">
                <Smartphone size={16} /> Glanceable airport-style display
              </div>
            </div>

            {/* Step 3 */}
            <div className="card p-6 rounded-xl border border-hairline bg-surface text-left relative flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-base mb-4">
                  03
                </div>
                <h3 className="text-lg font-bold text-ink">Step in when called</h3>
                <p className="text-xs text-ink-muted mt-2 leading-relaxed">
                  Arrive calm and unhurried right when your token turns active. Walk straight into the doctor's room without spending an hour in a noisy waiting area.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-hairline flex items-center gap-2 text-xs font-medium text-brand-700">
                <BellRing size={16} /> Proactive now-serving alerts
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ─── TESTIMONIALS SECTION ─── */}
      <section id="testimonials" className="py-16 sm:py-24 bg-canvas border-b border-hairline">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="max-w-2xl text-left mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-700">Patient & Practitioner Stories</span>
            <h2 className="text-3xl font-bold text-ink tracking-tight mt-1">
              Quiet lobbies. Satisfied patients.
            </h2>
            <p className="text-sm text-ink-muted mt-2">
              Hear from clinics and families who replaced queue guessing games with MediQ.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Testimonial 1 */}
            <div className="card p-6 rounded-xl border border-hairline bg-surface text-left flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex text-status-priority gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={15} fill="currentColor" />
                  ))}
                </div>
                <p className="text-xs text-ink leading-relaxed italic">
                  "As a senior consultant seeing 30 patients a day, MediQ gave me control back over my schedule. When a complex case overruns, downstream patients instantly see why and don't get frustrated."
                </p>
              </div>
              <div className="pt-4 border-t border-hairline mt-4">
                <div className="text-sm font-bold text-ink">Dr. Priya Sharma</div>
                <div className="text-xs text-ink-muted">Senior Consultant, General Medicine</div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="card p-6 rounded-xl border border-hairline bg-surface text-left flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex text-status-priority gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={15} fill="currentColor" />
                  ))}
                </div>
                <p className="text-xs text-ink leading-relaxed italic">
                  "I was able to wait at the café down the street with my elderly mother. The departure board on my phone showed 2 patients ahead and estimated 15 minutes. We walked in right as her token was called."
                </p>
              </div>
              <div className="pt-4 border-t border-hairline mt-4">
                <div className="text-sm font-bold text-ink">Lakshmi Venkatesh</div>
                <div className="text-xs text-ink-muted">Patient Family Member</div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="card p-6 rounded-xl border border-hairline bg-surface text-left flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex text-status-priority gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={15} fill="currentColor" />
                  ))}
                </div>
                <p className="text-xs text-ink leading-relaxed italic">
                  "Front desk stress dropped drastically within our first week. Receptionists no longer spend half their day answering 'How much longer doctor?' Patients scan the QR code and are totally reassured."
                </p>
              </div>
              <div className="pt-4 border-t border-hairline mt-4">
                <div className="text-sm font-bold text-ink">Rajesh Raman</div>
                <div className="text-xs text-ink-muted">Clinic Operations Administrator</div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ─── FULL-WIDTH BRAND-700 CTA BANNER ─── */}
      <section className="bg-brand-700 text-white py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 text-left">
            
            <div className="max-w-2xl space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-accent-amber bg-accent-amber/20 px-2.5 py-0.5 rounded-full inline-block border border-accent-amber/30">
                Experience Calmer Clinical Care
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
                Transform your clinic into an unhurried, transparent space.
              </h2>
              <p className="text-sm sm:text-base text-white leading-relaxed max-w-xl font-normal">
                Create a patient account in seconds or explore our interactive simulator to see live queue dispatching in action.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 w-full sm:w-auto">
              <Link
                to="/signup"
                className="px-6 py-3.5 bg-accent-amber text-white hover:bg-accent-amber/90 rounded-xl text-sm font-bold transition-colors text-center shadow-sm"
              >
                Get started free
              </Link>
              <Link
                to="/login"
                className="px-6 py-3.5 border border-white/40 text-white hover:bg-white/10 rounded-xl text-sm font-semibold transition-colors text-center"
              >
                Sign In to Demo
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="bg-surface border-t border-hairline py-12 text-ink">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 text-left">
            
            {/* Col 1: Brand & Tagline */}
            <div className="md:col-span-2 space-y-3">
              <span className="text-2xl font-bold tracking-tight text-brand-700">MediQ</span>
              <p className="text-xs text-ink-muted leading-relaxed max-w-sm">
                The calm, departure-board queue intelligence system for modern clinical care. Eliminating waiting room chaos with live explainable ETAs.
              </p>
              <div className="pt-2">
                <span className="text-[11px] font-mono text-ink-muted">Asia/Kolkata Engine • Tabular Num Precision</span>
              </div>
            </div>

            {/* Col 2: Product */}
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-ink">Product</div>
              <ul className="space-y-1.5 text-xs text-ink-muted">
                <li><Link to="/patient/book" className="hover:text-brand-700 transition-colors">Book Appointment</Link></li>
                <li><Link to="/reception/walkin" className="hover:text-brand-700 transition-colors">Walk-in Triage</Link></li>
                <li><Link to="/status/GM-A002" target="_blank" className="hover:text-brand-700 transition-colors">Departure Board</Link></li>
                <li><Link to="/provider/queue" className="hover:text-brand-700 transition-colors">Provider Console</Link></li>
                <li><Link to="/admin/simulator" className="hover:text-brand-700 transition-colors">Time Simulator</Link></li>
              </ul>
            </div>

            {/* Col 3: Company */}
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-ink">Company</div>
              <ul className="space-y-1.5 text-xs text-ink-muted">
                <li><a href="#about" className="hover:text-brand-700 transition-colors">About MediQ</a></li>
                <li><a href="#impact" className="hover:text-brand-700 transition-colors">Clinical Impact</a></li>
                <li><a href="#testimonials" className="hover:text-brand-700 transition-colors">Case Studies</a></li>
                <li><a href="#careers" className="hover:text-brand-700 transition-colors">Careers</a></li>
              </ul>
            </div>

            {/* Col 4: Support */}
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-ink">Support</div>
              <ul className="space-y-1.5 text-xs text-ink-muted">
                <li><a href="#help" className="hover:text-brand-700 transition-colors">Help Center</a></li>
                <li><a href="#privacy" className="hover:text-brand-700 transition-colors">Privacy Policy</a></li>
                <li><a href="#terms" className="hover:text-brand-700 transition-colors">Terms of Service</a></li>
                <li><a href="#security" className="hover:text-brand-700 transition-colors">HIPAA Compliance</a></li>
              </ul>
            </div>

          </div>

          <div className="mt-12 pt-6 border-t border-hairline flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-ink-muted gap-4">
            <div>© 2026 MediQ Health Technologies. All rights reserved.</div>
            <div className="flex gap-4">
              <span>Departure Board Architecture</span>
              <span>•</span>
              <span>Zero-backend Mock Engine</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
