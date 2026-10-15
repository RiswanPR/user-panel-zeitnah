import { motion } from 'framer-motion';
import { Sparkles, Flame, Users, GraduationCap } from 'lucide-react';

/**
 * FeedFilterTabs — Premium segmented filter navigation for Zeitnah Community.
 * Accessible, responsive with touch scroll, and supports Latest, Trending, Following, and Cohort feeds.
 */
export default function FeedFilterTabs({
  activeFilter = 'all',
  onChangeFilter,
  hasCohort = false,
  isBusinessMode = false,
  className = '',
}) {
  const tabs = isBusinessMode
    ? [
        { id: 'all', label: 'Latest', icon: Sparkles },
        { id: 'trending', label: 'Trending', icon: Flame },
      ]
    : [
        { id: 'all', label: 'Latest', icon: Sparkles },
        { id: 'trending', label: 'Trending', icon: Flame },
        { id: 'following', label: 'Following', icon: Users },
        ...(hasCohort ? [{ id: 'cohort', label: 'Cohort', icon: GraduationCap }] : []),
      ];

  return (
    <nav
      role="tablist"
      aria-label="Community feed filters"
      className={`flex items-center gap-1.5 p-1 bg-[#0B111E]/90 border border-white/[0.08] rounded-xl backdrop-blur-xl overflow-x-auto scrollbar-none shadow-sm ${className}`}
    >
      {tabs.map((tab, index) => {
        const isActive = activeFilter === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            role="tab"
            id={`feed-tab-${tab.id}`}
            data-testid={`feed-tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`feed-panel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChangeFilter(tab.id)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') {
                e.preventDefault();
                const nextTab = tabs[(index + 1) % tabs.length];
                onChangeFilter(nextTab.id);
                document.getElementById(`feed-tab-${nextTab.id}`)?.focus();
              } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                const prevTab = tabs[(index - 1 + tabs.length) % tabs.length];
                onChangeFilter(prevTab.id);
                document.getElementById(`feed-tab-${prevTab.id}`)?.focus();
              }
            }}
            className={`
              relative flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-lg text-xs font-semibold
              transition-colors duration-150 select-none shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint/50
              ${isActive ? 'text-white font-bold' : 'text-text-muted hover:text-white hover:bg-white/[0.04]'}
            `}
          >
            {isActive && (
              <motion.div
                layoutId="active-feed-tab"
                className="absolute inset-0 bg-gradient-to-r from-[#12314C] via-[#173D60] to-[#9FD5B2]/20 border border-brand-mint/40 rounded-lg shadow-[0_2px_12px_rgba(18,49,76,0.5),0_0_12px_rgba(159,213,178,0.18)] overflow-hidden"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              >
                {/* Subtle top internal highlight edge */}
                <div className="absolute top-0 inset-x-2 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
              </motion.div>
            )}
            <Icon
              className={`w-3.5 h-3.5 relative z-10 transition-colors ${
                isActive ? 'text-brand-mint' : 'text-text-faint'
              }`}
            />
            <span className="relative z-10 tracking-tight">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
