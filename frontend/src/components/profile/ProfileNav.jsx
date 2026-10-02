import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  User,
  Edit3,
  Globe,
  Layers,
  ShieldCheck,
  BookOpen,
  Award,
  Shield,
  FileText,
} from "lucide-react";

export const PROFILE_TABS = [
  {
    path: "/profile",
    label: "Overview",
    icon: User,
    description: "Identity & career story",
    primary: true,
  },
  {
    path: "/profile/portfolio",
    label: "Portfolio",
    icon: Layers,
    description: "Curated work & artifacts",
    primary: true,
  },
  {
    path: "/profile/verification",
    label: "Verification",
    icon: ShieldCheck,
    description: "Credentials & trust badges",
    primary: true,
  },
  {
    path: "/profile/edit",
    label: "Profile Studio",
    icon: Edit3,
    description: "Edit all profile sections",
    primary: true,
  },
  {
    path: "/public-profile",
    label: "Public View",
    icon: Globe,
    description: "Public identity showcase",
    primary: true,
  },
  {
    path: "/my-learning",
    label: "Learning",
    icon: BookOpen,
    description: "Course progression",
    primary: false,
  },
  {
    path: "/my-points",
    label: "Milestones",
    icon: Award,
    description: "XP & level roadmap",
    primary: false,
  },
  {
    path: "/active-sessions",
    label: "Sessions",
    icon: Shield,
    description: "Connected devices",
    primary: false,
  },
  {
    path: "/audit-logs",
    label: "Security",
    icon: FileText,
    description: "Audit trail",
    primary: false,
  },
];

/**
 * World-Class Core Profile Navigation Component.
 * Segmented glass aesthetic with smooth spring animations, accessible roles,
 * and seamless horizontal scrolling on mobile viewports.
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
      aria-label="Profile navigation"
      className={`relative w-full rounded-2xl border border-white/[0.08] bg-[#070B14]/80 backdrop-blur-2xl p-1.5 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.36)] transition-all ${className}`}
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
          const active = isTabActive(tab.path);
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
                  ? "text-white font-bold"
                  : "text-text-muted hover:text-text-secondary hover:bg-white/[0.04]"
              } ${!tab.primary ? "opacity-80 hover:opacity-100 hidden md:inline-flex" : ""}`}
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
