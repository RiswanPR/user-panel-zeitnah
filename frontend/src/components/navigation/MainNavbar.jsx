import { useState, useRef, useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  GraduationCap,
  Compass,
  MessageSquare,
  Briefcase,
  Inbox,
  TrendingUp,
  Layers,
  ShieldCheck,
  Building2,
  Trophy,
  Search,
  ChevronDown,
  User,
  LogOut,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import NotificationBell from "../notifications/NotificationBell";
import QuickSearchModal from "./QuickSearchModal";
import { getUploadUrl } from "../../utils/courseUi";

export default function MainNavbar({
  user,
  onRequestLogout,
  unreadMessagesCount = 0,
  unreadOpportunitiesCount = 0,
  position = null,
}) {
  const location = useLocation();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const moreDropdownRef = useRef(null);
  const profileDropdownRef = useRef(null);

  const normalizedRole = (user?.primaryRole || "STUDENT").toUpperCase();
  const isBusinessRole =
    normalizedRole === "RECRUITER" || normalizedRole === "FOUNDER" || normalizedRole === "ADMIN";

  const avatarUrl = user?.avatar ? getUploadUrl(user.avatar) : null;
  const userInitials =
    user?.name?.trim()
      ? user.name
          .trim()
          .split(/\s+/)
          .map((n) => n[0])
          .filter(Boolean)
          .join("")
          .slice(0, 2)
          .toUpperCase() || "Z"
      : "Z";

  // Global Cmd+K / Ctrl+K shortcut to open Quick Search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(e.target)) {
        setIsMoreOpen(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdowns on route change
  useEffect(() => {
    setIsMoreOpen(false);
    setIsProfileOpen(false);
  }, [location.pathname]);

  // Route active state check
  const isRouteActive = (key) => {
    const path = location.pathname;
    if (key === "courses") return path === "/courses" || path.startsWith("/courses/") || path === "/";
    if (key === "learning") return path === "/my-learning" || path.startsWith("/my-learning/");
    if (key === "network") return path === "/network" || path.startsWith("/network/");
    if (key === "messages") return path.startsWith("/messages");
    if (key === "jobs") return path.startsWith("/jobs");
    if (key === "opportunities")
      return path.startsWith("/opportunities") || path.startsWith("/career/opportunities");
    if (key === "career-intelligence") return path.startsWith("/career-intelligence");
    if (key === "portfolio") return path === "/profile/portfolio" || path.endsWith("/portfolio");
    if (key === "verification") return path.startsWith("/profile/verification");
    if (key === "leaderboard") return path === "/leaderboard" || path.startsWith("/leaderboard/");
    if (key === "manage-business") return path.startsWith("/manage-business");
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

  // Primary navigation links — Courses is unconditionally FIRST
  const primaryLinks = useMemo(
    () => [
      {
        key: "courses",
        path: "/courses",
        label: "Courses",
        icon: BookOpen,
        highlight: true,
      },
      {
        key: "learning",
        path: "/my-learning",
        label: "My Learning",
        icon: GraduationCap,
      },
      {
        key: "network",
        path: "/network",
        label: "Network",
        icon: Compass,
      },
      {
        key: "messages",
        path: "/messages",
        label: "Messages",
        icon: MessageSquare,
        badge: unreadMessagesCount,
      },
      {
        key: "jobs",
        path: "/jobs",
        label: "Jobs",
        icon: Briefcase,
      },
    ],
    [unreadMessagesCount]
  );

  // Secondary "More" links
  const secondaryLinks = useMemo(
    () => [
      {
        key: "opportunities",
        path: "/opportunities/inbox",
        label: "Opportunities",
        icon: Inbox,
        desc: "Employer inquiries & recruiter messages",
        badge: unreadOpportunitiesCount,
      },
      {
        key: "career-intelligence",
        path: "/career-intelligence",
        label: "Career Intelligence",
        icon: TrendingUp,
        desc: "Role roadmaps & skill pathway mapping",
      },
      {
        key: "portfolio",
        path: "/profile/portfolio",
        label: "Engineering Portfolio",
        icon: Layers,
        desc: "BIM models, verified project showcases",
      },
      {
        key: "verification",
        path: "/profile/verification",
        label: "Verification Center",
        icon: ShieldCheck,
        desc: "Degrees, certificates & trust badges",
      },
      {
        key: "leaderboard",
        path: "/leaderboard",
        label: "Global Leaderboard",
        icon: Trophy,
        desc: "Platform rank & competitive standings",
      },
      ...(isBusinessRole
        ? [
            {
              key: "manage-business",
              path: "/manage-business",
              label: "Manage Business",
              icon: Building2,
              desc: "Hiring dashboard, team management",
            },
          ]
        : []),
    ],
    [isBusinessRole, unreadOpportunitiesCount]
  );

  const isAnyMoreLinkActive = secondaryLinks.some((l) => isRouteActive(l.key));

  return (
    <>
      {/* ══════════════════════════════════════════════════════════
          MAIN STICKY TOP NAVBAR
          ══════════════════════════════════════════════════════════ */}
      <header
        aria-label="Main navigation header"
        className="sticky top-0 z-40 w-full bg-[#0B111E]/95 backdrop-blur-2xl border-b border-white/[0.08] shadow-[0_4px_28px_rgba(0,0,0,0.4)] transition-all"
      >
        {/* Subtle accent hairline */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-brand-mint/40 to-transparent pointer-events-none" />

        <div className="max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">
            {/* ── LEFT: Brand Logo & Title ── */}
            <div className="flex items-center gap-6 shrink-0">
              <Link
                to="/courses"
                className="flex items-center gap-3 select-none group focus-ring rounded-xl py-1"
                aria-label="Zeitnah home"
              >
                <div className="relative w-9 h-9 shrink-0">
                  <div className="absolute inset-0 bg-brand-mint/25 rounded-xl blur-sm group-hover:blur-md transition-all" />
                  <div className="relative w-9 h-9 rounded-xl border border-brand-mint/35 overflow-hidden shadow-md flex items-center justify-center bg-bg-surface">
                    <img
                      src="/zeitnah-logo.png"
                      alt="Zeitnah Logo"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                </div>

                <div className="hidden sm:block">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base font-heading font-extrabold tracking-wider uppercase text-white group-hover:text-brand-mint transition-colors leading-none">
                      Zeitnah
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-mint animate-pulse" />
                  </div>
                  <p className="text-[9px] font-mono uppercase tracking-widest text-text-faint leading-tight mt-0.5">
                    Infrastructure Platform
                  </p>
                </div>
              </Link>

              {/* ── DESKTOP PRIMARY LINKS (Courses FIRST) ── */}
              <nav
                className="hidden md:flex items-center gap-1"
                aria-label="Desktop Primary Navigation"
              >
                {primaryLinks.map((item) => {
                  const active = isRouteActive(item.key);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.key}
                      to={item.path}
                      aria-current={active ? "page" : undefined}
                      className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 select-none group focus-ring ${
                        active
                          ? "text-white font-bold"
                          : "text-text-muted hover:text-white hover:bg-white/[0.04]"
                      }`}
                    >
                      {/* Active Indicator Background */}
                      {active && (
                        <motion.div
                          layoutId="top-nav-active-pill"
                          className="absolute inset-0 rounded-xl bg-brand-mint/12 border border-brand-mint/25 shadow-sm"
                          transition={{ type: "spring", stiffness: 450, damping: 32 }}
                        />
                      )}

                      <Icon
                        className={`w-4 h-4 relative z-10 transition-colors ${
                          active
                            ? "text-brand-mint"
                            : "text-text-faint group-hover:text-brand-mint/80"
                        }`}
                      />

                      <span className="relative z-10">{item.label}</span>

                      {/* Unread badge count */}
                      {item.badge > 0 && (
                        <span className="relative z-10 ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold font-mono bg-brand-mint text-black shadow-sm">
                          {item.badge > 99 ? "99+" : item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}

                {/* ── Secondary "More" Dropdown ── */}
                <div className="relative" ref={moreDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsMoreOpen((prev) => !prev)}
                    aria-expanded={isMoreOpen}
                    aria-haspopup="true"
                    className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 select-none group cursor-pointer focus-ring ${
                      isMoreOpen || isAnyMoreLinkActive
                        ? "text-white bg-white/[0.06] border border-white/[0.1]"
                        : "text-text-muted hover:text-white hover:bg-white/[0.04]"
                    }`}
                  >
                    <span>More</span>
                    {unreadOpportunitiesCount > 0 && (
                      <span className="w-2 h-2 rounded-full bg-brand-mint shadow-sm" />
                    )}
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 text-text-faint group-hover:text-white ${
                        isMoreOpen ? "rotate-180 text-brand-mint" : ""
                      }`}
                    />
                  </button>

                  {/* Dropdown Menu */}
                  <AnimatePresence>
                    {isMoreOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.97 }}
                        transition={{ duration: 0.16, ease: "easeOut" }}
                        className="absolute left-0 mt-2 w-72 rounded-2xl bg-[#0D1625]/95 border border-white/[0.1] backdrop-blur-2xl shadow-2xl p-2 z-50 divide-y divide-white/[0.04]"
                      >
                        <div className="space-y-0.5 py-1">
                          {secondaryLinks.map((item) => {
                            const active = isRouteActive(item.key);
                            const Icon = item.icon;

                            return (
                              <Link
                                key={item.key}
                                to={item.path}
                                onClick={() => setIsMoreOpen(false)}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                                  active
                                    ? "bg-brand-mint/12 text-white font-semibold"
                                    : "text-text-secondary hover:text-white hover:bg-white/[0.04]"
                                }`}
                              >
                                <div
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                    active
                                      ? "bg-brand-mint/20 text-brand-mint"
                                      : "bg-white/[0.03] text-text-muted"
                                  }`}
                                >
                                  <Icon className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium truncate">
                                      {item.label}
                                    </span>
                                    {item.badge > 0 && (
                                      <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold font-mono bg-brand-mint text-black">
                                        {item.badge}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-text-faint truncate">
                                    {item.desc}
                                  </p>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </nav>
            </div>

            {/* ── RIGHT: Search Trigger, Trophy, Notifications, Profile ── */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Quick Search Trigger Button */}
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                aria-label="Search platform (Cmd+K)"
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.15] text-text-muted hover:text-white transition-all cursor-pointer focus-ring text-xs"
              >
                <Search className="w-3.5 h-3.5 text-brand-mint" />
                <span className="hidden xl:inline text-[11px] font-medium text-text-muted">
                  Search courses, jobs...
                </span>
                <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono rounded bg-white/[0.06] text-text-faint border border-white/[0.08]">
                  ⌘K
                </kbd>
              </button>

              {/* Global Leaderboard Rank Pill */}
              <Link
                to="/leaderboard"
                aria-label={
                  position?.rank ? `Leaderboard rank #${position.rank}` : "Global Leaderboard"
                }
                title="View Leaderboard"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all active:scale-95 touch-manipulation focus-ring select-none ${
                  isRouteActive("leaderboard")
                    ? "bg-brand-yellow/[0.15] border-brand-yellow/40 text-brand-yellow"
                    : "bg-white/[0.03] border-white/[0.08] hover:border-brand-yellow/30 text-white"
                }`}
              >
                <Trophy className="w-3.5 h-3.5 text-brand-yellow shrink-0" />
                {position?.rank ? (
                  <span className="text-[11px] font-mono font-bold tabular-nums text-white/95">
                    #{position.rank}
                  </span>
                ) : (
                  <span className="hidden lg:inline text-[11px] font-mono font-semibold text-text-muted">
                    Rank
                  </span>
                )}
              </Link>

              {/* Notifications Bell */}
              <NotificationBell className="shrink-0" />

              {/* User Profile Menu Dropdown */}
              <div className="relative" ref={profileDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsProfileOpen((prev) => !prev)}
                  aria-expanded={isProfileOpen}
                  aria-haspopup="true"
                  aria-label="User account menu"
                  className="flex items-center gap-2 p-1 rounded-xl hover:bg-white/[0.04] transition-colors focus-ring cursor-pointer group"
                >
                  <div className="relative w-8 h-8 rounded-full border border-brand-mint/35 overflow-hidden flex items-center justify-center bg-gradient-to-br from-brand-mint/20 to-brand-navy/60 shadow-sm shrink-0">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] font-heading font-bold text-brand-mint">
                        {userInitials}
                      </span>
                    )}
                    <div className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-success border border-[#0B111E]" />
                  </div>

                  <span className="hidden lg:block text-xs font-semibold text-white/90 group-hover:text-brand-mint transition-colors max-w-[100px] truncate text-left">
                    {user?.name || "Account"}
                  </span>

                  <ChevronDown
                    className={`hidden lg:block w-3.5 h-3.5 text-text-faint group-hover:text-white transition-transform ${
                      isProfileOpen ? "rotate-180 text-brand-mint" : ""
                    }`}
                  />
                </button>

                {/* Profile Dropdown Menu */}
                <AnimatePresence>
                  {isProfileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.97 }}
                      transition={{ duration: 0.16, ease: "easeOut" }}
                      className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#0D1625]/95 border border-white/[0.1] backdrop-blur-2xl shadow-2xl p-2 z-50 divide-y divide-white/[0.06]"
                    >
                      {/* User Info Header */}
                      <div className="px-3 py-2.5">
                        <p className="text-xs font-heading font-bold text-white truncate">
                          {user?.name || "Professional"}
                        </p>
                        <p className="text-[10px] font-mono text-text-muted truncate mt-0.5">
                          @{user?.username || "profile"}
                        </p>
                        <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-mint/10 border border-brand-mint/20 text-brand-mint text-[9px] font-mono uppercase font-semibold">
                          <Sparkles className="w-2.5 h-2.5" />
                          {normalizedRole}
                        </div>
                      </div>

                      {/* Profile Links */}
                      <div className="py-1 space-y-0.5">
                        <Link
                          to="/profile"
                          onClick={() => setIsProfileOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-text-secondary hover:text-white hover:bg-white/[0.04] transition-colors"
                        >
                          <User className="w-3.5 h-3.5 text-text-muted" />
                          <span>My Profile</span>
                        </Link>
                        <Link
                          to="/my-learning"
                          onClick={() => setIsProfileOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-text-secondary hover:text-white hover:bg-white/[0.04] transition-colors"
                        >
                          <GraduationCap className="w-3.5 h-3.5 text-text-muted" />
                          <span>My Learning</span>
                        </Link>
                        <Link
                          to="/profile/portfolio"
                          onClick={() => setIsProfileOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-text-secondary hover:text-white hover:bg-white/[0.04] transition-colors"
                        >
                          <Layers className="w-3.5 h-3.5 text-text-muted" />
                          <span>Portfolio</span>
                        </Link>
                        <Link
                          to="/active-sessions"
                          onClick={() => setIsProfileOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-text-secondary hover:text-white hover:bg-white/[0.04] transition-colors"
                        >
                          <ShieldAlert className="w-3.5 h-3.5 text-text-muted" />
                          <span>Active Sessions</span>
                        </Link>
                      </div>

                      {/* Logout Action */}
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileOpen(false);
                            onRequestLogout?.();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Global Quick Search Dialog Modal */}
      <QuickSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </>
  );
}
