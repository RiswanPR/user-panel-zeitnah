import { motion, useReducedMotion } from "framer-motion";
import { Sparkles, BookOpen, Award, Activity } from "lucide-react";

const TABS = [
  { id: "overview", label: "Overview", icon: Sparkles },
  { id: "learning", label: "Learning & Courses", icon: BookOpen },
  { id: "achievements", label: "Achievements", icon: Award },
  { id: "activity", label: "Activity", icon: Activity },
];

/**
 * ProfileTabs Component
 * Secondary navigation for the student profile view.
 *
 * @param {Object} props
 * @param {string} props.activeTab
 * @param {function(string): void} props.onTabChange
 */
export default function ProfileTabs({ activeTab = "overview", onTabChange }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="w-full flex items-center justify-start overflow-x-auto no-scrollbar py-1">
      <div
        role="tablist"
        aria-label="Profile Sections"
        className="inline-flex items-center gap-1.5 rounded-2xl border border-border bg-surface-card p-1.5 backdrop-blur-xl shadow-lg"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              role="tab"
              id={`profile-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`profile-tabpanel-${tab.id}`}
              onClick={() => onTabChange?.(tab.id)}
              className={`relative flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition-all duration-200 focus-ring select-none whitespace-nowrap cursor-pointer ${
                isActive
                  ? "text-text-primary font-bold"
                  : "text-text-muted hover:text-text-primary hover:bg-surface-elevated/40"
              }`}
            >
              {/* Active Tab Background Indicator */}
              {isActive && (
                <motion.div
                  layoutId={shouldReduceMotion ? undefined : "profile-tab-active"}
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-brand-mint/15 via-surface-elevated to-brand-mint/10 border border-brand-mint/30 shadow-[0_0_16px_rgba(159,213,178,0.12)]"
                  transition={{ type: "spring", stiffness: 450, damping: 32 }}
                />
              )}

              {/* Tab Icon */}
              <Icon
                className={`relative z-10 h-4 w-4 transition-colors duration-200 ${
                  isActive ? "text-brand-mint" : "text-text-muted"
                }`}
                aria-hidden="true"
              />

              {/* Tab Label */}
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
