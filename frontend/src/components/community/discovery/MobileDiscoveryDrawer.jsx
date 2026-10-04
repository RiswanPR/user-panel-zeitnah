import { useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, Compass, Search, Flame, Users } from 'lucide-react';
import TrendingTopics from './TrendingTopics';
import DiscoveryLinks from './DiscoveryLinks';
import PeopleCard from './PeopleCard';
import PremiumCard from '../../ui/PremiumCard';
import { useSuggestedPeople } from '../../../hooks/useCommunity';
import { networkApi } from '../../../services/networkApi';

/**
 * MobileDiscoveryDrawer — Contextual bottom sheet for discovering topics,
 * people, and verified resources on mobile viewports (<1024px).
 * Implements full modal accessibility, focus management, and body scroll lock.
 */
export default function MobileDiscoveryDrawer({
  isOpen,
  onClose,
  topics = [],
  activeTopic = null,
  activeFilter = 'all',
  onSelectTopic,
  onOpenSearch,
}) {
  const drawerRef = useRef(null);
  const previousActiveElementRef = useRef(null);
  const shouldReduceMotion = useReducedMotion();

  // Real verified peer discovery via networkApi.getPeople backed by TanStack Query cache
  const { data: suggestedPeople = [] } = useSuggestedPeople({
    limit: 3,
    fetcher: networkApi.getPeople,
  });

  // Focus management & body scroll lock
  useEffect(() => {
    if (isOpen) {
      previousActiveElementRef.current = document.activeElement;
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.overflow = originalOverflow;
        if (previousActiveElementRef.current?.focus) {
          previousActiveElementRef.current.focus();
        }
      };
    }
  }, [isOpen]);

  // Escape key listener
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[80] flex justify-end items-end"
          role="dialog"
          aria-modal="true"
          aria-label="Community Discovery"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Bottom Sheet Container */}
          <motion.div
            ref={drawerRef}
            initial={shouldReduceMotion ? { opacity: 0 } : { y: '100%', opacity: 0.5 }}
            animate={{
              y: 0,
              opacity: 1,
              transition: shouldReduceMotion
                ? { duration: 0.1 }
                : { type: 'spring', damping: 28, stiffness: 350 },
            }}
            exit={
              shouldReduceMotion
                ? { opacity: 0, transition: { duration: 0.1 } }
                : { y: '100%', opacity: 0, transition: { duration: 0.2 } }
            }
            className="relative z-10 w-full max-h-[85vh] h-[82vh] bg-[#0B111E] border-t border-white/[0.08] shadow-[0_0_50px_rgba(0,0,0,0.6)] rounded-t-3xl flex flex-col overflow-hidden pb-[calc(1rem+env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag Handle */}
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-2.5 mb-1 shrink-0" />

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] shrink-0">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-brand-mint" />
                <h3 className="text-base font-bold text-white tracking-tight">
                  Discover Community
                </h3>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="min-w-[44px] min-h-[44px] rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-text-muted hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close discovery"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {/* 1. Quick Search Action */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenSearch) onOpenSearch();
                }}
                className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] hover:border-brand-mint/40 text-left transition-all duration-150 flex items-center justify-between group cursor-pointer text-xs text-text-muted"
                aria-label="Open community search"
              >
                <div className="flex items-center gap-2.5">
                  <Search className="w-4 h-4 text-brand-mint" />
                  <span>Search posts, peers, topics...</span>
                </div>
              </button>

              {/* 2. Trending Feed Toggle */}
              <Link
                to={activeFilter === 'trending' ? '/community' : '/community?feed=trending'}
                onClick={onClose}
                className={`
                  flex items-center justify-between px-3.5 py-2.5 rounded-xl border transition-all duration-150
                  ${
                    activeFilter === 'trending'
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 font-bold'
                      : 'bg-white/[0.025] hover:bg-white/[0.05] border-white/[0.06] text-text-secondary'
                  }
                `}
              >
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span className="text-xs">Trending Discussions</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.05]">
                  {activeFilter === 'trending' ? 'Active' : 'View'}
                </span>
              </Link>

              {/* 3. Trending Topics */}
              <TrendingTopics
                topics={topics}
                activeTopic={activeTopic}
                onSelectTopic={(tag) => {
                  onSelectTopic(tag);
                  onClose();
                }}
              />

              {/* 4. Suggested People */}
              {suggestedPeople.length > 0 && (
                <PremiumCard variant="panel" padding="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-brand-mint" />
                      <span>People to Discover</span>
                    </h4>
                    <Link
                      to="/network"
                      onClick={onClose}
                      className="text-[11px] text-text-muted hover:text-brand-mint transition-colors"
                    >
                      See all
                    </Link>
                  </div>
                  <div className="space-y-2">
                    {suggestedPeople.map((person) => (
                      <PeopleCard key={person._id || person.id} person={person} compact />
                    ))}
                  </div>
                </PremiumCard>
              )}

              {/* 5. Platform Exploration Links */}
              <DiscoveryLinks
                onOpenSearch={() => {
                  onClose();
                  if (onOpenSearch) onOpenSearch();
                }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
