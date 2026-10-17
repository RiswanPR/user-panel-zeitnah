import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, FileText, Laptop, Palette } from "lucide-react";

export const ACCOUNT_SECTIONS = [
  {
    id: "verification",
    label: "Verification",
    icon: ShieldCheck,
    description: "Credentials, council licensure & trust badges",
    path: "/profile/account?section=verification",
  },
  {
    id: "security",
    label: "Security",
    icon: FileText,
    description: "Audit trail, authentication logs & security events",
    path: "/profile/account?section=security",
  },
  {
    id: "sessions",
    label: "Active Sessions",
    icon: Laptop,
    description: "Authorized devices & sign-in management",
    path: "/profile/account?section=sessions",
  },
  {
    id: "appearance",
    label: "Appearance",
    icon: Palette,
    description: "Theme preferences & visual display mode",
    path: "/profile/account?section=appearance",
  },
];

/**
 * Account Internal Sub-Navigation.
 * Provides a clean, responsive segmented navigation for Account sections:
 * Verification, Security, and Active Sessions.
 */
export default function AccountNav({
  activeSection = "verification",
  onSelectSection,
  className = "",
}) {
  return (
    <nav
      aria-label="Account sections navigation"
      className={`relative w-full rounded-2xl border border-border bg-surface/85 backdrop-blur-xl p-1.5 overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.18)] transition-all ${className}`}
    >
      {/* Subtle top ambient mint gradient line */}
      <div
        className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-brand-mint/25 to-transparent pointer-events-none"
        aria-hidden="true"
      />

      {/* Segmented control buttons / links */}
      <div
        role="tablist"
        aria-orientation="horizontal"
        className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 px-0.5 scroll-smooth touch-pan-x overscroll-x-contain"
      >
        {ACCOUNT_SECTIONS.map((sec) => {
          const isActive = activeSection === sec.id;
          const Icon = sec.icon;

          const content = (
            <>
              {/* Active animated pill background */}
              {isActive && (
                <motion.div
                  layoutId="account-nav-active-pill"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-brand-mint/15 via-white/[0.04] to-brand-mint/10 border border-brand-mint/30 shadow-[0_0_16px_rgba(159,213,178,0.12)]"
                  transition={{ type: "spring", stiffness: 450, damping: 32 }}
                />
              )}

              <Icon
                className={`relative z-10 w-4 h-4 shrink-0 transition-colors ${
                  isActive ? "text-brand-mint" : "text-text-faint"
                }`}
                aria-hidden="true"
              />
              <span className="relative z-10">{sec.label}</span>

              {isActive && (
                <span
                  className="relative z-10 w-1.5 h-1.5 rounded-full bg-brand-yellow shrink-0 ml-0.5 shadow-[0_0_6px_rgba(246,237,74,0.6)]"
                  aria-hidden="true"
                />
              )}
            </>
          );

          const sharedClasses = `relative flex-1 min-w-[120px] sm:min-w-0 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-[13px] font-semibold tracking-wide whitespace-nowrap transition-all duration-200 cursor-pointer min-h-[42px] focus-ring select-none ${
            isActive
              ? "text-text-primary font-bold"
              : "text-text-muted hover:text-text-secondary hover:bg-surface-elevated/50"
          }`;

          if (onSelectSection) {
            return (
              <button
                key={sec.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                title={sec.description}
                onClick={() => onSelectSection(sec.id)}
                className={sharedClasses}
              >
                {content}
              </button>
            );
          }

          return (
            <Link
              key={sec.id}
              to={sec.path}
              role="tab"
              aria-selected={isActive}
              title={sec.description}
              className={sharedClasses}
            >
              {content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
