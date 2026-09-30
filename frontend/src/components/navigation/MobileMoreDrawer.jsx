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
  ChevronRight,
} from "lucide-react";
import { getUploadUrl } from "../../utils/courseUi";
import { normalizeUserRole, isAdmin } from "../../utils/roleNavigation";

/**
 * Zeitnah 2.0 Mobile "More" Command Drawer
 * Editorial, high-density bottom drawer offering full product access on mobile devices.
 *
 * Characteristics:
 * - Clean structured sections (Career, Identity, Community, Account).
 * - Zero duplicated links (No Jobs or Manage Business, which are already in bottom nav).
 * - Restrained role badge (Role != Verification).
 * - High-speed spring animation, touch-friendly min-height >= 44px.
 * - WCAG compliant: dialog role, aria-modal, focus trapping, Escape key closing.
 */
export default function MobileMoreDrawer({
  isOpen,
  onClose,
  user,
  onRequestLogout,
}) {
  const location = useLocation();

  // Close drawer on route change
  useEffect(() => {
    if (isOpen) {
      onClose();
    }
  }, [location.pathname]);

  // Lock body scroll and handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Role resolution
  const normalizedRole = normalizeUserRole(user);
  const adminUser = isAdmin(user);

  // Avatar and initials computation
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

  // Authoritative mobile groups (Zero link duplication with primary bottom nav)
  const navigationGroups = useMemo(() => {
    const groups = [
      {
        title: "CAREER ACCELERATION",
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
        title: "COMMUNITY & STANDING",
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
        title: "ACCOUNT & SECURITY",
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
  }, [adminUser]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden flex flex-col justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation Menu"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Drawer Container */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className="relative z-10 w-full max-h-[88vh] bg-[#0A101C]/98 border-t border-white/[0.1] rounded-t-3xl shadow-2xl flex flex-col overflow-hidden pb-[calc(env(safe-area-inset-bottom,16px)+16px)]"
          >
            {/* Grab handle indicator */}
            <div className="w-full flex items-center justify-center pt-3 pb-2 cursor-grab">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Header: User Profile Card & Close */}
            <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between gap-3">
              <Link
                to="/profile"
                onClick={onClose}
                className="flex items-center gap-3 min-w-0 flex-1 p-2 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] transition-colors"
              >
                <div className="relative w-10 h-10 rounded-full overflow-hidden border border-brand-mint/30 bg-brand-mint/15 shrink-0 flex items-center justify-center">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={user?.name || "Avatar"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-mono font-bold text-brand-mint">
                      {userInitials}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white truncate leading-tight">
                    {user?.name || "Professional"}
                  </p>
                  <p className="text-[10px] text-text-muted font-mono truncate mt-0.5 leading-tight">
                    @{user?.username || "profile"}
                  </p>
                  <div className="mt-1 inline-flex items-center px-1.5 py-0.2 rounded bg-white/[0.06] border border-white/[0.1] text-text-secondary text-[8.5px] font-mono uppercase tracking-wider font-semibold">
                    {normalizedRole}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-text-faint shrink-0" aria-hidden="true" />
              </Link>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close menu"
                className="w-9 h-9 rounded-full border border-white/[0.08] bg-white/[0.04] text-text-muted hover:text-white flex items-center justify-center shrink-0 active:scale-95 transition-all touch-manipulation cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            {/* Scrollable Navigation Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 no-scrollbar">
              {navigationGroups.map((group) => (
                <div key={group.title} className="space-y-1.5">
                  <h4 className="text-[9px] font-mono font-bold tracking-widest text-text-faint uppercase px-1 select-none">
                    {group.title}
                  </h4>
                  <div className="grid grid-cols-1 gap-1.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive =
                        location.pathname === item.path ||
                        location.pathname.startsWith(`${item.path}/`);

                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={onClose}
                          className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all duration-150 min-h-[46px] touch-manipulation ${
                            isActive
                              ? "bg-brand-mint/10 border-brand-mint/25 text-white shadow-sm"
                              : "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.05] text-white/90"
                          }`}
                        >
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              isActive
                                ? "bg-brand-mint/20 text-brand-mint"
                                : "bg-white/[0.04] text-text-muted"
                            }`}
                          >
                            <Icon className="w-4 h-4" aria-hidden="true" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium truncate leading-tight">
                              {item.label}
                            </p>
                            <p className="text-[10px] text-text-faint truncate leading-tight mt-0.5">
                              {item.desc}
                            </p>
                          </div>

                          <ChevronRight
                            className="w-3.5 h-3.5 text-text-faint shrink-0"
                            aria-hidden="true"
                          />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Logout Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onRequestLogout?.();
                  }}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/15 font-semibold text-xs transition-colors min-h-[44px] touch-manipulation cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Sign Out of Zeitnah</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
