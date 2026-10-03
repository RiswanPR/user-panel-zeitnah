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
  MessageSquare,
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
 * ZEITNAH — PREMIUM NAVBAR 3.0
 * Community-First Navigation + Precision UX Engineering
 *
 * Navigation Hierarchy:
 *   PRIMARY:  Courses | Community | Network | Jobs/Business | More
 *   UTILITY:  Search · Messages · Leaderboard · Notifications · Profile
 *
 * Design Principles:
 * - Calm, precise, editorial, technical, restrained.
 * - Community is first-class platform destination (position 2).
 * - Messages moves to utility cluster with unread badge.
 * - Leaderboard is a compact rank capsule in utility area.
 * - Role-aware navigation fully preserved (Jobs vs. Manage Business).
 * - Zero route duplication between primary and More.
 * - Sophisticated active states: no loud glows, no filled pills.
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

  const normalizedRole = normalizeUserRole(user);

  const avatarUrl = user?.avatar ? getUploadUrl(user.avatar) : null;
  const userInitials = useMemo(() => {
    const name = user?.name?.trim();
    if (!name) return "Z";
    return name
      .split(/\s+/)
      .map((p) => p[0])
      .filter(Boolean)
      .join("")
      .slice(0, 2)
      .toUpperCase() || "Z";
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

  // Escape key to close open menus and restore focus
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

  // Click outside to dismiss open dropdowns
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

  // Auto-close on route change
  useEffect(() => {
    setIsMoreOpen(false);
    setIsProfileOpen(false);
  }, [location.pathname]);

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

  // Primary nav links: Courses | Community | Network | Jobs/Business | More
  const primaryLinks = useMemo(
    () => getPrimaryNavLinks(user, { unreadMessagesCount }),
    [user, unreadMessagesCount]
  );

  const moreSections = useMemo(() => getMoreNavSections(user), [user]);

  const isAnyMoreLinkActive = useMemo(() => {
    return moreSections.some((section) =>
      section.items.some((item) => isRouteActive(item.key))
    );
  }, [moreSections, isRouteActive]);

  const messagesActive = isRouteActive("messages");
  const leaderboardActive = isRouteActive("leaderboard");

  const dropdownMotion = {
    initial: { opacity: 0, y: 5, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 3, scale: 0.98 },
    transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] },
  };

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════
          ZEITNAH PREMIUM NAVBAR 3.0
          Height: 64px | Surface: Technical deep frosted glass
          ═══════════════════════════════════════════════════════════════ */}
      <header
        aria-label="Main platform navigation"
        className="sticky top-0 z-40 w-full"
        style={{
          background: "rgba(8, 13, 25, 0.92)",
          backdropFilter: "blur(20px) saturate(1.4)",
          WebkitBackdropFilter: "blur(20px) saturate(1.4)",
          borderBottom: "1px solid rgba(255,255,255,0.065)",
          boxShadow: "0 1px 0 rgba(255,255,255,0.04), 0 4px 16px rgba(0,0,0,0.28)",
        }}
      >
        {/* Premium accent hairline — restrained mint gradient */}
        <div
          className="absolute top-0 inset-x-0 h-px pointer-events-none"
          style={{
            background: "linear-gradient(90deg, transparent 0%, rgba(159,213,178,0.28) 40%, rgba(159,213,178,0.18) 60%, transparent 100%)",
          }}
          aria-hidden="true"
        />

        <div className="max-w-[1536px] mx-auto px-4 sm:px-5 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">

            {/* ── LEFT: Brand + Primary Navigation ── */}
            <div className="flex items-center gap-5 xl:gap-7 min-w-0 shrink-0">

              {/* ── BRAND LOGO ── */}
              <Link
                to="/courses"
                className="flex items-center gap-2.5 select-none group shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint/50 rounded-lg"
                aria-label="Zeitnah — Return to home"
              >
                {/* Monogram frame */}
                <div
                  className="relative w-[30px] h-[30px] shrink-0 rounded-lg flex items-center justify-center overflow-hidden transition-all duration-200 group-hover:scale-[1.04]"
                  style={{
                    background: "rgba(14,23,38,0.9)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
                  }}
                >
                  <img
                    src="/zeitnah-logo.png"
                    alt=""
                    aria-hidden="true"
                    className="w-full h-full object-cover"
                    width={30}
                    height={30}
                  />
                </div>

                {/* Wordmark */}
                <div className="flex flex-col justify-center leading-none">
                  <span
                    className="font-mono font-bold tracking-[0.12em] uppercase transition-colors duration-200 text-white group-hover:text-brand-mint"
                    style={{ fontSize: "12px", letterSpacing: "0.12em" }}
                  >
                    Zeitnah
                  </span>
                  <span
                    className="font-mono tracking-[0.16em] uppercase text-brand-mint/60 group-hover:text-brand-mint/80 transition-colors duration-200"
                    style={{ fontSize: "7.5px", marginTop: "2px" }}
                  >
                    See the unseen
                  </span>
                </div>
              </Link>

              {/* ── DESKTOP PRIMARY LINKS ── */}
              <nav
                className="hidden md:flex items-center"
                aria-label="Primary navigation"
                style={{ gap: "2px" }}
              >
                {primaryLinks.map((item) => {
                  const active = isRouteActive(item.key);
                  const Icon = item.icon;
                  const isCommunity = item.isCommunity;

                  return (
                    <Link
                      key={item.key}
                      to={item.path}
                      aria-current={active ? "page" : undefined}
                      title={item.label}
                      className={`relative flex items-center gap-1.5 rounded-lg select-none transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint/50 group ${
                        active
                          ? "text-white"
                          : "text-white/50 hover:text-white/90"
                      }`}
                      style={{
                        padding: "5px 10px",
                        fontSize: "12.5px",
                        fontWeight: active ? 600 : 450,
                        letterSpacing: "0.01em",
                      }}
                    >
                      {/* Active underline indicator */}
                      {active && (
                        <motion.div
                          layoutId={shouldReduceMotion ? undefined : "nav-active-indicator"}
                          className="absolute bottom-0 inset-x-2 h-[1.5px] rounded-full bg-brand-mint"
                          transition={{ type: "spring", stiffness: 500, damping: 35 }}
                        />
                      )}

                      {/* Hover surface */}
                      <div
                        className={`absolute inset-0 rounded-lg transition-all duration-150 ${
                          active
                            ? "bg-white/[0.06]"
                            : "bg-transparent group-hover:bg-white/[0.04]"
                        }`}
                      />

                      {/* Community gets icon always visible; others only on lg */}
                      <Icon
                        className={`shrink-0 relative z-10 transition-colors duration-150 ${
                          active
                            ? isCommunity ? "text-brand-mint" : "text-white"
                            : "text-white/40 group-hover:text-white/70"
                        }`}
                        style={{ width: "13px", height: "13px" }}
                        aria-hidden="true"
                      />

                      <span className="relative z-10 hidden lg:inline">
                        {item.label}
                      </span>

                      {/* Unread badge */}
                      {item.badge > 0 && (
                        <span
                          className="relative z-10 flex items-center justify-center font-mono font-bold text-black bg-brand-mint rounded-full shadow-sm"
                          style={{ minWidth: "16px", height: "16px", padding: "0 4px", fontSize: "9px" }}
                        >
                          {item.badge > 99 ? "99+" : item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}

                {/* ── MORE command menu ── */}
                <div className="relative" ref={moreDropdownRef}>
                  <button
                    ref={moreButtonRef}
                    type="button"
                    onClick={() => setIsMoreOpen((prev) => !prev)}
                    aria-expanded={isMoreOpen}
                    aria-haspopup="true"
                    aria-label="More navigation"
                    className={`relative flex items-center gap-1 rounded-lg select-none transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint/50 group ${
                      isAnyMoreLinkActive
                        ? "text-white"
                        : isMoreOpen
                        ? "text-white/90"
                        : "text-white/50 hover:text-white/90"
                    }`}
                    style={{
                      padding: "5px 8px 5px 10px",
                      fontSize: "12.5px",
                      fontWeight: isAnyMoreLinkActive ? 600 : 450,
                    }}
                  >
                    {isAnyMoreLinkActive && (
                      <motion.div
                        layoutId={shouldReduceMotion ? undefined : "nav-active-indicator"}
                        className="absolute bottom-0 inset-x-2 h-[1.5px] rounded-full bg-brand-mint"
                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                      />
                    )}
                    <div
                      className={`absolute inset-0 rounded-lg transition-all duration-150 ${
                        isAnyMoreLinkActive || isMoreOpen
                          ? "bg-white/[0.06]"
                          : "bg-transparent group-hover:bg-white/[0.04]"
                      }`}
                    />
                    <span className="relative z-10 hidden lg:inline">More</span>
                    <ChevronDown
                      className={`relative z-10 transition-transform duration-200 ${
                        isMoreOpen ? "rotate-180 text-brand-mint" : ""
                      }`}
                      style={{ width: "11px", height: "11px" }}
                      aria-hidden="true"
                    />
                  </button>

                  {/* More command surface */}
                  <AnimatePresence>
                    {isMoreOpen && (
                      <motion.div
                        {...dropdownMotion}
                        className="absolute left-0 mt-1.5 z-50 py-1"
                        style={{
                          width: "288px",
                          background: "rgba(10,16,30,0.98)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: "14px",
                          backdropFilter: "blur(24px)",
                          boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 4px 16px rgba(0,0,0,0.3)",
                        }}
                      >
                        {moreSections.map((section, sIdx) => (
                          <div key={section.id}>
                            {sIdx > 0 && (
                              <div
                                className="mx-3 my-1"
                                style={{ height: "1px", background: "rgba(255,255,255,0.05)" }}
                              />
                            )}
                            <div className="px-3 pt-2.5 pb-1">
                              <p
                                className="font-mono font-bold uppercase tracking-widest text-white/25 select-none"
                                style={{ fontSize: "9px" }}
                              >
                                {section.title}
                              </p>
                            </div>
                            <div className="px-2 pb-1 space-y-0.5">
                              {section.items.map((item) => {
                                const active = isRouteActive(item.key);
                                const Icon = item.icon;
                                return (
                                  <Link
                                    key={item.key}
                                    to={item.path}
                                    onClick={() => setIsMoreOpen(false)}
                                    aria-current={active ? "page" : undefined}
                                    className={`flex items-center gap-3 px-2.5 py-2 rounded-xl transition-all duration-150 group ${
                                      active
                                        ? "bg-brand-mint/8 text-white"
                                        : "text-white/55 hover:text-white hover:bg-white/[0.04]"
                                    }`}
                                  >
                                    <div
                                      className={`flex items-center justify-center shrink-0 rounded-lg transition-colors duration-150 ${
                                        active
                                          ? "bg-brand-mint/15 text-brand-mint"
                                          : "bg-white/[0.04] text-white/35 group-hover:text-white/70 group-hover:bg-white/[0.06]"
                                      }`}
                                      style={{ width: "28px", height: "28px" }}
                                    >
                                      <Icon style={{ width: "13px", height: "13px" }} aria-hidden="true" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p
                                        className="truncate leading-tight font-medium"
                                        style={{ fontSize: "12px" }}
                                      >
                                        {item.label}
                                      </p>
                                      <p
                                        className="truncate text-white/35 leading-tight mt-0.5"
                                        style={{ fontSize: "10px" }}
                                      >
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

            {/* ── RIGHT: Premium Utility Cluster ── */}
            {/* [ Search ] [ Messages ] [ Rank ] [ Notifications ] [ Profile ] */}
            <div className="flex items-center gap-1 shrink-0">

              {/* Subtle separator between nav and utilities on desktop */}
              <div
                className="hidden md:block self-stretch my-3.5 w-px mr-1.5"
                style={{ background: "rgba(255,255,255,0.06)" }}
                aria-hidden="true"
              />

              {/* ── SEARCH ── */}
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                aria-label="Search platform (Cmd+K)"
                className="flex items-center gap-2 rounded-lg transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint/50 group"
                style={{
                  padding: "5px 10px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  color: "rgba(255,255,255,0.45)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.055)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                  e.currentTarget.style.color = "rgba(255,255,255,0.75)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                  e.currentTarget.style.color = "rgba(255,255,255,0.45)";
                }}
              >
                <Search style={{ width: "13px", height: "13px", color: "rgba(159,213,178,0.7)" }} aria-hidden="true" />
                <span className="hidden xl:inline" style={{ fontSize: "11.5px" }}>Search</span>
                <kbd
                  className="hidden sm:flex items-center font-mono"
                  style={{
                    padding: "1px 5px",
                    fontSize: "9.5px",
                    borderRadius: "4px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.3)",
                    lineHeight: "1.5",
                  }}
                >
                  ⌘K
                </kbd>
              </button>

              {/* ── MESSAGES ── */}
              <Link
                to="/messages"
                aria-label={
                  unreadMessagesCount > 0
                    ? `Messages, ${unreadMessagesCount} unread`
                    : "Messages"
                }
                title="Messages"
                className="relative flex items-center justify-center rounded-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint/50 group"
                style={{
                  width: "34px",
                  height: "34px",
                  color: messagesActive ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.45)",
                  background: messagesActive ? "rgba(255,255,255,0.07)" : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (!messagesActive) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                    e.currentTarget.style.color = "rgba(255,255,255,0.8)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!messagesActive) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "rgba(255,255,255,0.45)";
                  }
                }}
              >
                <MessageSquare style={{ width: "16px", height: "16px" }} aria-hidden="true" />

                {/* Unread badge */}
                {unreadMessagesCount > 0 && (
                  <span
                    className="absolute flex items-center justify-center font-mono font-bold text-black bg-brand-mint rounded-full shadow-sm"
                    style={{
                      top: "3px",
                      right: "3px",
                      minWidth: "15px",
                      height: "15px",
                      padding: "0 3px",
                      fontSize: "8.5px",
                    }}
                    aria-hidden="true"
                  >
                    {unreadMessagesCount > 99 ? "99+" : unreadMessagesCount}
                  </span>
                )}
              </Link>

              {/* ── LEADERBOARD RANK CAPSULE ── */}
              <Link
                to="/leaderboard"
                aria-label={
                  position?.rank
                    ? `Leaderboard — your rank is #${position.rank}`
                    : "Global Leaderboard"
                }
                title="Leaderboard"
                className="flex items-center gap-1.5 rounded-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
                style={{
                  padding: "4px 9px",
                  background: leaderboardActive
                    ? "rgba(251,191,36,0.1)"
                    : "rgba(255,255,255,0.03)",
                  border: leaderboardActive
                    ? "1px solid rgba(251,191,36,0.25)"
                    : "1px solid rgba(255,255,255,0.07)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(251,191,36,0.22)";
                  e.currentTarget.style.background = "rgba(251,191,36,0.07)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = leaderboardActive
                    ? "rgba(251,191,36,0.25)"
                    : "rgba(255,255,255,0.07)";
                  e.currentTarget.style.background = leaderboardActive
                    ? "rgba(251,191,36,0.1)"
                    : "rgba(255,255,255,0.03)";
                }}
              >
                <Trophy
                  style={{ width: "13px", height: "13px", color: "rgba(251,191,36,0.8)" }}
                  aria-hidden="true"
                />
                {position?.rank ? (
                  <span
                    className="font-mono font-bold tabular-nums"
                    style={{ fontSize: "11px", color: "rgba(255,255,255,0.85)" }}
                  >
                    #{position.rank}
                  </span>
                ) : (
                  <span
                    className="hidden lg:inline font-mono"
                    style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)" }}
                  >
                    Rank
                  </span>
                )}
              </Link>

              {/* ── NOTIFICATIONS ── */}
              <NotificationBell className="shrink-0" />

              {/* ── PROFILE MENU ── */}
              {user ? (
                <div className="relative ml-0.5" ref={profileDropdownRef}>
                  <button
                    ref={profileButtonRef}
                    type="button"
                    onClick={() => setIsProfileOpen((prev) => !prev)}
                    aria-expanded={isProfileOpen}
                    aria-haspopup="true"
                    aria-label="Open profile menu"
                    className="flex items-center gap-2 rounded-lg transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint/50 group"
                    style={{ padding: "3px 6px 3px 3px" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    {/* Avatar */}
                    <div
                      className="relative flex items-center justify-center overflow-hidden transition-transform duration-200 group-hover:scale-[1.03]"
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, rgba(159,213,178,0.2) 0%, rgba(18,49,76,0.6) 100%)",
                        border: "1.5px solid rgba(159,213,178,0.25)",
                      }}
                    >
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="" aria-hidden="true" className="w-full h-full object-cover" />
                      ) : (
                        <span
                          className="font-mono font-bold text-brand-mint"
                          style={{ fontSize: "9px" }}
                        >
                          {userInitials}
                        </span>
                      )}
                    </div>

                    {/* Name — only at wide screens */}
                    <span
                      className="hidden xl:block max-w-[80px] truncate text-left transition-colors duration-150 text-white/70 group-hover:text-white/90"
                      style={{ fontSize: "12px", fontWeight: 500 }}
                    >
                      {user?.name || "Account"}
                    </span>

                    <ChevronDown
                      className={`hidden xl:block transition-transform duration-200 ${isProfileOpen ? "rotate-180" : ""}`}
                      style={{ width: "11px", height: "11px", color: "rgba(255,255,255,0.3)" }}
                      aria-hidden="true"
                    />
                  </button>

                  {/* Profile dropdown */}
                  <AnimatePresence>
                    {isProfileOpen && (
                      <motion.div
                        {...dropdownMotion}
                        className="absolute right-0 mt-1.5 z-50"
                        style={{
                          width: "240px",
                          background: "rgba(10,16,30,0.98)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: "14px",
                          backdropFilter: "blur(24px)",
                          boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 4px 16px rgba(0,0,0,0.3)",
                          padding: "8px",
                        }}
                      >
                        {/* Identity header */}
                        <div
                          className="px-2.5 py-2.5 mb-1"
                          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                        >
                          <p
                            className="font-semibold text-white truncate leading-tight"
                            style={{ fontSize: "12.5px" }}
                          >
                            {user?.name || "Professional"}
                          </p>
                          <p
                            className="font-mono text-white/40 truncate leading-tight mt-0.5"
                            style={{ fontSize: "10px" }}
                          >
                            @{user?.username || "profile"}
                          </p>
                          <div
                            className="mt-2 inline-flex items-center font-mono font-semibold uppercase tracking-wider"
                            style={{
                              padding: "2px 7px",
                              fontSize: "8.5px",
                              borderRadius: "5px",
                              background: "rgba(255,255,255,0.05)",
                              border: "1px solid rgba(255,255,255,0.08)",
                              color: "rgba(255,255,255,0.4)",
                            }}
                          >
                            {normalizedRole}
                          </div>
                        </div>

                        {/* Links */}
                        <div className="space-y-0.5 mb-1">
                          {[
                            { to: "/profile", icon: User, label: "My Profile" },
                            { to: "/profile/portfolio", icon: Layers, label: "Portfolio" },
                            { to: "/profile/verification", icon: ShieldCheck, label: "Verification Center" },
                            { to: "/profile/edit", icon: Settings, label: "Account Settings" },
                            { to: "/active-sessions", icon: ShieldAlert, label: "Active Sessions" },
                          ].map(({ to, icon: Icon, label }) => (
                            <Link
                              key={to}
                              to={to}
                              onClick={() => setIsProfileOpen(false)}
                              className="flex items-center gap-2.5 rounded-xl transition-all duration-150 text-white/55 hover:text-white hover:bg-white/[0.04]"
                              style={{ padding: "7px 10px" }}
                            >
                              <Icon style={{ width: "13px", height: "13px" }} aria-hidden="true" />
                              <span style={{ fontSize: "12px" }}>{label}</span>
                            </Link>
                          ))}
                        </div>

                        {/* Sign out */}
                        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "6px" }}>
                          <button
                            type="button"
                            onClick={() => {
                              setIsProfileOpen(false);
                              onRequestLogout?.();
                            }}
                            className="w-full flex items-center gap-2.5 rounded-xl transition-all duration-150 cursor-pointer"
                            style={{
                              padding: "7px 10px",
                              fontSize: "12px",
                              color: "rgba(248,113,113,0.8)",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "rgba(239,68,68,0.08)";
                              e.currentTarget.style.color = "rgba(252,165,165,0.9)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "transparent";
                              e.currentTarget.style.color = "rgba(248,113,113,0.8)";
                            }}
                          >
                            <LogOut style={{ width: "13px", height: "13px" }} aria-hidden="true" />
                            <span>Sign Out</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="zn-btn-primary text-xs py-1.5 px-3.5 flex items-center gap-1.5 shadow-sm font-semibold cursor-pointer ml-1"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Global Quick Search Dialog */}
      <QuickSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </>
  );
}
