import { useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, Compass } from 'lucide-react';
import TrendingTopics from './TrendingTopics';
import DiscoveryLinks from './DiscoveryLinks';

/**
 * MobileDiscoveryDrawer — Contextual bottom sheet for discovering topics
 * and verified resources on mobile viewports (<1280px / 768px).
 * Implements full modal accessibility, focus management, and body scroll lock.
 */
export default function MobileDiscoveryDrawer({
  isOpen,
  onClose,
  topics = [],
  activeTopic = null,
  onSelectTopic,
  onOpenSearch,
}) {
  const drawerRef = useRef(null);
  const previousActiveElementRef = useRef(null);
  const shouldReduceMotion = useReducedMotion();

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
              <TrendingTopics
                topics={topics}
                activeTopic={activeTopic}
                onSelectTopic={(tag) => {
                  onSelectTopic(tag);
                  onClose();
                }}
              />
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
