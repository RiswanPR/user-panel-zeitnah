import { useContext } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  BookOpen,
  Trophy,
  User,
  BarChart3,
  Users,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AuthContext } from "../context/AuthContext";
import { getUploadUrl } from "../utils/courseUi";
import leaderboardService from "../services/leaderboardService";
import LeaderboardSidebarCard from "../components/sidebar/LeaderboardSidebarCard";
import PageTransition from "../components/ui/PageTransition";
import CookieConsentBanner from "../components/common/CookieConsentBanner";
import UsernameClaimModal from "../components/username/UsernameClaimModal";
import FeatureErrorBoundary from "../components/common/FeatureErrorBoundary";

// ── Desktop Navigation Destinations ──
const desktopNavItems = [
  { key: "courses", path: "/courses", label: "Courses", icon: BookOpen },
  { key: "network", path: "/network", label: "Network", icon: Users },
  { key: "profile", path: "/profile", label: "Profile", icon: User },
];

// ── Mobile Bottom Navigation Destinations ──
const mobileBottomNavItems = [
  { key: "courses", path: "/courses", label: "Courses", icon: BookOpen },
  { key: "network", path: "/network", label: "Network", icon: Users },
  { key: "learning", path: "/my-learning", label: "Learning", icon: BarChart3 },
  { key: "profile", path: "/profile", label: "Profile", icon: User },
];

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
  const { user } = useContext(AuthContext);
  const currentUserId = user?._id || user?.userId;
  const shouldReduceMotion = useReducedMotion();

  // Cheaply fetch authenticated student's personal position for mobile trophy rank indicator
  const { data: position } = useQuery({
    queryKey: ["leaderboard", "position"],
    queryFn: () => leaderboardService.getMyLeaderboardPosition(),
    staleTime: 1000 * 60 * 2, // 2 minutes
    enabled: Boolean(currentUserId),
    retry: 1,
  });

  // Route-aware active state matching
  const isRouteActive = (key) => {
    const path = location.pathname;
    if (key === "courses") {
      return path === "/courses" || path.startsWith("/courses/") || path === "/";
    }
    if (key === "leaderboard") {
      return path === "/leaderboard" || path.startsWith("/leaderboard/");
    }
    if (key === "learning") {
      return path === "/my-learning" || path.startsWith("/my-learning/");
    }
    if (key === "network") {
      return path === "/network" || path.startsWith("/network/");
    }
    if (key === "profile") {
      return (
        path.startsWith("/profile") ||
        path === "/public-profile" ||
        path.startsWith("/u/") ||
        path === "/my-points" ||
        path === "/active-sessions" ||
        path === "/audit-logs"
      );
    }
    return false;
  };

  // Get user initials for avatar fallback
  const userInitials = user?.name
    ? user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase()
    : "Z";

  const avatarUrl = user?.avatar ? getUploadUrl(user.avatar) : null;

  return (
    <div className="min-h-screen bg-bg-base text-white font-body antialiased flex flex-col md:flex-row">

      {/* Ambient background */}
      <div className="ambient-glow inset-0" />

      {/* ═══════════════════════════════════════════════
          MOBILE TOP HEADER with Logo & Trophy Shortcut
          ═══════════════════════════════════════════════ */}
      <header className="md:hidden sticky top-0 z-40 bg-bg-surface/90 backdrop-blur-xl border-b border-border-subtle px-4 py-3 flex items-center justify-between">
        {/* Left: Brand / Logo */}
        <Link to="/courses" className="flex items-center gap-2.5 select-none">
          <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-brand-mint/30 shadow-sm">
            <img src="/zeitnah-logo.png" alt="Zeitnah Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <span className="text-sm font-heading font-extrabold tracking-wider uppercase text-white">Zeitnah</span>
            <p className="text-[10px] font-medium text-text-muted">Learning Platform</p>
          </div>
        </Link>

        {/* Right: Leaderboard Trophy Shortcut & Profile Avatar */}
        <div className="flex items-center gap-2">
          {/* Dedicated Trophy Quick-Access Button */}
          <Link
            to="/leaderboard"
            aria-label={
              position?.rank
                ? `Leaderboard, current position ${position.rank}`
                : "Leaderboard"
            }
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all active:scale-95 focus-ring ${
              isRouteActive("leaderboard")
                ? "bg-brand-yellow/[0.15] border-brand-yellow/35 text-brand-yellow"
                : "bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08] text-white"
            }`}
          >
            <Trophy className="w-4 h-4 text-brand-yellow" aria-hidden="true" />
            {position?.rank && (
              <span className="text-[11px] font-mono font-bold tabular-nums text-white/90">
                #{position.rank}
              </span>
            )}
          </Link>

          {/* Profile Shortcut */}
          <Link
            to="/profile"
            aria-label="Profile"
            className="w-8 h-8 rounded-full border border-brand-mint/25 overflow-hidden flex items-center justify-center bg-brand-mint/20 active:scale-95 transition-all focus-ring"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[10px] font-heading font-bold text-brand-mint">{userInitials}</span>
            )}
          </Link>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════
          DESKTOP SIDEBAR — Luxury vertical navigation
          ═══════════════════════════════════════════════ */}
      {/* ═══════════════════════════════════════════════
          DESKTOP SIDEBAR — Luxury vertical navigation
          ═══════════════════════════════════════════════ */}
      <aside className="hidden md:flex flex-col w-[260px] h-screen sticky top-0 shrink-0 z-40" aria-label="Main sidebar">
        {/* Floating inner container with margin for "island" effect */}
        <div className="sidebar-noise relative m-3 flex-1 flex flex-col rounded-2xl bg-gradient-to-b from-bg-surface/90 to-bg-base/60 border border-border-subtle backdrop-blur-xl overflow-hidden px-3">

          {/* Top section: Logo + Navigation (scrolls only if viewport is extremely short) */}
          <div className="shrink-0 flex flex-col min-h-0 overflow-y-auto no-scrollbar">
            {/* Gradient accent line */}
            <div className="gradient-line-top" />

            {/* ── Logo Section ── */}
            <Link to="/courses" className="px-3 py-4 flex items-center gap-3 select-none group rounded-xl hover:bg-white/[0.03] transition-colors focus-ring">
              <div className="relative w-9 h-9 shrink-0">
                <div className="absolute inset-0 bg-brand-mint/30 rounded-lg blur-md transition-all" />
                <div className="relative w-9 h-9 rounded-lg border border-brand-mint/30 overflow-hidden shadow-md flex items-center justify-center bg-bg-surface">
                  <img src="/zeitnah-logo.png" alt="Zeitnah Logo" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-base font-heading font-extrabold tracking-wider uppercase text-white group-hover:text-brand-mint transition-colors block leading-tight">
                  Zeitnah
                </span>
                <p className="text-[10px] font-medium text-text-muted tracking-wide leading-tight">Learning Platform</p>
              </div>
            </Link>

            {/* ── Top Divider (edge to edge within island gutter) ── */}
            <div className="w-full h-px bg-gradient-to-r from-transparent via-border-accent to-transparent my-1 shrink-0" />

            {/* ── Navigation Items (Courses & Profile strictly) ── */}
            <nav className="py-2 space-y-1" aria-label="Main Navigation">
              {desktopNavItems.map((item, i) => {
                const active = isRouteActive(item.key);
                const Icon = item.icon;
                const isCourses = item.key === "courses";

                return (
                  <motion.div
                    key={item.key}
                    custom={i}
                    initial={shouldReduceMotion ? false : "hidden"}
                    animate="visible"
                    variants={navItemVariants}
                  >
                    <Link
                      to={item.path}
                      aria-current={active ? "page" : undefined}
                      className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 group focus-ring ${
                        active
                          ? "text-white font-bold"
                          : "text-text-muted hover:text-white hover:bg-white/[0.03]"
                      }`}
                    >
                      {/* Active background treatment */}
                      {active && (
                        <motion.div
                          layoutId={shouldReduceMotion ? undefined : "sidebar-active"}
                          className={`absolute inset-0 rounded-xl ${
                            isCourses
                              ? "bg-gradient-to-r from-brand-mint/10 to-transparent border border-brand-mint/15"
                              : "bg-white/[0.06] border border-white/[0.1]"
                          }`}
                          transition={{ type: "spring", stiffness: 350, damping: 30 }}
                        />
                      )}

                      {/* Active left accent bar */}
                      {active && (
                        <motion.div
                          layoutId={shouldReduceMotion ? undefined : "sidebar-accent"}
                          className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full ${
                            isCourses ? "bg-brand-mint" : "bg-white/60"
                          }`}
                          transition={{ type: "spring", stiffness: 350, damping: 30 }}
                        />
                      )}

                      {/* Navigation Icon in fixed 36px column to align with logo & avatar */}
                      <div className="w-9 h-9 shrink-0 flex items-center justify-center relative z-10">
                        <Icon
                          className={`w-[18px] h-[18px] transition-colors duration-200 ${
                            active
                              ? isCourses
                                ? "text-brand-mint"
                                : "text-white"
                              : "text-text-faint group-hover:text-text-muted"
                          }`}
                        />
                      </div>

                      {/* Navigation Label */}
                      <span className="relative z-10">{item.label}</span>

                      {/* Courses: Active Dot Indicator */}
                      {isCourses && active && (
                        <span className="relative z-10 ml-auto w-1.5 h-1.5 rounded-full bg-brand-yellow" />
                      )}
                    </Link>
                  </motion.div>
                );
              })}
            </nav>
          </div>

          {/* ── Flexible Spacer: absorbs all extra vertical height ── */}
          <div className="flex-1 min-h-[16px]" />

          {/* ── Bottom Section: Leaderboard Card + Divider + User Identity ── */}
          <div className="shrink-0 mt-auto flex flex-col pb-2">
            {/* Signature Leaderboard Card */}
            <LeaderboardSidebarCard />

            {/* ── Bottom Divider (edge to edge within island gutter) ── */}
            <div className="w-full h-px bg-gradient-to-r from-transparent via-border-accent to-transparent my-2" />

            {/* ── User Card ── */}
            <Link
              to="/profile"
              className="px-3 py-2 flex items-center gap-3 select-none hover:bg-white/[0.04] transition-colors rounded-xl group focus-ring w-full"
            >
              <div className="relative w-9 h-9 shrink-0">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-mint/20 to-brand-navy/40 border border-brand-mint/25 flex items-center justify-center overflow-hidden">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={user?.name || "User"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-heading font-bold text-brand-mint">
                      {userInitials}
                    </span>
                  )}
                </div>
                {/* Online indicator */}
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success border-2 border-bg-surface" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold truncate text-white group-hover:text-brand-mint transition-colors">
                  {user?.name || "Zeitnah User"}
                </p>
                <p className="text-[10px] text-text-muted font-mono truncate">
                  @{user?.username || "student"}
                </p>
              </div>
            </Link>
          </div>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════
          MOBILE BOTTOM NAVIGATION — Floating pill design
          ═══════════════════════════════════════════════ */}
      <div className="fixed bottom-0 inset-x-0 z-50 md:hidden pb-[env(safe-area-inset-bottom)]">
        <div className="mx-3 mb-3 px-2 py-2 rounded-2xl bg-bg-surface/85 border border-border-subtle backdrop-blur-2xl shadow-[0_-8px_32px_rgba(0,0,0,0.4)]">
          <nav className="flex items-center justify-around" aria-label="Mobile Navigation">
            {mobileBottomNavItems.map((item) => {
              const active = isRouteActive(item.key);
              const Icon = item.icon;
              const isCourses = item.key === "courses";

              return (
                <Link
                  key={item.key}
                  to={item.path}
                  aria-current={active ? "page" : undefined}
                  className="relative flex flex-col items-center gap-1 py-1.5 px-4 rounded-xl transition-all duration-200 focus-ring"
                >
                  {active && (
                    <motion.div
                      layoutId={shouldReduceMotion ? undefined : "mobile-active"}
                      className={`absolute inset-0 rounded-xl ${
                        isCourses
                          ? "bg-brand-mint/10 border border-brand-mint/20"
                          : "bg-white/[0.06] border border-white/[0.1]"
                      }`}
                      transition={{ type: "spring", stiffness: 400, damping: 28 }}
                    />
                  )}
                  <Icon
                    className={`relative z-10 w-5 h-5 transition-colors duration-200 ${
                      active
                        ? isCourses
                          ? "text-brand-mint"
                          : "text-white font-bold"
                        : "text-text-faint"
                    }`}
                  />
                  <span
                    className={`relative z-10 text-[10px] font-semibold tracking-wide transition-colors duration-200 ${
                      active
                        ? isCourses
                          ? "text-brand-mint font-bold"
                          : "text-white font-bold"
                        : "text-text-faint"
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
      <main className="flex-1 min-w-0 pb-24 md:pb-0 relative z-10">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <FeatureErrorBoundary featureName="Page Content">
            <PageTransition key={location.pathname}>
              {children || <Outlet />}
            </PageTransition>
          </FeatureErrorBoundary>
        </div>
      </main>
      <CookieConsentBanner />
      <UsernameClaimModal />
    </div>
  );
}
