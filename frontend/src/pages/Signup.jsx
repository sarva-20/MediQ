import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, addToast } from '../hooks/useQueueStore';
import { createAccount } from '../mocks/store';
import { 
  User, 
  Phone, 
  Mail, 
  Lock, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  Sparkles,
  Clock,
  ShieldCheck,
  Stethoscope
} from 'lucide-react';
import { TokenDisplay } from '../components/shared';

export default function Signup() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+91 ');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Validation error states
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  // Validate inputs client-side
  const validateForm = () => {
    const newErrors = {};

    if (!name.trim()) {
      newErrors.name = 'Full name is required';
    }

    // Phone validation: must have country code prefix '+' and digits only (spaces allowed)
    const cleanedPhone = phone.replace(/\s+/g, '');
    const phoneRegex = /^\+[0-9]{1,4}[0-9]{7,12}$/;
    if (!cleanedPhone.startsWith('+')) {
      newErrors.phone = 'Phone must start with country code prefix (e.g. +91)';
    } else if (!phoneRegex.test(cleanedPhone)) {
      newErrors.phone = 'Invalid phone format. Please enter country code followed by digits only.';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!emailRegex.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    // Confirm password
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // Create user in mock store
      const newUser = await createAccount({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        password: password,
      });

      // Log in session as patient
      login({
        name: newUser.name,
        role: 'patient',
        email: newUser.email,
        phone: newUser.phone,
      });

      addToast(`Welcome to MediQ, ${newUser.name}! Your account is ready.`);
      
      // Redirect to Patient Dashboard screen
      navigate('/patient/dashboard');
    } catch (err) {
      addToast('Failed to create account. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
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
              Patient Portal
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

        {/* Middle Content: Headline, Subcopy & Visual Patient Proof Mockup */}
        <div className="my-8 lg:my-auto space-y-6 max-w-xl">
          
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-amber/20 text-accent-amber text-xs font-semibold border border-accent-amber/30">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-amber opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-amber" />
              </span>
              <span>Departure Board Patient Account</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-[1.15]">
              Skip waiting rooms <br className="hidden sm:inline" />
              forever.
            </h1>

            <p className="text-sm sm:text-base text-brand-100/90 leading-relaxed max-w-md">
              Create your account in seconds. Book appointments, track live tokens with explainable reasons, and step into the clinic right on time.
            </p>
          </div>

          {/* Mini Patient Departure Token Mockup — Desktop only */}
          <div className="hidden lg:block space-y-3 pt-2">
            
            {/* Live Token Mockup Card */}
            <div className="bg-white/15 border border-white/30 rounded-xl p-4.5 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2.5 border-b border-white/20">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-status-inservice animate-pulse" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-brand-100">Live Personal Token</span>
                </div>
                <span className="text-[11px] font-mono text-white/80">CONFIRMED SLOT</span>
              </div>

              <div className="flex items-center justify-between py-1">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-brand-100/80 font-semibold">Your Token Number</div>
                  <div className="text-3xl font-bold tabular-nums text-white mt-0.5 tracking-tight">GM-A004</div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-status-active/40 text-white border border-status-active/50">
                    Next Up (~6 min)
                  </span>
                  <div className="text-[11px] text-brand-100/80 mt-1 tabular-nums">0 ahead of you</div>
                </div>
              </div>

              <div className="bg-white/10 rounded-lg p-2.5 text-xs text-brand-100 leading-relaxed border border-white/15">
                <span className="font-bold text-white block mb-0.5">Departure Explainability:</span>
                Dr. Priya Sharma is finishing consultation with token GM-A002. Please proceed to Room 101.
              </div>
            </div>

            {/* 3 Value Pillars */}
            <div className="grid grid-cols-1 gap-2 pt-1 text-xs text-brand-100/90 font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-status-inservice shrink-0" />
                <span>Transparent ETAs calculated dynamically from doctor consultation pace</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-status-inservice shrink-0" />
                <span>Zero guesswork — arrival notifications when your doctor is ready</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-status-inservice shrink-0" />
                <span>Instant 30-second booking across 4 specialist clinical departments</span>
              </div>
            </div>

          </div>

        </div>

        {/* Bottom Stat Line */}
        <div className="pt-4 border-t border-white/15 text-xs text-brand-100/80 flex items-center justify-between">
          <span className="font-medium">45,000+ patients queued · 98% wait accuracy</span>
          <span className="text-[11px] font-mono text-white/60">MediQ Engine v2.4</span>
        </div>

      </div>

      {/* ─── RIGHT PANEL (~45% width, canvas #F6F8F7 background): SIGNUP CONTROLS ─── */}
      <div className="lg:w-[45%] bg-canvas p-6 sm:p-10 lg:p-12 flex flex-col justify-center items-center overflow-y-auto">
        <div className="w-full max-w-md space-y-6 text-left">
          
          {/* Header */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-brand-700">Patient Onboarding</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight mt-1">
              Create your account
            </h2>
            <p className="text-xs sm:text-sm text-ink-muted mt-1 leading-relaxed">
              Register as a patient to schedule appointments, view departure-board tokens, and receive live wait alerts.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-1 flex items-center gap-1">
                <User size={13} className="text-ink-muted" /> Full Name <span className="text-status-noshow">*</span>
              </label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors({ ...errors, name: null });
                }}
                className={`w-full bg-surface border rounded-lg px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:border-brand-500 ${
                  errors.name ? 'border-status-noshow bg-status-noshow/5' : 'border-hairline'
                }`}
                placeholder="e.g. Ananya Sen"
              />
              {errors.name && (
                <p className="text-xs text-status-noshow mt-1">{errors.name}</p>
              )}
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-1 flex items-center gap-1">
                <Phone size={13} className="text-ink-muted" /> Mobile Phone Number <span className="text-status-noshow">*</span>
              </label>
              <input 
                type="tel" 
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (errors.phone) setErrors({ ...errors, phone: null });
                }}
                className={`w-full bg-surface border rounded-lg px-3.5 py-2.5 text-sm text-ink font-mono focus:outline-none focus:border-brand-500 ${
                  errors.phone ? 'border-status-noshow bg-status-noshow/5' : 'border-hairline'
                }`}
                placeholder="+91 98765 43210"
              />
              <span className="text-[11px] text-ink-muted mt-0.5 block">
                Digits only with country code prefix (e.g. +91)
              </span>
              {errors.phone && (
                <p className="text-xs text-status-noshow mt-1">{errors.phone}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-1 flex items-center gap-1">
                <Mail size={13} className="text-ink-muted" /> Email Address <span className="text-status-noshow">*</span>
              </label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors({ ...errors, email: null });
                }}
                className={`w-full bg-surface border rounded-lg px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:border-brand-500 ${
                  errors.email ? 'border-status-noshow bg-status-noshow/5' : 'border-hairline'
                }`}
                placeholder="name@example.com"
              />
              {errors.email && (
                <p className="text-xs text-status-noshow mt-1">{errors.email}</p>
              )}
            </div>

            {/* Passwords (Side by side on sm screens) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-1 flex items-center gap-1">
                  <Lock size={13} className="text-ink-muted" /> Password <span className="text-status-noshow">*</span>
                </label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors({ ...errors, password: null });
                  }}
                  className={`w-full bg-surface border rounded-lg px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:border-brand-500 ${
                    errors.password ? 'border-status-noshow bg-status-noshow/5' : 'border-hairline'
                  }`}
                  placeholder="Min 6 characters"
                />
                {errors.password && (
                  <p className="text-xs text-status-noshow mt-1">{errors.password}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-1 flex items-center gap-1">
                  <Lock size={13} className="text-ink-muted" /> Confirm Password <span className="text-status-noshow">*</span>
                </label>
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: null });
                  }}
                  className={`w-full bg-surface border rounded-lg px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:border-brand-500 ${
                    errors.confirmPassword ? 'border-status-noshow bg-status-noshow/5' : 'border-hairline'
                  }`}
                  placeholder="Repeat password"
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-status-noshow mt-1">{errors.confirmPassword}</p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full py-3 bg-accent-amber text-white rounded-lg text-sm font-semibold hover:bg-accent-amber/90 transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? "Creating Account..." : "Create Account"}
                <ArrowRight size={15} />
              </button>
            </div>

          </form>

          {/* Bottom Login Link & Return Home */}
          <div className="pt-3 border-t border-hairline flex flex-col sm:flex-row items-center justify-between text-xs text-ink-muted gap-2">
            <div>
              Already have an account?{' '}
              <Link to="/login" className="font-bold text-accent-amber hover:underline">
                Log in to MediQ
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
