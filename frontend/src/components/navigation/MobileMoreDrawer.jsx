import { useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  TrendingUp,
  Layers,
  ShieldCheck,
  Trophy,
  Award,
  User,
  Settings,
  ShieldAlert,
  Shield,
  LogOut,
  MessageSquare,
  ChevronRight,
  Compass,
} from "lucide-react";
import { getUploadUrl } from "../../utils/courseUi";
import { normalizeUserRole, isAdmin } from "../../utils/roleNavigation";
import { useOnboarding } from "../../context/OnboardingContext";

/**
 * Zeitnah 3.0 Mobile "More" Command Sheet
 * Premium bottom drawer — community-first navigation hierarchy.
 *
 * Navigation contract:
 * - Primary bottom nav: Courses | Community | Network | Jobs/Business | More
 * - Messages is in the top utility bar, but also surfaced here for discoverability
 * - Zero duplicated links with primary bottom nav (no Courses, Community, Network, Jobs/Business)
 * - Role-aware Admin governance section
 * - WCAG compliant: dialog, aria-modal, Escape, focus-safe
 */
export default function MobileMoreDrawer({
  isOpen,
  onClose,
  user,
  onRequestLogout,
  unreadMessagesCount = 0,
}) {
  const location = useLocation();
  const { startTour } = useOnboarding();

  // Close on route change
  useEffect(() => {
    if (isOpen) onClose();
  }, [location.pathname]);

  // Scroll lock + Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const normalizedRole = normalizeUserRole(user);
  const adminUser = isAdmin(user);

  const avatarUrl = user?.avatar ? getUploadUrl(user.avatar) : null;
  const userInitials = useMemo(() => {
    const name = user?.name?.trim();
    if (!name) return "Z";
    return (
      name.split(/\s+/).map((p) => p[0]).filter(Boolean).join("").slice(0, 2).toUpperCase() || "Z"
    );
  }, [user?.name]);

  const messagesActive = location.pathname.startsWith("/messages");

  // Navigation groups — zero duplication with bottom primary nav
  const navigationGroups = useMemo(() => {
    const groups = [
      {
        title: "MESSAGING",
        items: [
          {
            label: "Direct Messages",
            path: "/messages",
            icon: MessageSquare,
            desc: "Chat with peers, mentors & collaborators",
            badge: unreadMessagesCount,
          },
        ],
      },
      {
        title: "CAREER",
        items: [
          {
            label: "Career Intelligence",
            path: "/career-intelligence",
            icon: TrendingUp,
            desc: "Role roadmaps & skill pathway mapping",
          },
        ],
      },
      {
        title: "PROFESSIONAL IDENTITY",
        items: [
          {
            label: "Engineering Portfolio",
            path: "/profile/portfolio",
            icon: Layers,
            desc: "BIM models & verified project showcases",
          },
          {
            label: "Verification Center",
            path: "/profile/verification",
            icon: ShieldCheck,
            desc: "Credentials, certificates & trust badges",
          },
        ],
      },
      {
        title: "STANDING",
        items: [
          {
            label: "Global Leaderboard",
            path: "/leaderboard",
            icon: Trophy,
            desc: "Platform rank & competitive standings",
          },
          {
            label: "My Points",
            path: "/my-points",
            icon: Award,
            desc: "Badges, streaks & technical achievements",
          },
        ],
      },
      {
        title: "ACCOUNT",
        items: [
          {
            label: "My Profile",
            path: "/profile",
            icon: User,
            desc: "Public profile & biographical overview",
          },
          {
            label: "Account Settings",
            path: "/profile/edit",
            icon: Settings,
            desc: "Privacy, security & preferences",
          },
          {
            label: "Active Sessions",
            path: "/active-sessions",
            icon: ShieldAlert,
            desc: "Device management & security audit",
          },
          {
            label: "Product Tour",
            icon: Compass,
            desc: "Interactive walkthrough of Zeitnah",
            isAction: true,
            onClick: () => {
              startTour({ reset: true });
            },
          },
        ],
      },
    ];

    if (adminUser) {
      groups.push({
        title: "ADMINISTRATION",
        items: [
          {
            label: "Admin Governance",
            path: "/admin/businesses",
            icon: Shield,
            desc: "Organization review & platform audits",
          },
        ],
      });
    }

    return groups;
  }, [adminUser, unreadMessagesCount, startTour]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden flex flex-col justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
            className="fixed inset-0"
            style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(4px)" }}
            aria-hidden="true"
          />

          {/* Drawer */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 38, mass: 0.85 }}
            className="relative z-10 w-full flex flex-col overflow-hidden"
            style={{
              maxHeight: "88vh",
              background: "rgba(8,13,25,0.99)",
              borderTop: "1px solid rgba(255,255,255,0.09)",
              borderRadius: "20px 20px 0 0",
              boxShadow: "0 -24px 80px rgba(0,0,0,0.6), 0 -4px 16px rgba(0,0,0,0.4)",
              paddingBottom: "calc(env(safe-area-inset-bottom, 16px) + 16px)",
            }}
          >
            {/* Grab handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div
                className="rounded-full"
                style={{ width: "36px", height: "4px", background: "rgba(255,255,255,0.15)" }}
              />
            </div>

            {/* Header: Identity card + Close */}
            <div
              className="px-4 py-3 flex items-center gap-3"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
            >
              {user ? (
                <Link
                  to="/profile"
                  onClick={onClose}
                  className="flex items-center gap-3 flex-1 min-w-0 rounded-2xl transition-all duration-150 touch-manipulation"
                  style={{
                    padding: "10px 12px",
                    background: "rgba(255,255,255,0.025)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                  onTouchStart={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.045)"; }}
                  onTouchEnd={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.025)"; }}
                >
                  {/* Avatar */}
                  <div
                    className="shrink-0 flex items-center justify-center overflow-hidden"
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, rgba(159,213,178,0.2), rgba(18,49,76,0.6))",
                      border: "1.5px solid rgba(159,213,178,0.25)",
                    }}
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={user?.name || "Avatar"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span
                        className="font-mono font-bold text-brand-mint"
                        style={{ fontSize: "12px" }}
                      >
                        {userInitials}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      className="font-semibold text-white truncate leading-tight"
                      style={{ fontSize: "13px" }}
                    >
                      {user?.name || "Professional"}
                    </p>
                    <p
                      className="font-mono text-white/40 truncate leading-tight mt-0.5"
                      style={{ fontSize: "10.5px" }}
                    >
                      @{user?.username || "profile"}
                    </p>
                    <div
                      className="mt-1.5 inline-flex items-center font-mono font-semibold uppercase tracking-wider"
                      style={{
                        padding: "2px 7px",
                        fontSize: "8px",
                        borderRadius: "5px",
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: "rgba(255,255,255,0.35)",
                      }}
                    >
                      {normalizedRole}
                    </div>
                  </div>

                  <ChevronRight
                    style={{ width: "15px", height: "15px", color: "rgba(255,255,255,0.2)", flexShrink: 0 }}
                    aria-hidden="true"
                  />
                </Link>
              ) : (
                <Link
                  to="/login"
                  onClick={onClose}
                  className="flex items-center justify-between gap-3 flex-1 min-w-0 rounded-2xl transition-all duration-150"
                  style={{
                    padding: "12px 14px",
                    background: "rgba(255,255,255,0.025)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <div>
                    <p className="font-semibold text-white leading-tight" style={{ fontSize: "13px" }}>
                      Sign in to Zeitnah
                    </p>
                    <p className="text-white/40 mt-0.5" style={{ fontSize: "11px" }}>
                      Courses, community & opportunities
                    </p>
                  </div>
                  <span className="zn-btn-primary text-xs py-1.5 px-3 shrink-0 font-semibold">
                    Sign In
                  </span>
                </Link>
              )}

              <button
                type="button"
                onClick={onClose}
                aria-label="Close menu"
                className="flex items-center justify-center rounded-full transition-all duration-150 active:scale-95 touch-manipulation shrink-0 cursor-pointer"
                style={{
                  width: "36px",
                  height: "36px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.45)",
                }}
              >
                <X style={{ width: "15px", height: "15px" }} aria-hidden="true" />
              </button>
            </div>

            {/* Scrollable navigation body */}
            <div
              className="flex-1 overflow-y-auto no-scrollbar"
              style={{ padding: "12px 16px 8px" }}
            >
              <div className="space-y-4">
                {navigationGroups.map((group, gIdx) => (
                  <div key={group.title}>
                    {gIdx > 0 && (
                      <div
                        className="mb-4"
                        style={{ height: "1px", background: "rgba(255,255,255,0.05)" }}
                      />
                    )}
                    <p
                      className="font-mono font-bold uppercase tracking-widest select-none mb-2"
                      style={{
                        fontSize: "9px",
                        color: "rgba(255,255,255,0.22)",
                        paddingLeft: "2px",
                      }}
                    >
                      {group.title}
                    </p>
                    <div className="space-y-1">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const isActive =
                          item.path &&
                          (location.pathname === item.path ||
                            location.pathname.startsWith(`${item.path}/`));

                        if (item.isAction) {
                          return (
                            <button
                              key={item.label}
                              type="button"
                              onClick={() => {
                                onClose();
                                item.onClick?.();
                              }}
                              className="w-full flex items-center gap-3 rounded-xl transition-all duration-150 touch-manipulation text-left cursor-pointer"
                              style={{
                                padding: "10px 12px",
                                minHeight: "48px",
                                background: "rgba(255,255,255,0.025)",
                                border: "1px solid rgba(255,255,255,0.05)",
                              }}
                            >
                              <div
                                className="flex items-center justify-center shrink-0 rounded-lg"
                                style={{
                                  width: "32px",
                                  height: "32px",
                                  background: "rgba(159,213,178,0.12)",
                                  color: "rgba(159,213,178,0.9)",
                                }}
                              >
                                <Icon style={{ width: "14px", height: "14px" }} aria-hidden="true" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p
                                  className="font-medium truncate leading-tight"
                                  style={{
                                    fontSize: "13px",
                                    color: "rgba(255,255,255,0.8)",
                                  }}
                                >
                                  {item.label}
                                </p>
                                <p
                                  className="truncate leading-tight mt-0.5"
                                  style={{ fontSize: "10.5px", color: "rgba(255,255,255,0.3)" }}
                                >
                                  {item.desc}
                                </p>
                              </div>
                              <ChevronRight
                                style={{ width: "13px", height: "13px", color: "rgba(255,255,255,0.2)" }}
                                aria-hidden="true"
                              />
                            </button>
                          );
                        }

                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            onClick={onClose}
                            className="flex items-center gap-3 rounded-xl transition-all duration-150 touch-manipulation"
                            style={{
                              padding: "10px 12px",
                              minHeight: "48px",
                              background: isActive ? "rgba(159,213,178,0.08)" : "rgba(255,255,255,0.025)",
                              border: `1px solid ${isActive ? "rgba(159,213,178,0.2)" : "rgba(255,255,255,0.05)"}`,
                            }}
                            aria-current={isActive ? "page" : undefined}
                          >
                            {/* Icon slot */}
                            <div
                              className="flex items-center justify-center shrink-0 rounded-lg"
                              style={{
                                width: "32px",
                                height: "32px",
                                background: isActive ? "rgba(159,213,178,0.15)" : "rgba(255,255,255,0.04)",
                                color: isActive ? "rgba(159,213,178,0.9)" : "rgba(255,255,255,0.35)",
                              }}
                            >
                              <Icon style={{ width: "14px", height: "14px" }} aria-hidden="true" />
                            </div>

                            {/* Text */}
                            <div className="flex-1 min-w-0">
                              <p
                                className="font-medium truncate leading-tight"
                                style={{
                                  fontSize: "13px",
                                  color: isActive ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.75)",
                                }}
                              >
                                {item.label}
                              </p>
                              <p
                                className="truncate leading-tight mt-0.5"
                                style={{ fontSize: "10.5px", color: "rgba(255,255,255,0.3)" }}
                              >
                                {item.desc}
                              </p>
                            </div>

                            {/* Badge */}
                            {item.badge > 0 && (
                              <span
                                className="shrink-0 flex items-center justify-center font-mono font-bold text-black bg-brand-mint rounded-full"
                                style={{ minWidth: "18px", height: "18px", padding: "0 5px", fontSize: "9px" }}
                                aria-label={`${item.badge} unread`}
                              >
                                {item.badge > 99 ? "99+" : item.badge}
                              </span>
                            )}

                            {!item.badge && (
                              <ChevronRight
                                style={{ width: "13px", height: "13px", color: "rgba(255,255,255,0.18)", flexShrink: 0 }}
                                aria-hidden="true"
                              />
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Sign Out */}
                {user && (
                  <div style={{ paddingTop: "4px" }}>
                    <div
                      className="mb-4"
                      style={{ height: "1px", background: "rgba(255,255,255,0.05)" }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onRequestLogout?.();
                      }}
                      className="w-full flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-150 touch-manipulation cursor-pointer"
                      style={{
                        minHeight: "46px",
                        padding: "10px 16px",
                        fontSize: "12.5px",
                        color: "rgba(248,113,113,0.8)",
                        background: "rgba(239,68,68,0.06)",
                        border: "1px solid rgba(239,68,68,0.14)",
                      }}
                    >
                      <LogOut style={{ width: "14px", height: "14px" }} aria-hidden="true" />
                      Sign Out of Zeitnah
                    </button>
                  </div>
                )}

                {/* Brand anchor */}
                <div className="text-center pt-2 pb-1 select-none">
                  <p
                    className="font-mono uppercase tracking-[0.2em]"
                    style={{ fontSize: "9px", color: "rgba(255,255,255,0.15)" }}
                  >
                    Zeitnah · See the unseen
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
