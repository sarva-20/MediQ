import React, { useState } from "react";
import { NavLink, Outlet, useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useQueueStore";
import { useSimClock } from "../hooks/useQueueStore";
import { useToasts } from "../hooks/useQueueStore";
import { LiveIndicator } from "./shared";
import { formatTime } from "../lib/utils";
import { useLang } from "../lib/i18n";
import ChatAssistant from "./ChatAssistant";
import { motion, useReducedMotion } from "framer-motion";
import {
  CalendarPlus, 
  ClipboardList, 
  LayoutDashboard, 
  UserPlus, 
  Stethoscope, 
  BarChart3, 
  Settings, 
  UserCog, 
  PlayCircle,
  LogOut, 
  Clock,
  Menu,
  X,
  Home
} from "lucide-react";

const NAV_ITEMS = {
  patient: [
    { to: "/patient/dashboard", labelKey: "dashboard", icon: Home },
    { to: "/patient/book", labelKey: "book_appointment", icon: CalendarPlus },
    { to: "/patient/visits", labelKey: "my_visits", icon: ClipboardList },
  ],
  receptionist: [
    { to: "/reception/queue", labelKey: "queue_board", icon: LayoutDashboard },
    { to: "/reception/walkin", labelKey: "walk_in", icon: UserPlus },
    { to: "/reception/appointments", labelKey: "appointments", icon: CalendarPlus },
  ],
  provider: [
    { to: "/provider/queue", labelKey: "my_queue", icon: Stethoscope },
  ],
  admin: [
    { to: "/admin/overview", labelKey: "overview", icon: BarChart3 },
    { to: "/admin/queue", labelKey: "queue_board", icon: LayoutDashboard },
    { to: "/admin/settings", labelKey: "settings", icon: Settings },
    { to: "/admin/providers", labelKey: "providers", icon: UserCog },
    { to: "/admin/simulator", labelKey: "simulator", icon: PlayCircle },
  ],
};

function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <button
      onClick={() => setLang(lang === "en" ? "ta" : "en")}
      className="px-2 py-1 rounded-full border border-hairline text-[11px] font-bold text-ink-muted hover:text-brand-700 hover:border-brand-500 transition-colors cursor-pointer"
      title="Switch language / மொழி மாற்று"
    >
      {lang === "en" ? "தமிழ்" : "EN"}
    </button>
  );
}

function FloatingNavBar() {
  const { user, logout } = useAuth();
  const { t } = useLang();
  const { now } = useSimClock();
  const navigate = useNavigate();
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const items = NAV_ITEMS[user?.role] || [];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Spring transition for the liquid morph pill.
  // stiffness/damping chosen so width overshoots briefly (squash-stretch) before settling.
  // type:"tween" is used as instant fallback when prefers-reduced-motion is set.
  const pillTransition = prefersReducedMotion
    ? { type: "tween", duration: 0 }
    : {
        type: "spring",
        stiffness: 380,
        damping: 28,
        mass: 1,
      };

  return (
    <>
      {/* Floating Pill Nav Bar */}
      <header className="mx-3 sm:mx-6 lg:mx-8 mt-3 sm:mt-4 mb-4 bg-surface border border-hairline rounded-2xl shadow-card px-3 sm:px-5 py-2.5 flex items-center justify-between gap-2 shrink-0 z-30 transition-all">
        
        {/* Left: Logo & Live Indicator */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl font-bold text-brand-700 tracking-tight">MediQ</span>
          </Link>
          <div className="pl-2 border-l border-hairline flex items-center">
            <LiveIndicator />
          </div>
        </div>

        {/* Center: Desktop Nav Items — liquid morphing active pill */}
        {/*
          Architecture: items are rendered as a flex row of <NavLink> wrappers that are
          "position: relative" containers. When an item is active we render a
          motion.div (layoutId="nav-pill") INSIDE that container as an absolute
          background. Framer Motion's shared-layout system detects the layoutId moving
          between containers on route change and animates the pill's position + size
          with a spring, producing the squash-and-stretch morph at no extra cost.
        */}
        <nav className="hidden md:flex items-center gap-0.5 lg:gap-1 shrink-0">
          {items.map((item) => {
            const isActive = location.pathname === item.to ||
              (item.to !== "/" && location.pathname.startsWith(item.to));

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold select-none"
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                {/* Liquid morphing pill — only rendered for the active item */}
                {isActive && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-full bg-brand-700"
                    transition={pillTransition}
                    // layout="preserve-aspect" is intentionally NOT set so Framer
                    // can freely interpolate width and height independently —
                    // that's what produces the squash-and-stretch overshoot.
                    style={{ originX: 0.5, originY: 0.5 }}
                    aria-hidden="true"
                  />
                )}

                {/* Icon + label sit above the pill via relative z-index */}
                <item.icon
                  size={14}
                  className={`relative z-10 transition-colors duration-150 ${
                    isActive ? "text-white" : "text-ink-muted group-hover:text-ink"
                  }`}
                />
                <span
                  className={`relative z-10 transition-colors duration-150 ${
                    isActive ? "text-white" : "text-ink-muted hover:text-ink"
                  }`}
                >
                  {t(item.labelKey)}
                </span>
              </NavLink>
            );
          })}
        </nav>

        {/* Right: Clock Widget, User Pill, Logout / Hamburger */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">

          <LangToggle />

          {/* Simulated Clock Widget (Visible on all breakpoints, responsive text) */}
          <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1 border border-dashed border-ink-muted/30 rounded-full bg-canvas text-xs font-mono font-medium text-ink">
            <Clock size={13} className="text-ink-muted shrink-0" />
            <span className="tabular-nums font-semibold">{formatTime(now)}</span>
            <span className="hidden sm:inline text-[9px] font-bold text-accent-amber bg-accent-amber/15 px-1.5 py-0.2 rounded font-sans border border-accent-amber/25">
              DEMO
            </span>
          </div>

          {/* User Badge */}
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="text-xs font-semibold text-ink max-w-[110px] truncate">
              {user?.name?.split(' ')[0] || user?.name}
            </span>
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 font-bold">
              {user?.role}
            </span>
          </div>

          {/* Desktop Logout Button */}
          <button
            onClick={handleLogout}
            className="hidden md:flex items-center gap-1 text-xs font-semibold text-ink-muted hover:text-status-noshow px-2 py-1 rounded transition-colors cursor-pointer"
            title="Log out"
          >
            <LogOut size={14} />
            <span className="hidden lg:inline">{t("logout")}</span>
          </button>

          {/* Mobile Hamburger Button (<768px) */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden p-1.5 rounded-lg text-ink hover:bg-canvas border border-hairline transition-colors cursor-pointer"
            aria-label="Open navigation menu"
          >
            <Menu size={18} />
          </button>
        </div>

      </header>

      {/* ─── MOBILE SLIDE-IN PANEL (<768px) ─── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end md:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-ink/30 transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Slide-in Drawer */}
          <div className="relative w-4/5 max-w-xs bg-surface h-full shadow-xl border-l border-hairline p-5 flex flex-col justify-between z-10 animate-in slide-in-from-right duration-200">
            
            {/* Drawer Header */}
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-hairline mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-brand-700">MediQ</span>
                  <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded bg-brand-100 text-brand-700 font-bold">
                    {user?.role}
                  </span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-lg text-ink-muted hover:text-ink hover:bg-canvas"
                >
                  <X size={20} />
                </button>
              </div>

              {/* User Profile in Drawer */}
              <div className="bg-canvas p-3 rounded-xl border border-hairline mb-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-ink">{user?.name}</div>
                  <div className="text-[11px] text-ink-muted capitalize">{user?.role} Session</div>
                </div>
                <LiveIndicator />
              </div>

              {/* Vertical Nav Items */}
              <nav className="space-y-1">
                {items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        isActive
                          ? "bg-brand-100 text-brand-700"
                          : "text-ink-muted hover:text-ink hover:bg-canvas"
                      }`
                    }
                  >
                    <item.icon size={18} />
                    <span>{t(item.labelKey)}</span>
                  </NavLink>
                ))}
              </nav>
            </div>

            {/* Drawer Footer: Logout */}
            <div className="pt-4 border-t border-hairline">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-status-noshow hover:bg-status-noshow/10 border border-hairline transition-colors"
              >
                <LogOut size={16} /> Sign Out
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}

export function ToastContainer() {
  const toasts = useToasts();
  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`card px-4 py-3 text-sm font-medium fade-update ${
            t.type === "error"
              ? "text-status-noshow border-status-noshow/30"
              : "text-status-inservice border-status-inservice/30"
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

export default function Layout() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      {/* Floating Top Nav replaces sidebar & previous topbar */}
      <FloatingNavBar />
      
      {/* Main Content Area Reclaims Full Width */}
      <main className="flex-1 px-3 sm:px-6 lg:px-8 pb-12 overflow-y-auto">
        <Outlet />
      </main>

      {/* Mock Chatbot Assistant (Floating on every patient-role screen) */}
      {user?.role === "patient" && <ChatAssistant />}

      <ToastContainer />
    </div>
  );
}
