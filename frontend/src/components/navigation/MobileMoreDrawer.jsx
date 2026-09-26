import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  BookOpen,
  GraduationCap,
  Trophy,
  Award,
  Inbox,
  TrendingUp,
  Layers,
  ShieldCheck,
  Building2,
  ShieldAlert,
  LogOut,
  ChevronRight,
  User,
  Bell,
} from "lucide-react";
import { getUploadUrl } from "../../utils/courseUi";

/**
 * Zeitnah 2.0 Mobile "More" Drawer
 * Editorial, high-density bottom drawer offering full product access on mobile devices.
 */
export default function MobileMoreDrawer({
  isOpen,
  onClose,
  user,
  onRequestLogout,
  unreadOpportunitiesCount = 0,
  unreadNotificationsCount = 0,
}) {
  const location = useLocation();

  // Close drawer on route change
  useEffect(() => {
    if (isOpen) {
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const normalizedRole = (user?.primaryRole || "STUDENT").toUpperCase();
  const isBusinessRole =
    normalizedRole === "RECRUITER" || normalizedRole === "FOUNDER" || normalizedRole === "ADMIN";

  const avatarUrl = user?.avatar ? getUploadUrl(user.avatar) : null;
  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "Z";

  const navigationGroups = [
    {
      title: "LEARNING ECOSYSTEM",
      items: [
        { label: "Course Catalog", path: "/courses", icon: BookOpen, desc: "Explore technical curriculum" },
        { label: "My Learning", path: "/my-learning", icon: GraduationCap, desc: "Enrolled courses & progress" },
        { label: "Leaderboard & XP", path: "/leaderboard", icon: Trophy, desc: "Global ranking & standings" },
        { label: "My Points", path: "/my-points", icon: Award, desc: "Badges & rewards" },
      ],
    },
    {
      title: "CAREER & REPUTATION",
      items: [
        {
          label: "Opportunities",
          path: "/opportunities/inbox",
          icon: Inbox,
          desc: "Employer inquiries & roles",
          badge: unreadOpportunitiesCount,
        },
        {
          label: "Career Intelligence",
          path: "/career-intelligence",
          icon: TrendingUp,
          desc: "Pathway alignment & skills",
        },
        {
          label: "Engineering Portfolio",
          path: "/profile/portfolio",
          icon: Layers,
          desc: "Projects & case studies",
        },
        {
          label: "Verification Center",
          path: "/profile/verification",
          icon: ShieldCheck,
          desc: "Credentials & trust badges",
        },
      ],
    },
    {
      title: "SECURITY & WORKSPACE",
      items: [
        ...(isBusinessRole
          ? [
              {
                label: "Manage Business",
                path: "/manage-business",
                icon: Building2,
                desc: "Hiring & team dashboard",
              },
            ]
          : []),
        {
          label: "Notifications",
          path: "/notifications",
          icon: Bell,
          desc: "Updates, alerts & activities",
          badge: unreadNotificationsCount,
        },
        {
          label: "Active Sessions",
          path: "/active-sessions",
          icon: ShieldAlert,
          desc: "Devices & security audit",
        },
      ],
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-md"
            aria-hidden="true"
          />

          {/* Drawer Container */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 350, damping: 32 }}
            className="relative z-10 w-full max-h-[88vh] bg-gradient-to-b from-[#0D1625] via-[#09101C] to-[#070B14] border-t border-white/[0.12] rounded-t-3xl shadow-2xl flex flex-col overflow-hidden pb-[calc(env(safe-area-inset-bottom,16px)+16px)]"
          >
            {/* Grab handle indicator */}
            <div className="w-full flex items-center justify-center pt-3 pb-2 cursor-grab">
              <div className="w-12 h-1.5 rounded-full bg-white/20" />
            </div>

            {/* Header: User Profile Card & Close */}
            <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between gap-3">
              <Link
                to="/profile"
                onClick={onClose}
                className="flex items-center gap-3 min-w-0 flex-1 p-2 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] transition-colors"
              >
                <div className="relative w-11 h-11 rounded-full overflow-hidden border border-brand-mint/30 bg-brand-mint/15 shrink-0 flex items-center justify-center">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={user?.name || "Avatar"} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-heading font-bold text-brand-mint">{userInitials}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold text-white truncate">{user?.name || "Professional User"}</p>
                  </div>
                  <p className="text-xs text-text-muted font-mono truncate">@{user?.username || "profile"}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-text-faint shrink-0" />
              </Link>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close menu"
                className="w-10 h-10 rounded-full border border-white/[0.08] bg-white/[0.04] text-text-muted hover:text-white flex items-center justify-center shrink-0 active:scale-95 transition-all touch-manipulation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Navigation Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6 no-scrollbar">
              {navigationGroups.map((group) => (
                <div key={group.title} className="space-y-2">
                  <h4 className="text-[10px] font-mono font-bold tracking-widest text-text-faint uppercase px-1">
                    {group.title}
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname.startsWith(item.path);

                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={onClose}
                          className={`flex items-center gap-3.5 p-3 rounded-xl border transition-all duration-200 min-h-[48px] touch-manipulation ${
                            isActive
                              ? "bg-brand-mint/10 border-brand-mint/25 text-white shadow-sm"
                              : "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.05] text-white/90"
                          }`}
                        >
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                              isActive
                                ? "bg-brand-mint/20 text-brand-mint"
                                : "bg-white/[0.04] text-text-muted"
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-bold truncate">{item.label}</p>
                              {item.badge > 0 && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-brand-mint text-black">
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-text-faint truncate">{item.desc}</p>
                          </div>

                          <ChevronRight className="w-3.5 h-3.5 text-text-faint shrink-0" />
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
                  className="w-full flex items-center justify-center gap-2 p-3.5 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/15 font-semibold text-xs transition-colors min-h-[44px] touch-manipulation cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
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
