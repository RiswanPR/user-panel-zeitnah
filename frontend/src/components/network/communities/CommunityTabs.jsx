import { motion, useReducedMotion } from "framer-motion";
import {
  LayoutList,
  MessageSquare,
  Users,
  BookOpen,
  Bell,
} from "lucide-react";

const COMMUNITY_TABS = [
  { id: "overview", label: "Overview", icon: LayoutList },
  { id: "discussions", label: "Discussions", icon: MessageSquare },
  { id: "members", label: "Members", icon: Users },
  { id: "resources", label: "Resources", icon: BookOpen },
  { id: "announcements", label: "Announcements", icon: Bell },
];

/**
 * CommunityTabs Component
 * Tab switcher inside a community detail page.
 *
 * @param {Object} props
 * @param {string} props.activeTab
 * @param {function(string): void} props.onTabChange
 * @param {number} [props.discussionCount]
 * @param {number} [props.memberCount]
 */
export default function CommunityTabs({
  activeTab = "overview",
  onTabChange,
  discussionCount = 0,
  memberCount = 0,
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="w-full flex items-center justify-start overflow-x-auto pb-1">
      <div
        role="tablist"
        aria-label="Community Sections"
        className="inline-flex items-center gap-1.5 rounded-2xl border border-white/[0.08] bg-bg-surface/80 p-1.5 backdrop-blur-xl shadow-lg"
      >
        {COMMUNITY_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              role="tab"
              id={`comm-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`comm-tabpanel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onTabChange?.(tab.id)}
              className={`relative flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all duration-200 focus-ring select-none whitespace-nowrap ${
                isActive
                  ? "text-white font-bold"
                  : "text-text-muted hover:text-white hover:bg-white/[0.03]"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId={shouldReduceMotion ? undefined : "comm-tab-active"}
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-brand-mint/15 via-white/[0.08] to-brand-mint/10 border border-brand-mint/30 shadow-[0_0_16px_rgba(159,213,178,0.12)]"
                  transition={{ type: "spring", stiffness: 450, damping: 32 }}
                />
              )}

              <Icon
                className={`relative z-10 h-4 w-4 transition-colors duration-200 ${
                  isActive ? "text-brand-mint" : "text-text-muted"
                }`}
                aria-hidden="true"
              />

              <span className="relative z-10">{tab.label}</span>

              {tab.id === "discussions" && discussionCount > 0 && (
                <span
                  className={`relative z-10 ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] font-mono font-bold ${
                    isActive
                      ? "bg-brand-mint text-bg-base"
                      : "bg-white/[0.08] text-text-muted"
                  }`}
                >
                  {discussionCount}
                </span>
              )}

              {tab.id === "members" && memberCount > 0 && (
                <span
                  className={`relative z-10 ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] font-mono font-bold ${
                    isActive
                      ? "bg-brand-mint text-bg-base"
                      : "bg-white/[0.08] text-text-muted"
                  }`}
                >
                  {memberCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
