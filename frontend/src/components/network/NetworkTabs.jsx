import { useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Compass, Sparkles, UserCheck, Users } from "lucide-react";

/**
 * Tab configuration
 */
const TABS = [
  { id: "overview", label: "Overview", icon: Sparkles },
  { id: "discover", label: "Discover", icon: Compass },
  { id: "communities", label: "Communities", icon: Users },
  { id: "connections", label: "Connections", icon: UserCheck },
];

/**
 * NetworkTabs Component
 * Segmented navigation controller for switching views within /network.
 *
 * @param {Object} props
 * @param {string} props.activeTab - Currently active tab ('overview' | 'discover' | 'connections')
 * @param {function(string): void} props.onTabChange - Callback invoked when a tab is selected
 * @param {number} [props.connectionsCount=0] - Number of current connections
 */
export default function NetworkTabs({
  activeTab = "overview",
  onTabChange,
  connectionsCount = 0,
}) {
  const shouldReduceMotion = useReducedMotion();
  const tabListRef = useRef(null);

  const handleKeyDown = (e, currentIndex) => {
    let nextIndex = null;
    if (e.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % TABS.length;
    } else if (e.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + TABS.length) % TABS.length;
    } else if (e.key === "Home") {
      nextIndex = 0;
    } else if (e.key === "End") {
      nextIndex = TABS.length - 1;
    }

    if (nextIndex !== null) {
      e.preventDefault();
      const nextTab = TABS[nextIndex];
      onTabChange?.(nextTab.id);
      const buttons = tabListRef.current?.querySelectorAll("button[role='tab']");
      buttons?.[nextIndex]?.focus();
    }
  };

  return (
    <div className="w-full flex items-center justify-start overflow-x-auto no-scrollbar py-0.5">
      <div
        ref={tabListRef}
        role="tablist"
        aria-label="Network Sections"
        className="inline-flex items-center gap-1.5 rounded-2xl border border-white/[0.08] bg-bg-surface/80 p-1.5 backdrop-blur-xl shadow-lg shrink-0"
      >
        {TABS.map((tab, index) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              role="tab"
              id={`network-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`network-tabpanel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onTabChange?.(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={`relative flex items-center gap-2 rounded-xl px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold transition-all duration-200 focus-ring select-none shrink-0 whitespace-nowrap ${
                isActive
                  ? "text-white font-bold"
                  : "text-text-muted hover:text-white hover:bg-white/[0.03]"
              }`}
            >
              {/* Active Tab Background Indicator */}
              {isActive && (
                <motion.div
                  layoutId={shouldReduceMotion ? undefined : "network-tab-active"}
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-brand-mint/15 via-white/[0.08] to-brand-mint/10 border border-brand-mint/30 shadow-[0_0_16px_rgba(159,213,178,0.12)]"
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

              {/* Connections Count Badge */}
              {tab.id === "connections" && connectionsCount > 0 && (
                <span
                  className={`relative z-10 ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-mono font-bold ${
                    isActive
                      ? "bg-brand-mint text-bg-base"
                      : "bg-white/[0.08] text-text-muted"
                  }`}
                >
                  {connectionsCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
