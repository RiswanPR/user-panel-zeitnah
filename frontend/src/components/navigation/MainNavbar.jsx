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
  Compass,
  ArrowRightLeft,
  Building2,
} from "lucide-react";
import NotificationBell from "../notifications/NotificationBell";
import QuickSearchModal from "./QuickSearchModal";
import { getUploadUrl } from "../../utils/courseUi";
import {
  normalizeUserRole,
  getPrimaryNavLinks,
  getMoreNavSections,
} from "../../utils/roleNavigation";
import { useOnboarding } from "../../context/OnboardingContext";
import { useActiveProfile } from "../../context/ActiveProfileContext";
import BusinessLogo from "../business/BusinessLogo";
import { getBusinessProfileUrl } from "../../utils/businessProfile";
import ProfileSwitcher from "./ProfileSwitcher";
import ProfileAvatar from "../profile/ProfileAvatar";

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
  profile,
  onRequestLogout,
  unreadMessagesCount = 0,
  unreadOpportunitiesCount = 0,
  position = null,
}) {
  const location = useLocation();
  const shouldReduceMotion = useReducedMotion();
  const { startTour } = useOnboarding();
  const {
    activeProfileMode,
    isPersonalMode,
    isBusinessMode,
    hasBusinessProfile,
    business,
    switchToPersonal,
    switchToBusiness,
  } = useActiveProfile();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const moreDropdownRef = useRef(null);
  const profileDropdownRef = useRef(null);
  const moreButtonRef = useRef(null);
  const profileButtonRef = useRef(null);

  const currentUser = profile || user;
  const normalizedRole = normalizeUserRole(currentUser || user);

  // Authoritative avatar resolution across profile, user, and legacy fields
  const rawAvatar =
    currentUser?.avatar ||
    user?.avatar ||
    profile?.avatar ||
    currentUser?.profilePicture ||
    user?.profilePicture ||
    currentUser?.avatarUrl ||
    user?.avatarUrl ||
    currentUser?.profileImage ||
    user?.profileImage;

  const currentUserName = currentUser?.name || user?.name || "";
  const userInitials = useMemo(() => {
    const name = currentUserName.trim();
    if (!name) return "Z";
    return (
      name
        .split(/\s+/)
        .map((p) => p[0])
        .filter(Boolean)
        .join("")
        .slice(0, 2)
        .toUpperCase() || "Z"
    );
  }, [currentUserName]);

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
      if (key === "verification") return path.startsWith("/profile/verification") || path.startsWith("/profile/account");
      if (key === "community") return path === "/community" || path.startsWith("/community/");
      if (key === "leaderboard") return path === "/leaderboard" || path.startsWith("/leaderboard/");
      if (key === "admin-businesses") return path.startsWith("/admin/businesses");
      if (key === "profile") {
        if (path.startsWith("/profile/verification") || path.startsWith("/profile/account") || path === "/profile/edit") {
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
          background: "var(--color-surface)",
          backdropFilter: "blur(20px) saturate(1.4)",
          WebkitBackdropFilter: "blur(20px) saturate(1.4)",
          borderBottom: "1px solid var(--color-border)",
          boxShadow: "0 1px 0 var(--color-border), 0 4px 16px rgba(0,0,0,0.12)",
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
                    background: "var(--color-surface-elevated)",
                    border: "1px solid var(--color-border)",
                    boxShadow: "inset 0 1px 0 var(--color-border)",
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
                    className="font-mono font-bold tracking-[0.12em] uppercase transition-colors duration-200 text-text-primary group-hover:text-brand-mint"
                    style={{ fontSize: "12px", letterSpacing: "0.12em" }}
                  >
                    Zeitnah
                  </span>
                  <span
                    className="font-mono tracking-[0.16em] uppercase text-brand-mint/80 group-hover:text-brand-mint transition-colors duration-200"
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
                      data-tour={
                        item.key === 'courses'
                          ? 'learning'
                          : item.key === 'jobs' || item.key === 'manage-business'
                          ? 'opportunities'
                          : item.key
                      }
                      className={`relative flex items-center gap-1.5 rounded-lg select-none transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint/50 group ${
                        active
                          ? "text-text-primary"
                          : "text-text-muted hover:text-text-primary"
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
                            ? "bg-brand-mint/10"
                            : "bg-transparent group-hover:bg-surface-elevated"
                        }`}
                      />

                      {/* Community gets icon always visible; others only on lg */}
                      <Icon
                        className={`shrink-0 relative z-10 transition-colors duration-150 ${
                          active
                            ? isCommunity ? "text-brand-mint" : "text-text-primary"
                            : "text-text-muted group-hover:text-text-secondary"
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
                        ? "text-text-primary"
                        : isMoreOpen
                        ? "text-text-primary"
                        : "text-text-muted hover:text-text-primary"
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
                          ? "bg-brand-mint/10"
                          : "bg-transparent group-hover:bg-surface-elevated"
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
                          background: "var(--color-surface-card)",
                          border: "1px solid var(--color-border)",
                          borderRadius: "14px",
                          backdropFilter: "blur(24px)",
                          boxShadow: "0 20px 60px rgba(0,0,0,0.3), 0 4px 16px rgba(0,0,0,0.15)",
                        }}
                      >
                        {moreSections.map((section, sIdx) => (
                          <div key={section.id}>
                            {sIdx > 0 && (
                              <div
                                className="mx-3 my-1"
                                style={{ height: "1px", background: "var(--color-border)" }}
                              />
                            )}
                            <div className="px-3 pt-2.5 pb-1">
                              <p
                                className="font-mono font-bold uppercase tracking-widest text-text-faint select-none"
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
                                        ? "bg-brand-mint/12 text-text-primary"
                                        : "text-text-secondary hover:text-text-primary hover:bg-surface-elevated"
                                    }`}
                                  >
                                    <div
                                      className={`flex items-center justify-center shrink-0 rounded-lg transition-colors duration-150 ${
                                        active
                                          ? "bg-brand-mint/15 text-brand-mint"
                                          : "bg-surface-elevated text-text-muted group-hover:text-text-primary group-hover:bg-surface-elevated"
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
                                        className="truncate text-text-muted leading-tight mt-0.5"
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
                style={{ background: "var(--color-border)" }}
                aria-hidden="true"
              />

              {/* ── SEARCH ── */}
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                aria-label="Search platform (Cmd+K)"
                className="flex items-center gap-2 rounded-lg transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint/50 group bg-surface-elevated/50 hover:bg-surface-elevated border border-border text-text-muted hover:text-text-secondary"
                style={{
                  padding: "5px 10px",
                }}
              >
                <Search style={{ width: "13px", height: "13px", color: "rgba(159,213,178,0.7)" }} aria-hidden="true" />
                <span className="hidden xl:inline" style={{ fontSize: "11.5px" }}>Search</span>
                <kbd
                  className="hidden sm:flex items-center font-mono px-1.5 py-0.5 rounded text-[9.5px] bg-surface-elevated border border-border text-text-faint leading-normal"
                >
                  ⌘K
                </kbd>
              </button>

              {/* ── CONNECTED HUB: MESSAGES + LEADERBOARD + NOTIFICATIONS ── */}
              <div data-tour="connected" className="flex items-center gap-1">
                {/* ── MESSAGES ── */}
                <Link
                  to="/messages"
                  aria-label={
                    unreadMessagesCount > 0
                      ? `Messages, ${unreadMessagesCount} unread`
                      : "Messages"
                  }
                  title="Messages"
                  className={`relative flex items-center justify-center rounded-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint/50 group ${
                    messagesActive
                      ? "text-text-primary bg-surface-elevated"
                      : "text-text-muted hover:text-text-primary hover:bg-surface-elevated"
                  }`}
                  style={{
                    width: "34px",
                    height: "34px",
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
                  className={`flex items-center gap-1.5 rounded-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 ${
                    leaderboardActive
                      ? "bg-amber-400/10 border border-amber-400/30"
                      : "bg-surface-elevated/40 hover:bg-amber-400/5 border border-border hover:border-amber-400/25"
                  }`}
                  style={{
                    padding: "4px 9px",
                  }}
                >
                  <Trophy
                    style={{ width: "13px", height: "13px", color: "rgba(251,191,36,0.8)" }}
                    aria-hidden="true"
                  />
                  {position?.rank ? (
                    <span
                      className="font-mono font-bold tabular-nums text-text-primary"
                      style={{ fontSize: "11px" }}
                    >
                      #{position.rank}
                    </span>
                  ) : (
                    <span
                      className="hidden lg:inline font-mono text-text-faint"
                      style={{ fontSize: "11px" }}
                    >
                      Rank
                    </span>
                  )}
                </Link>

                {/* ── NOTIFICATIONS ── */}
                <NotificationBell className="shrink-0" />
              </div>

              {/* ── PROFILE MENU ── */}
              {user ? (
                <div className="relative ml-0.5" ref={profileDropdownRef} data-tour="profile">
                  <button
                    ref={profileButtonRef}
                    type="button"
                    onClick={() => setIsProfileOpen((prev) => !prev)}
                    aria-expanded={isProfileOpen}
                    aria-haspopup="true"
                    aria-label="Open profile menu"
                    className="flex items-center gap-2 rounded-lg transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint/50 group hover:bg-surface-elevated"
                    style={{ padding: "3px 6px 3px 3px" }}
                  >
                    {/* Avatar */}
                    {isBusinessMode && business ? (
                      <div
                        className="relative flex items-center justify-center overflow-hidden transition-transform duration-200 group-hover:scale-[1.03]"
                        style={{
                          width: "28px",
                          height: "28px",
                        }}
                      >
                        <BusinessLogo
                          logo={business.logo}
                          name={business.name}
                          size="xs"
                          className="!w-7 !h-7 !rounded-lg border-[1.5px] border-brand-mint/35"
                        />
                      </div>
                    ) : (
                      <div className="relative flex items-center justify-center transition-transform duration-200 group-hover:scale-[1.03]">
                        <ProfileAvatar
                          src={rawAvatar}
                          name={currentUserName || "Account"}
                          size="xxs"
                          shape="circle"
                          className="!w-7 !h-7 border-[1.5px] border-brand-mint/30 shadow-sm"
                        />
                      </div>
                    )}

                    {/* Name — only at wide screens */}
                    <span
                      className="hidden xl:block max-w-[80px] truncate text-left transition-colors duration-150 text-text-secondary group-hover:text-text-primary"
                      style={{ fontSize: "12px", fontWeight: 500 }}
                    >
                      {isBusinessMode && business ? business.name : (currentUserName || "Account")}
                    </span>

                    <ChevronDown
                      className={`hidden xl:block transition-transform duration-200 ${isProfileOpen ? "rotate-180" : ""} text-text-faint`}
                      style={{ width: "11px", height: "11px" }}
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
                          background: "var(--color-surface-card)",
                          border: "1px solid var(--color-border)",
                          borderRadius: "14px",
                          backdropFilter: "blur(24px)",
                          boxShadow: "0 20px 60px rgba(0,0,0,0.3), 0 4px 16px rgba(0,0,0,0.15)",
                          padding: "8px",
                        }}
                      >
                        {/* Identity header */}
                        <div
                          className="px-2.5 py-2.5 mb-1"
                          style={{ borderBottom: "1px solid var(--color-border)" }}
                        >
                          <div className="flex items-center gap-2.5 mb-2">
                            {isBusinessMode && business ? (
                              <BusinessLogo
                                logo={business.logo}
                                name={business.name}
                                size="sm"
                                className="shrink-0"
                              />
                            ) : (
                              <div className="shrink-0 flex items-center justify-center">
                                <ProfileAvatar
                                  src={rawAvatar}
                                  name={currentUserName || "Account"}
                                  size="xs"
                                  shape="circle"
                                  className="!w-8 !h-8 border-[1.5px] border-brand-mint/30 shadow-sm"
                                />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p
                                className="font-semibold text-text-primary truncate leading-tight"
                                style={{ fontSize: "12.5px" }}
                              >
                                {isBusinessMode && business ? business.name : (currentUserName || "Professional")}
                              </p>
                              <p
                                className="font-mono text-text-muted truncate leading-tight mt-0.5"
                                style={{ fontSize: "10px" }}
                              >
                                {isBusinessMode && business
                                  ? `@${business.slug || "business"}`
                                  : `@${currentUser?.username || user?.username || "profile"}`}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-1.5">
                            <div
                              className="inline-flex items-center font-mono font-semibold uppercase tracking-wider"
                              style={{
                                padding: "2px 7px",
                                fontSize: "8.5px",
                                borderRadius: "5px",
                                background: isBusinessMode ? "rgba(159,213,178,0.12)" : "var(--color-surface-elevated)",
                                border: isBusinessMode ? "1px solid rgba(159,213,178,0.25)" : "1px solid var(--color-border)",
                                color: isBusinessMode ? "var(--color-accent)" : "var(--color-text-muted)",
                              }}
                            >
                              {isBusinessMode ? "Business Profile" : "Personal Profile"}
                            </div>
                            {!isBusinessMode && (
                              <span
                                className="font-mono text-[8px] text-text-faint uppercase tracking-wider"
                              >
                                {normalizedRole}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Profile Switcher (Personal + Multiple Business Profiles) */}
                        {hasBusinessProfile && (
                          <div
                            className="px-1 py-1 mb-1"
                            style={{ borderBottom: "1px solid var(--color-border)" }}
                          >
                            <ProfileSwitcher user={user} />
                          </div>
                        )}

                        {/* Links */}
                        <div className="space-y-0.5 mb-1">
                          {(isBusinessMode && business
                            ? [
                                { to: getBusinessProfileUrl(business), icon: Building2, label: "Business Profile" },
                                { to: "/manage-business", icon: Layers, label: "Manage Business" },
                                { to: "/profile/edit", icon: Settings, label: "Edit Profile" },
                                { to: "/profile/account?section=sessions", icon: ShieldAlert, label: "Active Sessions" },
                              ]
                            : [
                                { to: "/profile", icon: User, label: "My Profile" },
                                { to: "/profile/account?section=verification", icon: ShieldCheck, label: "Verification Center" },
                                { to: "/profile/edit", icon: Settings, label: "Edit Profile" },
                                { to: "/profile/account?section=sessions", icon: ShieldAlert, label: "Active Sessions" },
                              ]
                          ).map(({ to, icon: Icon, label }) => (
                            <Link
                              key={to}
                              to={to}
                              onClick={() => setIsProfileOpen(false)}
                              className="flex items-center gap-2.5 rounded-xl transition-all duration-150 text-text-secondary hover:text-text-primary hover:bg-surface-elevated"
                              style={{ padding: "7px 10px" }}
                            >
                              <Icon style={{ width: "13px", height: "13px" }} aria-hidden="true" />
                              <span style={{ fontSize: "12px" }}>{label}</span>
                            </Link>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              setIsProfileOpen(false);
                              startTour({ reset: true });
                            }}
                            className="w-full flex items-center gap-2.5 rounded-xl transition-all duration-150 text-text-secondary hover:text-text-primary hover:bg-surface-elevated text-left cursor-pointer"
                            style={{ padding: "7px 10px" }}
                          >
                            <Compass style={{ width: "13px", height: "13px", color: "rgba(159,213,178,0.85)" }} aria-hidden="true" />
                            <span style={{ fontSize: "12px" }}>Product Tour</span>
                          </button>
                        </div>

                        {/* Sign out */}
                        <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "6px" }}>
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
