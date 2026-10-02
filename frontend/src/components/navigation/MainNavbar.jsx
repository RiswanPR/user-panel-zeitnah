import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Search,
  ChevronDown,
  User,
  LogOut,
  ShieldAlert,
  Settings,
  Layers,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import NotificationBell from "../notifications/NotificationBell";
import QuickSearchModal from "./QuickSearchModal";
import { getUploadUrl } from "../../utils/courseUi";
import {
  normalizeUserRole,
  getPrimaryNavLinks,
  getMoreNavSections,
} from "../../utils/roleNavigation";

/**
 * ZEITNAH — PREMIUM NAVBAR 2.0
 * Role-Aware Navigation + Extraordinary Engineering UX
 *
 * Characteristics:
 * - Calm, precise, editorial, technical, confident.
 * - Dynamic role switching:
 *     Student / Educator / Professional / Mentor -> JOBS
 *     Recruiter / Founder -> MANAGE BUSINESS
 *     Admin -> JOBS (with Admin Governance in More)
 * - Zero duplicated links between primary and More.
 * - Fast, accessible, keyboard-first (Cmd+K, Escape, click-outside).
 */
export default function MainNavbar({
  user,
  onRequestLogout,
  unreadMessagesCount = 0,
  unreadOpportunitiesCount = 0,
  position = null,
}) {
  const location = useLocation();
  const shouldReduceMotion = useReducedMotion();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const moreDropdownRef = useRef(null);
  const profileDropdownRef = useRef(null);
  const moreButtonRef = useRef(null);
  const profileButtonRef = useRef(null);

  // Normalize user role safely (Authoritative)
  const normalizedRole = normalizeUserRole(user);

  // Avatar and initials computation with safe fallback
  const avatarUrl = user?.avatar ? getUploadUrl(user.avatar) : null;
  const userInitials = useMemo(() => {
    const name = user?.name?.trim();
    if (!name) return "Z";
    const initials = name
      .split(/\s+/)
      .map((part) => part[0])
      .filter(Boolean)
      .join("")
      .slice(0, 2)
      .toUpperCase();
    return initials || "Z";
  }, [user?.name]);

  // Global Cmd+K / Ctrl+K keyboard shortcut
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

  // Keyboard navigation & Escape key handler to close menus
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (isMoreOpen) {
          setIsMoreOpen(false);
          moreButtonRef.current?.focus();
        }
        if (isProfileOpen) {
          setIsProfileOpen(false);
          profileButtonRef.current?.focus();
        }
      }
    };
    if (isMoreOpen || isProfileOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isMoreOpen, isProfileOpen]);

  // Click outside listener for open dropdowns
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

  // Auto-close dropdowns on route changes
  useEffect(() => {
    setIsMoreOpen(false);
    setIsProfileOpen(false);
  }, [location.pathname]);

  // Route active state checker
  const isRouteActive = useCallback(
    (key) => {
      const path = location.pathname;
      if (key === "courses") return path === "/courses" || path.startsWith("/courses/") || path === "/";
      if (key === "network") return path === "/network" || path.startsWith("/network/");
      if (key === "messages") return path.startsWith("/messages");
      if (key === "jobs") return path.startsWith("/jobs");
      if (key === "manage-business") return path.startsWith("/manage-business");
      if (key === "career-intelligence") return path.startsWith("/career-intelligence");
      if (key === "portfolio") return path === "/profile/portfolio" || path.endsWith("/portfolio");
      if (key === "verification") return path.startsWith("/profile/verification");
      if (key === "community") return path === "/community" || path.startsWith("/community/");
      if (key === "leaderboard") return path === "/leaderboard" || path.startsWith("/leaderboard/");
      if (key === "admin-businesses") return path.startsWith("/admin/businesses");
      if (key === "profile") {
        if (path === "/profile/portfolio" || path.startsWith("/profile/verification") || path === "/profile/edit") {
          return false;
        }
        return path.startsWith("/profile") || path === "/public-profile" || path.startsWith("/u/");
      }
      return false;
    },
    [location.pathname]
  );

  // Authoritative Primary Navigation Links (Courses is unconditionally first)
  const primaryLinks = useMemo(
    () => getPrimaryNavLinks(user, { unreadMessagesCount }),
    [user, unreadMessagesCount]
  );

  // Authoritative "More" Dropdown Sections (Zero link duplication)
  const moreSections = useMemo(() => getMoreNavSections(user), [user]);

  // Check if any secondary link in More is currently active
  const isAnyMoreLinkActive = useMemo(() => {
    return moreSections.some((section) =>
      section.items.some((item) => isRouteActive(item.key))
    );
  }, [moreSections, isRouteActive]);

  return (
    <>
      {/* ══════════════════════════════════════════════════════════
          ZEITNAH PREMIUM NAVBAR 2.0 (STICKY HEADER)
          Height: 58px | Visual Surface: Technical Deep Frosted Glass
          ══════════════════════════════════════════════════════════ */}
      <header
        aria-label="Main platform navigation"
        className="sticky top-0 z-40 w-full bg-[#0B111E]/95 backdrop-blur-xl border-b border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.35)] transition-all"
      >
        {/* Subtle accent hairline */}
        <div
          className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-brand-mint/35 to-transparent pointer-events-none"
          aria-hidden="true"
        />

        <div className="max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[58px] gap-2 sm:gap-4">
            {/* ── LEFT: Brand Logo & Title ── */}
            <div className="flex items-center gap-6 shrink-0">
              <Link
                to="/courses"
                className="flex items-center gap-2.5 select-none group focus-ring rounded-lg py-1 transition-opacity"
                aria-label="Zeitnah home"
              >
                {/* Technical Compact Logo Frame */}
                <div className="relative w-8 h-8 shrink-0 rounded-lg border border-white/[0.12] bg-[#0E1726]/80 flex items-center justify-center overflow-hidden shadow-inner group-hover:border-brand-mint/40 transition-colors">
                  <img
                    src="/zeitnah-logo.png"
                    alt="Zeitnah Logo"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    width={32}
                    height={32}
                  />
                </div>

                {/* Typography Hierarchy */}
                <div className="flex flex-col justify-center">
                  <span className="font-mono text-[13px] font-bold tracking-[0.14em] text-white group-hover:text-brand-mint transition-colors leading-none uppercase">
                    Zeitnah
                  </span>
                  <span className="text-[8px] font-mono tracking-[0.14em] text-brand-mint/80 font-medium uppercase leading-none mt-1">
                    See the unseen
                  </span>
                </div>
              </Link>

              {/* ── DESKTOP PRIMARY LINKS (Courses FIRST, Role-Aware Career item) ── */}
              <nav
                className="hidden md:flex items-center gap-1"
                aria-label="Desktop primary navigation"
              >
                {primaryLinks.map((item) => {
                  const active = isRouteActive(item.key);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.key}
                      to={item.path}
                      aria-current={active ? "page" : undefined}
                      className={`relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 select-none group focus-ring ${active
                          ? "text-white font-semibold"
                          : "text-text-secondary hover:text-white hover:bg-white/[0.04]"
                        }`}
                    >
                      {/* Active Background Pill */}
                      {active && (
                        <motion.div
                          layoutId={shouldReduceMotion ? undefined : "desktop-navbar-active-pill"}
                          className={`absolute inset-0 rounded-lg ${item.isBusiness
                              ? "bg-brand-mint/15 border border-brand-mint/30 shadow-sm"
                              : "bg-white/[0.07] border border-white/[0.12] shadow-sm"
                            }`}
                          transition={{ type: "spring", stiffness: 450, damping: 32 }}
                        />
                      )}

                      <Icon
                        className={`w-3.5 h-3.5 relative z-10 transition-all duration-200 ${active
                            ? "text-brand-mint"
                            : "text-text-muted group-hover:text-white group-hover:-translate-y-0.5"
                          }`}
                        aria-hidden="true"
                      />

                      <span className="relative z-10 leading-none">{item.label}</span>

                      {/* Unread message count badge */}
                      {item.badge > 0 && (
                        <span className="relative z-10 ml-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold font-mono bg-brand-mint text-black shadow-sm leading-tight">
                          {item.badge > 99 ? "99+" : item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}

                {/* ── Secondary "More" Command Menu ── */}
                <div className="relative" ref={moreDropdownRef}>
                  <button
                    ref={moreButtonRef}
                    type="button"
                    onClick={() => setIsMoreOpen((prev) => !prev)}
                    aria-expanded={isMoreOpen}
                    aria-haspopup="true"
                    aria-label="More platform navigation"
                    className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 select-none group cursor-pointer focus-ring ${isMoreOpen || isAnyMoreLinkActive
                        ? "text-white bg-white/[0.06] border border-white/[0.1]"
                        : "text-text-secondary hover:text-white hover:bg-white/[0.04]"
                      }`}
                  >
                    <span className="leading-none">More</span>
                    {unreadOpportunitiesCount > 0 && (
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-brand-mint shadow-sm"
                        aria-hidden="true"
                      />
                    )}
                    <ChevronDown
                      className={`w-3 h-3 text-text-faint group-hover:text-white transition-transform duration-200 ${isMoreOpen ? "rotate-180 text-brand-mint" : ""
                        }`}
                      aria-hidden="true"
                    />
                  </button>

                  {/* "More" Command Surface Dropdown */}
                  <AnimatePresence>
                    {isMoreOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.98 }}
                        transition={{ duration: 0.14, ease: "easeOut" }}
                        className="absolute left-0 mt-2 w-80 rounded-2xl bg-[#0D1625]/98 border border-white/[0.09] backdrop-blur-2xl shadow-2xl p-2.5 z-50 divide-y divide-white/[0.05]"
                      >
                        {moreSections.map((section) => (
                          <div key={section.id} className="py-1.5 first:pt-0.5 last:pb-0.5">
                            <h4 className="px-2 pb-1 text-[9px] font-mono font-bold tracking-widest text-text-faint uppercase select-none">
                              {section.title}
                            </h4>
                            <div className="space-y-0.5">
                              {section.items.map((item) => {
                                const active = isRouteActive(item.key);
                                const Icon = item.icon;

                                return (
                                  <Link
                                    key={item.key}
                                    to={item.path}
                                    onClick={() => setIsMoreOpen(false)}
                                    aria-current={active ? "page" : undefined}
                                    className={`flex items-center gap-3 px-2.5 py-2 rounded-xl transition-all duration-150 group ${active
                                        ? "bg-brand-mint/12 text-white font-semibold"
                                        : "text-text-secondary hover:text-white hover:bg-white/[0.04]"
                                      }`}
                                  >
                                    <div
                                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${active
                                          ? "bg-brand-mint/20 text-brand-mint"
                                          : "bg-white/[0.03] text-text-muted group-hover:text-brand-mint"
                                        }`}
                                    >
                                      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium truncate leading-tight">
                                        {item.label}
                                      </p>
                                      <p className="text-[10px] text-text-faint truncate leading-tight mt-0.5">
                                        {item.desc}
                                      </p>
                                    </div>
                                  </Link>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </nav>
            </div>

            {/* ── RIGHT: Utilities Area (Search, Rank, Notifications, Profile) ── */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              {/* Command Search Trigger Button (⌘K) */}
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                aria-label="Search platform (Cmd+K)"
                className="flex items-center gap-2 h-8 px-2.5 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.16] text-text-muted hover:text-white transition-all cursor-pointer focus-ring text-xs"
              >
                <Search className="w-3.5 h-3.5 text-brand-mint" aria-hidden="true" />
                <span className="hidden xl:inline text-[11px] font-normal text-text-muted">
                  Search...
                </span>
                <kbd className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono rounded bg-white/[0.06] text-text-faint border border-white/[0.08] leading-none">
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
                className={`flex items-center gap-1.5 h-8 px-2.5 rounded-lg border transition-all active:scale-95 touch-manipulation focus-ring select-none text-xs ${isRouteActive("leaderboard")
                    ? "bg-amber-400/[0.12] border-amber-400/35 text-amber-300"
                    : "bg-white/[0.03] border-white/[0.08] hover:border-amber-400/30 text-white/90"
                  }`}
              >
                <Trophy
                  className="w-3.5 h-3.5 text-amber-400 shrink-0"
                  aria-hidden="true"
                />
                {position?.rank ? (
                  <span className="text-[11px] font-mono font-bold tabular-nums text-white">
                    #{position.rank}
                  </span>
                ) : (
                  <span className="hidden lg:inline text-[11px] font-mono text-text-muted">
                    Rank
                  </span>
                )}
              </Link>

              {/* Notifications Bell */}
              <NotificationBell className="shrink-0" />

              {/* User Profile Menu or Guest Sign In */}
              {user ? (
                <div className="relative" ref={profileDropdownRef}>
                  <button
                    ref={profileButtonRef}
                    type="button"
                    onClick={() => setIsProfileOpen((prev) => !prev)}
                    aria-expanded={isProfileOpen}
                    aria-haspopup="true"
                    aria-label="User account menu"
                    className="flex items-center gap-2 p-1 rounded-lg hover:bg-white/[0.04] transition-colors focus-ring cursor-pointer group"
                  >
                    <div className="relative w-7 h-7 rounded-full border border-brand-mint/30 overflow-hidden flex items-center justify-center bg-gradient-to-br from-brand-mint/20 to-brand-navy/60 shadow-sm shrink-0">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[9px] font-mono font-bold text-brand-mint">
                          {userInitials}
                        </span>
                      )}
                    </div>

                    <span className="hidden xl:block text-xs font-medium text-white/90 group-hover:text-brand-mint transition-colors max-w-[90px] truncate text-left">
                      {user?.name || "Account"}
                    </span>

                    <ChevronDown
                      className={`hidden xl:block w-3 h-3 text-text-faint group-hover:text-white transition-transform duration-200 ${isProfileOpen ? "rotate-180 text-brand-mint" : ""
                        }`}
                      aria-hidden="true"
                    />
                  </button>

                  {/* Profile Command Menu Card */}
                  <AnimatePresence>
                    {isProfileOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.98 }}
                        transition={{ duration: 0.14, ease: "easeOut" }}
                        className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#0D1625]/98 border border-white/[0.09] backdrop-blur-2xl shadow-2xl p-2 z-50 divide-y divide-white/[0.05]"
                      >
                        {/* User Identity Header */}
                        <div className="px-3 py-2.5">
                          <p className="text-xs font-bold text-white truncate leading-tight">
                            {user?.name || "Professional"}
                          </p>
                          <p className="text-[10px] font-mono text-text-muted truncate mt-0.5 leading-tight">
                            @{user?.username || "profile"}
                          </p>

                          {/* Restrained Role Badge (Role != Verification) */}
                          <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.1] text-text-secondary text-[9px] font-mono uppercase tracking-wider font-semibold">
                            {normalizedRole}
                          </div>
                        </div>

                        {/* Profile Quick Links */}
                        <div className="py-1 space-y-0.5">
                          <Link
                            to="/profile"
                            onClick={() => setIsProfileOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-text-secondary hover:text-white hover:bg-white/[0.04] transition-colors"
                          >
                            <User className="w-3.5 h-3.5 text-text-muted" aria-hidden="true" />
                            <span>My Profile</span>
                          </Link>
                          <Link
                            to="/profile/portfolio"
                            onClick={() => setIsProfileOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-text-secondary hover:text-white hover:bg-white/[0.04] transition-colors"
                          >
                            <Layers className="w-3.5 h-3.5 text-text-muted" aria-hidden="true" />
                            <span>Portfolio</span>
                          </Link>
                          <Link
                            to="/profile/verification"
                            onClick={() => setIsProfileOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-text-secondary hover:text-white hover:bg-white/[0.04] transition-colors"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-text-muted" aria-hidden="true" />
                            <span>Verification Center</span>
                          </Link>
                          <Link
                            to="/profile/edit"
                            onClick={() => setIsProfileOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-text-secondary hover:text-white hover:bg-white/[0.04] transition-colors"
                          >
                            <Settings className="w-3.5 h-3.5 text-text-muted" aria-hidden="true" />
                            <span>Account Settings</span>
                          </Link>
                          <Link
                            to="/active-sessions"
                            onClick={() => setIsProfileOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-text-secondary hover:text-white hover:bg-white/[0.04] transition-colors"
                          >
                            <ShieldAlert className="w-3.5 h-3.5 text-text-muted" aria-hidden="true" />
                            <span>Active Sessions</span>
                          </Link>
                        </div>

                        {/* Sign Out Action */}
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setIsProfileOpen(false);
                              onRequestLogout?.();
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer"
                          >
                            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Sign Out</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    to="/login"
                    className="zn-btn-primary text-xs py-1.5 px-3.5 flex items-center gap-1.5 shadow-sm font-semibold cursor-pointer"
                  >
                    <span>Sign In</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Global Quick Search Dialog Modal (Cmd+K) */}
      <QuickSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </>
  );
}
