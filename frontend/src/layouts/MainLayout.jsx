import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Home,
  BookOpen,
  BarChart3,
  Star,
  User,
  Menu,
  X,
  LogOut,
  Shield,
} from "lucide-react";

const navItems = [
  // { path: "/dashboard", label: "Dashboard", icon: Home },
  { path: "/courses", label: "Courses", icon: BookOpen },
  // { path: "/my-learning", label: "My Learning", icon: BarChart3 },
  // { path: "/my-points", label: "My Points", icon: Star },
  { path: "/profile", label: "Profile", icon: User },
];

const sidebarVariants = {
  hidden: { x: -280, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 30 } },
  exit: { x: -280, opacity: 0, transition: { duration: 0.2 } },
};

const navItemVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: (i) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.05, duration: 0.3, ease: "easeOut" },
  }),
};

export default function MainLayout({ children }) {
  const location = useLocation();
  // const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  return (
    <div className="min-h-screen bg-bg-base text-white font-body antialiased flex flex-col md:flex-row">

      {/* ═══════════════════════════════════════════════
          DESKTOP SIDEBAR — Luxury vertical navigation
          ═══════════════════════════════════════════════ */}
      <aside className="hidden md:flex flex-col w-[260px] h-screen sticky top-0 shrink-0 z-40">
        {/* Floating inner container with margin for "island" effect */}
        <div className="m-3 flex-1 flex flex-col rounded-2xl bg-gradient-to-b from-bg-surface/90 to-bg-base/60 border border-border-subtle backdrop-blur-xl overflow-hidden">

          {/* Gradient accent line */}
          <div className="gradient-line-top" />

          {/* ── Logo Section ── */}
          <div className="px-6 py-6 flex items-center gap-3 select-none">
            <div className="relative">
              <div className="absolute inset-0 bg-brand-mint/20 rounded-xl blur-lg" />
              <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-brand-mint/20 to-brand-mint/5 border border-brand-mint/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-brand-mint" viewBox="0 0 160 160" fill="currentColor">
                  <path d="M40,50 C65,25 115,35 125,65 C135,95 70,125 80,155 C90,185 140,175 160,150 L140,180 C110,205 60,195 50,165 C40,135 105,105 95,75 C85,45 50,55 30,75 Z" transform="translate(-15, -25) scale(0.9)" />
                </svg>
              </div>
            </div>
            <div>
              <span className="text-sm font-heading font-extrabold tracking-wider uppercase text-white">
                Zeitnah
              </span>
              <p className="text-[10px] font-medium text-text-muted tracking-wide">Learning Platform</p>
            </div>
          </div>

          {/* ── Divider ── */}
          <div className="mx-5 h-px bg-gradient-to-r from-transparent via-border-accent to-transparent" />

          {/* ── Navigation Items ── */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item, i) => {
              const active = isActive(item.path);
              const Icon = item.icon;

              return (
                <motion.div
                  key={item.path}
                  custom={i}
                  initial="hidden"
                  animate="visible"
                  variants={navItemVariants}
                >
                  <Link
                    to={item.path}
                    className={`relative flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 group ${
                      active
                        ? "text-white"
                        : "text-text-muted hover:text-text-secondary"
                    }`}
                  >
                    {/* Active background gradient */}
                    {active && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute inset-0 rounded-xl bg-gradient-to-r from-brand-mint/10 to-transparent border border-brand-mint/15"
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      />
                    )}

                    {/* Active left accent bar */}
                    {active && (
                      <motion.div
                        layoutId="sidebar-accent"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-brand-mint"
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      />
                    )}

                    <Icon
                      className={`relative z-10 w-[18px] h-[18px] shrink-0 transition-colors duration-200 ${
                        active
                          ? "text-brand-mint"
                          : "text-text-faint group-hover:text-text-muted"
                      }`}
                    />
                    <span className="relative z-10">{item.label}</span>

                    {/* Active dot indicator */}
                    {active && (
                      <span className="relative z-10 ml-auto w-1.5 h-1.5 rounded-full bg-brand-yellow" />
                    )}
                  </Link>
                </motion.div>
              );
            })}
          </nav>

          {/* ── Divider ── */}
          <div className="mx-5 h-px bg-gradient-to-r from-transparent via-border-accent to-transparent" />

          {/* ── User Card ── */}
          <div className="p-4 flex items-center gap-3 select-none">
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-mint/20 to-brand-navy/40 border border-brand-mint/25 flex items-center justify-center">
                <span className="text-xs font-heading font-bold text-brand-mint">Z</span>
              </div>
              {/* Online indicator */}
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success border-2 border-bg-surface" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold truncate text-white">Zeitnah User</p>
              <p className="text-[10px] text-text-muted truncate">Active Session</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════
          MOBILE BOTTOM NAVIGATION — Floating pill design
          ═══════════════════════════════════════════════ */}
      <div className="fixed bottom-0 inset-x-0 z-50 md:hidden pb-[env(safe-area-inset-bottom)]">
        <div className="mx-3 mb-3 px-2 py-2 rounded-2xl bg-bg-surface/80 border border-border-subtle backdrop-blur-2xl shadow-[0_-8px_32px_rgba(0,0,0,0.4)]">
          <nav className="flex items-center justify-around">
            {navItems.map((item) => {
              const active = isActive(item.path);
              const Icon = item.icon;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="relative flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl transition-all duration-200"
                >
                  {active && (
                    <motion.div
                      layoutId="mobile-active"
                      className="absolute inset-0 rounded-xl bg-brand-mint/10 border border-brand-mint/15"
                      transition={{ type: "spring", stiffness: 400, damping: 28 }}
                    />
                  )}
                  <Icon
                    className={`relative z-10 w-5 h-5 transition-colors duration-200 ${
                      active ? "text-brand-mint" : "text-text-faint"
                    }`}
                  />
                  <span
                    className={`relative z-10 text-[9px] font-semibold tracking-wide transition-colors duration-200 ${
                      active ? "text-brand-mint" : "text-text-faint"
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          MAIN CONTENT AREA
          ═══════════════════════════════════════════════ */}
      <main className="flex-1 min-w-0 pb-24 md:pb-0">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {children || <Outlet />}
        </div>
      </main>
    </div>
  );
}
