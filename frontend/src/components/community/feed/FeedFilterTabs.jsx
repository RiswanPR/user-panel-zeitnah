import React from 'react';
import { motion } from 'framer-motion';
import { Globe, Users, GraduationCap } from 'lucide-react';

/**
 * FeedFilterTabs — Premium segmented filter navigation for Community feed.
 * Accessible, responsive with touch scroll, and supports All, Following, and Cohort feeds.
 */
export default function FeedFilterTabs({
  activeFilter = 'all',
  onChangeFilter,
  hasCohort = false,
  className = '',
}) {
  const tabs = [
    { id: 'all', label: 'All', icon: Globe },
    { id: 'following', label: 'Following', icon: Users },
    ...(hasCohort ? [{ id: 'cohort', label: 'My Cohort', icon: GraduationCap }] : []),
  ];

  return (
    <div
      role="tablist"
      aria-label="Feed content filters"
      className={`flex items-center gap-1.5 p-1 bg-[#12314C]/35 border border-white/[0.08] rounded-xl backdrop-blur-xl overflow-x-auto scrollbar-none ${className}`}
    >
      {tabs.map((tab, index) => {
        const isActive = activeFilter === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            role="tab"
            id={`feed-tab-${tab.id}`}
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
              relative flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-lg text-xs font-semibold
              transition-colors duration-150 select-none shrink-0 cursor-pointer
              ${isActive ? 'text-white font-bold' : 'text-text-muted hover:text-white hover:bg-white/[0.03]'}
            `}
          >
            {isActive && (
              <motion.div
                layoutId="active-feed-tab"
                className="absolute inset-0 bg-gradient-to-r from-[#12314C] via-[#163B5C] to-[#9FD5B2]/25 border border-brand-mint/45 rounded-lg shadow-[0_2px_12px_rgba(18,49,76,0.6),0_0_14px_rgba(159,213,178,0.22)] overflow-hidden"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              >
                {/* Subtle top internal highlight edge */}
                <div className="absolute top-0 inset-x-2 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />
              </motion.div>
            )}
            <Icon
              className={`w-3.5 h-3.5 relative z-10 transition-colors ${
                isActive ? 'text-brand-mint' : 'text-text-faint'
              }`}
            />
            <span className="relative z-10">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
