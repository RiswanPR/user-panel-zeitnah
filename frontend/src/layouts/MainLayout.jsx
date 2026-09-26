import { useContext, useState, useMemo } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  BookOpen,
  GraduationCap,
  Trophy,
  Compass,
  Briefcase,
  Building2,
  TrendingUp,
  MessageSquare,
  Layers,
  Inbox,
  ShieldCheck,
  Bell,
  MoreHorizontal,
  LogOut,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AuthContext } from "../context/AuthContext";
import { useMessaging } from "../context/MessagingContext";
import { NotificationContext } from "../context/NotificationContext";
import { getUploadUrl } from "../utils/courseUi";
import leaderboardService from "../services/leaderboardService";
import opportunityService from "../services/opportunityService";
import LeaderboardSidebarCard from "../components/sidebar/LeaderboardSidebarCard";
import PageTransition from "../components/ui/PageTransition";
import CookieConsentBanner from "../components/common/CookieConsentBanner";
import UsernameClaimModal from "../components/username/UsernameClaimModal";
import FeatureErrorBoundary from "../components/common/FeatureErrorBoundary";
import NotificationBell from "../components/notifications/NotificationBell";
import NotificationDrawer from "../components/notifications/NotificationDrawer";
import PlatformAnnouncementBanner from "../components/announcements/PlatformAnnouncementBanner";
import MobileMoreDrawer from "../components/navigation/MobileMoreDrawer";

const navItemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: (i) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.03, duration: 0.25, ease: "easeOut" },
  }),
};

export default function MainLayout({ children }) {
  const location = useLocation();
  const { user, logout, requestLogout } = useContext(AuthContext);
  const notifContext = useContext(NotificationContext);
  const currentUserId = user?._id || user?.userId;
  const shouldReduceMotion = useReducedMotion();
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);

  // Role-aware navigation destinations
  const normalizedRole = (user?.primaryRole || "STUDENT").toUpperCase();
  const isBusinessRole =
    normalizedRole === "RECRUITER" || normalizedRole === "FOUNDER" || normalizedRole === "ADMIN";

  const { unreadCounts } = useMessaging();
  const unreadMessagesCount = unreadCounts?.total || 0;

  // Unread opportunities count for candidate
  const { data: oppUnreadData } = useQuery({
    queryKey: ["opportunities", "unread-count"],
    queryFn: () => opportunityService.getInboxUnreadCount(),
    staleTime: 1000 * 60,
    enabled: Boolean(currentUserId),
    retry: 1,
  });
  const unreadOpportunitiesCount = oppUnreadData?.unreadCount || 0;

  // Unread notifications count
  const unreadNotifCount = notifContext?.unreadCount || 0;

  // Fetch student's leaderboard rank
  const { data: position } = useQuery({
    queryKey: ["leaderboard", "position"],
    queryFn: () => leaderboardService.getMyLeaderboardPosition(),
    staleTime: 1000 * 60 * 2,
    enabled: Boolean(currentUserId),
    retry: 1,
  });

  // Categorized Desktop Navigation Groups (Zeitnah 2.0 Hierarchy)
  const desktopNavGroups = useMemo(
    () => [
      {
        section: "CORE",
        items: [
          { key: "network", path: "/network", label: "Network & Spaces", icon: Compass },
          {
            key: "messages",
            path: "/messages",
            label: "Messages",
            icon: MessageSquare,
            badge: unreadMessagesCount,
          },
          { key: "jobs", path: "/jobs", label: "Jobs", icon: Briefcase },
        ],
      },
      {
        section: "PROFESSIONAL",
        items: [
          {
            key: "opportunities",
            path: "/opportunities/inbox",
            label: "Opportunities",
            icon: Inbox,
            badge: unreadOpportunitiesCount,
          },
          {
            key: "career-intelligence",
            path: "/career-intelligence",
            label: "Career Intelligence",
            icon: TrendingUp,
          },
          { key: "portfolio", path: "/profile/portfolio", label: "Portfolio", icon: Layers },
          { key: "verification", path: "/profile/verification", label: "Verification", icon: ShieldCheck },
        ],
      },
      {
        section: "LEARNING",
        items: [
          { key: "courses", path: "/courses", label: "Courses", icon: BookOpen },
          { key: "learning", path: "/my-learning", label: "My Learning", icon: GraduationCap },
        ],
      },
      ...(isBusinessRole
        ? [
            {
              section: "BUSINESS",
              items: [
                {
                  key: "manage-business",
                  path: "/manage-business",
                  label: "Manage Business",
                  icon: Building2,
                },
              ],
            },
          ]
        : []),
    ],
    [isBusinessRole, unreadMessagesCount, unreadOpportunitiesCount]
  );

  // Route active state check
  const isRouteActive = (key) => {
    const path = location.pathname;
    if (key === "network") return path === "/network" || path.startsWith("/network/");
    if (key === "messages") return path.startsWith("/messages");
    if (key === "jobs") return path.startsWith("/jobs");
    if (key === "opportunities")
      return path.startsWith("/opportunities") || path.startsWith("/career/opportunities");
    if (key === "career-intelligence") return path.startsWith("/career-intelligence");
    if (key === "portfolio") return path === "/profile/portfolio" || path.endsWith("/portfolio");
    if (key === "verification") return path.startsWith("/profile/verification");
    if (key === "courses") return path === "/courses" || path.startsWith("/courses/") || path === "/";
    if (key === "learning") return path === "/my-learning" || path.startsWith("/my-learning/");
    if (key === "leaderboard") return path === "/leaderboard" || path.startsWith("/leaderboard/");
    if (key === "manage-business") return path.startsWith("/manage-business");
    if (key === "notifications") return path.startsWith("/notifications");
    if (key === "profile") {
      if (path === "/profile/portfolio" || path.startsWith("/profile/verification")) return false;
      return (
        path.startsWith("/profile") ||
        path === "/public-profile" ||
        path.startsWith("/u/") ||
        path === "/my-points" ||
        path === "/active-sessions"
      );
    }
    return false;
  };

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
    <div className="min-h-screen bg-bg-base text-white font-body antialiased flex flex-col selection:bg-brand-mint/30 selection:text-white">
      {/* ── Platform Announcement Banner ── */}
      <PlatformAnnouncementBanner />

      <div className="flex-1 flex flex-col md:flex-row">
        {/* Ambient subtle background glow */}
        <div className="ambient-glow inset-0 pointer-events-none" />

        {/* ═══════════════════════════════════════════════
          MOBILE TOP HEADER — Professional & Ergonomic
          ═══════════════════════════════════════════════ */}
        <header className="md:hidden sticky top-0 z-40 bg-[#0B111E]/95 backdrop-blur-2xl border-b border-white/[0.08] px-4 py-2.5 flex items-center justify-between shadow-sm">
          {/* Left: Brand */}
          <Link to="/courses" className="flex items-center gap-2.5 select-none focus-ring rounded-lg">
            <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-brand-mint/35 bg-bg-surface flex items-center justify-center shadow-sm">
              <img src="/zeitnah-logo.png" alt="Zeitnah Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="text-sm font-heading font-extrabold tracking-wider uppercase text-white block leading-tight">
                Zeitnah
              </span>
              <p className="text-[9px] font-mono uppercase tracking-widest text-brand-mint/80 leading-tight">
                Platform
              </p>
            </div>
          </Link>

          {/* Right: Quick actions */}
          <div className="flex items-center gap-1.5">
            {/* Notification Bell */}
            <NotificationBell />

            {/* Leaderboard Trophy Shortcut */}
            <Link
              to="/leaderboard"
              aria-label={
                position?.rank ? `Leaderboard rank #${position.rank}` : "Global Leaderboard"
              }
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border transition-all active:scale-95 touch-manipulation focus-ring ${
                isRouteActive("leaderboard")
                  ? "bg-brand-yellow/[0.15] border-brand-yellow/40 text-brand-yellow"
                  : "bg-white/[0.04] border-white/[0.08] text-white"
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-brand-yellow" />
              {position?.rank && (
                <span className="text-[11px] font-mono font-bold tabular-nums text-white/90">
                  #{position.rank}
                </span>
              )}
            </Link>

            {/* Profile Avatar Shortcut */}
            <Link
              to="/profile"
              aria-label="My Profile"
              className="w-8 h-8 rounded-full border border-brand-mint/30 overflow-hidden flex items-center justify-center bg-brand-mint/20 active:scale-95 transition-all focus-ring"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] font-heading font-bold text-brand-mint">{userInitials}</span>
              )}
            </Link>

            {/* Sign Out */}
            <button
              type="button"
              onClick={() => (requestLogout ? requestLogout() : logout?.())}
              aria-label="Sign out"
              title="Sign out"
              className="w-8 h-8 rounded-full border border-white/[0.08] bg-white/[0.03] hover:bg-red-500/15 hover:border-red-500/30 text-text-faint hover:text-red-400 flex items-center justify-center active:scale-95 transition-all cursor-pointer touch-manipulation"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* ═══════════════════════════════════════════════
          DESKTOP SIDEBAR — Zeitnah 2.0 Architectural Shell
          ═══════════════════════════════════════════════ */}
        <aside
          className="hidden md:flex flex-col w-[260px] h-screen sticky top-0 shrink-0 z-40"
          aria-label="Main sidebar"
        >
          {/* Floating Island Container */}
          <div className="relative m-3 flex-1 flex flex-col rounded-2xl bg-gradient-to-b from-[#0D1625]/95 via-[#09101C]/90 to-[#070B14]/95 border border-white/[0.08] backdrop-blur-2xl shadow-xl overflow-hidden px-3">
            {/* Top gradient hairline */}
            <div className="gradient-line-top" />

            {/* Top: Logo & Platform Identity */}
            <div className="px-3 pt-4 pb-3 flex items-center justify-between gap-2 select-none shrink-0">
              <Link
                to="/courses"
                className="flex items-center gap-3 select-none group rounded-xl hover:bg-white/[0.03] transition-colors focus-ring min-w-0 flex-1 py-1"
              >
                <div className="relative w-9 h-9 shrink-0">
                  <div className="absolute inset-0 bg-brand-mint/25 rounded-lg blur-sm group-hover:blur-md transition-all" />
                  <div className="relative w-9 h-9 rounded-lg border border-brand-mint/30 overflow-hidden shadow-md flex items-center justify-center bg-bg-surface">
                    <img
                      src="/zeitnah-logo.png"
                      alt="Zeitnah Logo"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-heading font-extrabold tracking-wider uppercase text-white group-hover:text-brand-mint transition-colors block leading-tight truncate">
                    Zeitnah
                  </span>
                  <p className="text-[9px] font-mono uppercase tracking-widest text-text-faint truncate">
                    Infrastructure Tech
                  </p>
                </div>
              </Link>

              <NotificationBell className="shrink-0" />
            </div>

            <div className="w-full h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent my-1 shrink-0" />

            {/* Categorized Navigation List */}
            <div className="flex-1 overflow-y-auto py-2 space-y-4 no-scrollbar">
              {desktopNavGroups.map((group, groupIdx) => (
                <div key={group.section} className="space-y-1">
                  <div className="px-3 pt-1 pb-0.5">
                    <span className="text-[10px] font-mono font-bold tracking-widest text-text-faint uppercase">
                      {group.section}
                    </span>
                  </div>

                  {group.items.map((item, itemIdx) => {
                    const active = isRouteActive(item.key);
                    const Icon = item.icon;
                    const globalIdx = groupIdx * 4 + itemIdx;

                    return (
                      <motion.div
                        key={item.key}
                        custom={globalIdx}
                        initial={shouldReduceMotion ? false : "hidden"}
                        animate="visible"
                        variants={navItemVariants}
                      >
                        <Link
                          to={item.path}
                          aria-current={active ? "page" : undefined}
                          className={`relative flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 group focus-ring ${
                            active
                              ? "text-white font-bold"
                              : "text-text-muted hover:text-white hover:bg-white/[0.04]"
                          }`}
                        >
                          {/* Active Background Pill */}
                          {active && (
                            <motion.div
                              layoutId={shouldReduceMotion ? undefined : "sidebar-active-pill"}
                              className="absolute inset-0 rounded-xl bg-gradient-to-r from-brand-mint/12 to-white/[0.02] border border-brand-mint/20 shadow-sm"
                              transition={{ type: "spring", stiffness: 350, damping: 30 }}
                            />
                          )}

                          {/* Left Accent Indicator */}
                          {active && (
                            <motion.div
                              layoutId={shouldReduceMotion ? undefined : "sidebar-active-bar"}
                              className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-brand-mint"
                              transition={{ type: "spring", stiffness: 350, damping: 30 }}
                            />
                          )}

                          {/* Icon */}
                          <div className="w-7 h-7 shrink-0 flex items-center justify-center relative z-10">
                            <Icon
                              className={`w-4 h-4 transition-colors duration-200 ${
                                active ? "text-brand-mint" : "text-text-faint group-hover:text-text-muted"
                              }`}
                            />
                          </div>

                          {/* Label */}
                          <span className="relative z-10 truncate">{item.label}</span>

                          {/* Badge */}
                          {item.badge > 0 && (
                            <span className="relative z-10 ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-brand-mint text-black shadow-sm">
                              {item.badge > 99 ? "99+" : item.badge}
                            </span>
                          )}
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Bottom Footer Section: Leaderboard + User Profile */}
            <div className="shrink-0 mt-auto flex flex-col pt-2 pb-2 border-t border-white/[0.06]">
              {/* Leaderboard Sidebar Card */}
              <div className="mb-2">
                <LeaderboardSidebarCard />
              </div>

              {/* User Identity & Logout */}
              <div className="flex items-center gap-1.5 w-full pt-1">
                <Link
                  to="/profile"
                  className="px-2.5 py-2 flex items-center gap-2.5 select-none hover:bg-white/[0.04] transition-colors rounded-xl group focus-ring flex-1 min-w-0"
                >
                  <div className="relative w-8 h-8 shrink-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-mint/20 to-brand-navy/50 border border-brand-mint/30 flex items-center justify-center overflow-hidden">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={user?.name || "User"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-[11px] font-heading font-bold text-brand-mint">
                          {userInitials}
                        </span>
                      )}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-success border border-bg-surface" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate text-white group-hover:text-brand-mint transition-colors">
                      {user?.name || "Professional"}
                    </p>
                    <p className="text-[10px] text-text-muted font-mono truncate">
                      @{user?.username || "profile"}
                    </p>
                  </div>
                </Link>

                <button
                  type="button"
                  onClick={() => (requestLogout ? requestLogout() : logout?.())}
                  title="Sign out"
                  aria-label="Sign out"
                  className="p-2 rounded-xl border border-transparent hover:border-red-500/25 hover:bg-red-500/10 text-text-faint hover:text-red-400 transition-colors focus-ring shrink-0 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* ═══════════════════════════════════════════════
          MOBILE BOTTOM NAVIGATION (5 Primary Touchpoints)
          1. Network  2. Messages  3. Jobs  4. Notifications  5. More
          ═══════════════════════════════════════════════ */}
        <div className="fixed bottom-0 inset-x-0 z-40 md:hidden pb-[env(safe-area-inset-bottom)] pointer-events-none">
          <div className="mx-3 mb-2.5 px-2 py-1.5 rounded-2xl bg-[#0B111E]/95 border border-white/[0.1] backdrop-blur-2xl shadow-[0_-8px_32px_rgba(0,0,0,0.5)] pointer-events-auto">
            <nav className="flex items-center justify-around" aria-label="Mobile Bottom Navigation">
              {/* 1. Network */}
              <Link
                to="/network"
                aria-current={isRouteActive("network") ? "page" : undefined}
                className="relative flex flex-col items-center justify-center py-1 px-3 min-h-[46px] min-w-[54px] rounded-xl transition-all focus-ring touch-manipulation"
              >
                {isRouteActive("network") && (
                  <motion.div
                    layoutId={shouldReduceMotion ? undefined : "mobile-nav-active"}
                    className="absolute inset-0 rounded-xl bg-brand-mint/12 border border-brand-mint/25"
                    transition={{ type: "spring", stiffness: 400, damping: 28 }}
                  />
                )}
                <Compass
                  className={`w-5 h-5 relative z-10 transition-colors ${
                    isRouteActive("network") ? "text-brand-mint" : "text-text-muted"
                  }`}
                />
                <span
                  className={`text-[10px] mt-0.5 relative z-10 font-semibold tracking-tight ${
                    isRouteActive("network") ? "text-brand-mint" : "text-text-faint"
                  }`}
                >
                  Network
                </span>
              </Link>

              {/* 2. Messages */}
              <Link
                to="/messages"
                aria-current={isRouteActive("messages") ? "page" : undefined}
                className="relative flex flex-col items-center justify-center py-1 px-3 min-h-[46px] min-w-[54px] rounded-xl transition-all focus-ring touch-manipulation"
              >
                {isRouteActive("messages") && (
                  <motion.div
                    layoutId={shouldReduceMotion ? undefined : "mobile-nav-active"}
                    className="absolute inset-0 rounded-xl bg-brand-mint/12 border border-brand-mint/25"
                    transition={{ type: "spring", stiffness: 400, damping: 28 }}
                  />
                )}
                <div className="relative z-10">
                  <MessageSquare
                    className={`w-5 h-5 transition-colors ${
                      isRouteActive("messages") ? "text-brand-mint" : "text-text-muted"
                    }`}
                  />
                  {unreadMessagesCount > 0 && (
                    <span className="absolute -top-1 -right-2 min-w-4 h-4 px-1 rounded-full bg-brand-mint text-black font-bold font-mono text-[9px] flex items-center justify-center shadow-sm">
                      {unreadMessagesCount > 9 ? "9+" : unreadMessagesCount}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[10px] mt-0.5 relative z-10 font-semibold tracking-tight ${
                    isRouteActive("messages") ? "text-brand-mint" : "text-text-faint"
                  }`}
                >
                  Messages
                </span>
              </Link>

              {/* 3. Jobs */}
              <Link
                to="/jobs"
                aria-current={isRouteActive("jobs") ? "page" : undefined}
                className="relative flex flex-col items-center justify-center py-1 px-3 min-h-[46px] min-w-[54px] rounded-xl transition-all focus-ring touch-manipulation"
              >
                {isRouteActive("jobs") && (
                  <motion.div
                    layoutId={shouldReduceMotion ? undefined : "mobile-nav-active"}
                    className="absolute inset-0 rounded-xl bg-brand-mint/12 border border-brand-mint/25"
                    transition={{ type: "spring", stiffness: 400, damping: 28 }}
                  />
                )}
                <Briefcase
                  className={`w-5 h-5 relative z-10 transition-colors ${
                    isRouteActive("jobs") ? "text-brand-mint" : "text-text-muted"
                  }`}
                />
                <span
                  className={`text-[10px] mt-0.5 relative z-10 font-semibold tracking-tight ${
                    isRouteActive("jobs") ? "text-brand-mint" : "text-text-faint"
                  }`}
                >
                  Jobs
                </span>
              </Link>

              {/* 4. Notifications */}
              <button
                type="button"
                onClick={() => {
                  if (notifContext?.setIsDrawerOpen) {
                    notifContext.setIsDrawerOpen(true);
                  }
                }}
                className="relative flex flex-col items-center justify-center py-1 px-3 min-h-[46px] min-w-[54px] rounded-xl transition-all focus-ring touch-manipulation cursor-pointer"
              >
                <div className="relative z-10">
                  <Bell
                    className={`w-5 h-5 transition-colors ${
                      unreadNotifCount > 0 ? "text-brand-yellow" : "text-text-muted"
                    }`}
                  />
                  {unreadNotifCount > 0 && (
                    <span className="absolute -top-1 -right-2 min-w-4 h-4 px-1 rounded-full bg-brand-mint text-black font-bold font-mono text-[9px] flex items-center justify-center shadow-sm">
                      {unreadNotifCount > 9 ? "9+" : unreadNotifCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] mt-0.5 relative z-10 font-semibold tracking-tight text-text-faint">
                  Alerts
                </span>
              </button>

              {/* 5. More (Opens Mobile Drawer) */}
              <button
                type="button"
                onClick={() => setIsMobileMoreOpen(true)}
                aria-label="More navigation options"
                className={`relative flex flex-col items-center justify-center py-1 px-3 min-h-[46px] min-w-[54px] rounded-xl transition-all focus-ring touch-manipulation cursor-pointer ${
                  isMobileMoreOpen ? "text-brand-mint" : "text-text-muted"
                }`}
              >
                <div className="relative z-10">
                  <MoreHorizontal className="w-5 h-5" />
                  {unreadOpportunitiesCount > 0 && (
                    <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-brand-mint shadow-sm" />
                  )}
                </div>
                <span className="text-[10px] mt-0.5 relative z-10 font-semibold tracking-tight text-text-faint">
                  More
                </span>
              </button>
            </nav>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════
          MAIN CONTENT AREA
          ═══════════════════════════════════════════════ */}
        <main className="flex-1 min-w-0 pb-28 md:pb-10 relative z-10">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7">
            <FeatureErrorBoundary featureName="Page Content">
              <PageTransition key={location.pathname}>
                {children || <Outlet />}
              </PageTransition>
            </FeatureErrorBoundary>
          </div>
        </main>
      </div>

      {/* Mobile More Navigation Drawer */}
      <MobileMoreDrawer
        isOpen={isMobileMoreOpen}
        onClose={() => setIsMobileMoreOpen(false)}
        user={user}
        onRequestLogout={requestLogout || logout}
        unreadOpportunitiesCount={unreadOpportunitiesCount}
      />

      <NotificationDrawer />
      <CookieConsentBanner />
      <UsernameClaimModal />
    </div>
  );
}
