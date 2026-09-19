import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  User,
  Edit3,
  Globe,
  BarChart3,
  Star,
  Shield,
  FileText,
} from "lucide-react";

export const PROFILE_TABS = [
  {
    path: "/profile",
    label: "Overview",
    icon: User,
    description: "Identity & stats",
  },
  {
    path: "/profile/edit",
    label: "Personal Info",
    icon: Edit3,
    description: "Account details",
  },
  {
    path: "/public-profile",
    label: "Public Profile",
    icon: Globe,
    description: "Public identity showcase",
  },
  {
    path: "/my-learning",
    label: "My Learning",
    icon: BarChart3,
    description: "Course progression",
  },
  {
    path: "/my-points",
    label: "My Points",
    icon: Star,
    description: "XP & level roadmap",
  },
  {
    path: "/active-sessions",
    label: "Active Sessions",
    icon: Shield,
    description: "Connected devices",
  },
  {
    path: "/audit-logs",
    label: "Audit Logs",
    icon: FileText,
    description: "Security activity",
  },
];

/**
 * Unified Core Profile Navigation Component.
 * Exactly 7 Core Profile destinations. Strictly NO Community references.
 */
export default function ProfileNav({ className = "" }) {
  const location = useLocation();

  const isTabActive = (tabPath) => {
    if (tabPath === "/profile") {
      return location.pathname === "/profile";
    }
    if (tabPath === "/public-profile") {
      return (
        location.pathname === "/public-profile" ||
        location.pathname.startsWith("/u/")
      );
    }
    return location.pathname.startsWith(tabPath);
  };

  return (
    <nav
      aria-label="Profile Sections"
      className={`relative w-full rounded-2xl border border-border-default bg-bg-card/70 backdrop-blur-xl p-1.5 sm:p-2 overflow-hidden shadow-sm ${className}`}
    >
      <div className="gradient-line-top" />

      {/* Horizontally scrollable container on mobile, flex on desktop */}
      <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar py-0.5 px-0.5 scroll-smooth touch-pan-x overscroll-x-contain">
        {PROFILE_TABS.map((tab) => {
          const active = isTabActive(tab.path);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`relative flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-[13px] font-semibold tracking-wide whitespace-nowrap shrink-0 transition-all duration-200 cursor-pointer min-h-[40px] ${
                active
                  ? "text-white font-bold"
                  : "text-text-muted hover:text-text-secondary hover:bg-white/[0.03]"
              }`}
            >
              {/* Active pill background */}
              {active && (
                <motion.div
                  layoutId="profile-nav-active"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-brand-mint/15 to-brand-navy/30 border border-brand-mint/25 shadow-sm"
                  transition={{ type: "spring", stiffness: 450, damping: 32 }}
                />
              )}

              <Icon
                className={`relative z-10 w-4 h-4 shrink-0 transition-colors ${
                  active ? "text-brand-mint" : "text-text-faint"
                }`}
              />
              <span className="relative z-10">{tab.label}</span>

              {active && (
                <span className="relative z-10 w-1.5 h-1.5 rounded-full bg-brand-yellow shrink-0 ml-0.5" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
