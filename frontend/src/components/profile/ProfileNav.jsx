import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  User,
  Edit3,
  Globe,
  BookOpen,
  Award,
  Shield,
} from "lucide-react";

export const PROFILE_TABS = [
  {
    id: "overview",
    path: "/profile",
    label: "Overview",
    icon: User,
    description: "Identity & career story",
  },
  {
    id: "edit",
    path: "/profile/edit",
    label: "Edit Profile",
    icon: Edit3,
    description: "Profile Studio editor",
  },
  {
    id: "public",
    path: "/public-profile",
    label: "Public Profile",
    icon: Globe,
    description: "Public identity showcase",
  },
  {
    id: "learning",
    path: "/my-learning",
    label: "Learning",
    icon: BookOpen,
    description: "Course progression & enrolled tracks",
  },
  {
    id: "achievements",
    path: "/my-points",
    label: "Achievements",
    icon: Award,
    description: "XP, badges & level roadmap",
  },
  {
    id: "account",
    path: "/profile/account",
    label: "Account",
    icon: Shield,
    description: "Verification, security & active sessions",
  },
];

/**
 * World-Class Core Profile Navigation Component.
 * Segmented glass aesthetic with smooth spring animations, accessible roles,
 * and seamless horizontal scrolling on mobile viewports.
 * Features 6 simplified top-level destinations: Overview, Edit Profile, Public Profile,
 * Learning, Achievements, and unified Account.
 */
export default function ProfileNav({ className = "" }) {
  const location = useLocation();

  const isTabActive = (tab) => {
    const tabPath = typeof tab === "string" ? tab : tab.path;
    const path = location.pathname;

    if (tabPath === "/profile") {
      return path === "/profile";
    }
    if (tabPath === "/profile/edit") {
      return path === "/profile/edit";
    }
    if (tabPath === "/public-profile") {
      return (
        path === "/public-profile" ||
        path.startsWith("/u/") ||
        path.startsWith("/profile/u/")
      );
    }
    if (tabPath === "/my-learning") {
      return path.startsWith("/my-learning");
    }
    if (tabPath === "/my-points") {
      return (
        path.startsWith("/my-points") ||
        path.startsWith("/profile/achievements") ||
        path.startsWith("/profile/milestones")
      );
    }
    if (tabPath === "/profile/account") {
      return (
        path.startsWith("/profile/account") ||
        path.startsWith("/profile/verification") ||
        path.startsWith("/audit-logs") ||
        path.startsWith("/active-sessions") ||
        path.startsWith("/profile/security") ||
        path.startsWith("/profile/sessions")
      );
    }
    return path.startsWith(tabPath);
  };

  return (
    <nav
      aria-label="Profile navigation"
      className={`relative w-full rounded-2xl border border-border bg-surface/85 backdrop-blur-2xl p-1.5 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.18)] transition-all ${className}`}
    >
      {/* Subtle top ambient mint gradient line */}
      <div
        className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-brand-mint/30 to-transparent pointer-events-none"
        aria-hidden="true"
      />

      {/* Horizontally scrollable container on mobile, flex on desktop */}
      <div
        role="tablist"
        aria-orientation="horizontal"
        className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 px-0.5 scroll-smooth touch-pan-x overscroll-x-contain"
      >
        {PROFILE_TABS.map((tab) => {
          const active = isTabActive(tab);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.path}
              to={tab.path}
              role="tab"
              aria-selected={active}
              title={tab.description}
              className={`relative flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-[13px] font-semibold tracking-wide whitespace-nowrap shrink-0 transition-all duration-200 cursor-pointer min-h-[40px] focus-ring select-none ${
                active
                  ? "text-text-primary font-bold"
                  : "text-text-muted hover:text-text-secondary hover:bg-surface-elevated/50"
              }`}
            >
              {/* Active pill background */}
              {active && (
                <motion.div
                  layoutId="profile-nav-active-pill"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-brand-mint/15 via-brand-navy/40 to-brand-mint/10 border border-brand-mint/30 shadow-[0_0_16px_rgba(159,213,178,0.15)]"
                  transition={{ type: "spring", stiffness: 450, damping: 32 }}
                />
              )}

              <Icon
                className={`relative z-10 w-4 h-4 shrink-0 transition-colors ${
                  active ? "text-brand-mint" : "text-text-faint"
                }`}
                aria-hidden="true"
              />
              <span className="relative z-10">{tab.label}</span>

              {active && (
                <span
                  className="relative z-10 w-1.5 h-1.5 rounded-full bg-brand-yellow shrink-0 ml-0.5 shadow-[0_0_6px_rgba(246,237,74,0.6)]"
                  aria-hidden="true"
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
