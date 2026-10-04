import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, Sparkles, Film, FileText, ChevronRight, PlayCircle } from 'lucide-react';

/**
 * CreateActionModal — Premium Create Entry Experience for Zeitnah Community:
 * - Desktop: Centered premium dialog (~760–800px, max-height ~85vh) feeling like a focused workspace
 * - Mobile: Native-feeling bottom sheet with comfortable touch targets and zero horizontal overflow
 * - Two strong, balanced publication pillars:
 *   1. ✦ POST: Ideas, photos, polls, and knowledge
 *   2. ▶ REEL: Short vertical videos (up to 90s) for discovery
 * - Full accessibility: ESC to close, TAB focus navigation, ENTER/SPACE activation, aria labels
 */
export default function CreateActionModal({
  isOpen,
  onClose,
  onSelectPost,
  onSelectReel,
  onSelectStory,
}) {
  const modalRef = useRef(null);
  const previousActiveElementRef = useRef(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (isOpen) {
      previousActiveElementRef.current = document.activeElement;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
        if (previousActiveElementRef.current?.focus) {
          previousActiveElementRef.current.focus();
        }
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <div
        id="create-action-modal"
        className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 bg-black/75 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-chooser-title"
        onClick={onClose}
      >
        <motion.div
          ref={modalRef}
          initial={
            shouldReduceMotion
              ? { opacity: 0 }
              : { y: 32, opacity: 0, scale: 0.98 }
          }
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={
            shouldReduceMotion
              ? { opacity: 0 }
              : { y: 32, opacity: 0, scale: 0.98 }
          }
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="w-full sm:max-w-3xl max-h-[90vh] sm:max-h-[85vh] bg-[#090E1A] sm:bg-[#0B111E] border-t sm:border border-white/[0.08] rounded-t-3xl sm:rounded-2xl p-5 sm:p-8 shadow-2xl text-white select-none overflow-y-auto"
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between pb-4 mb-4 sm:mb-6 border-b border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-mint/10 border border-brand-mint/20 flex items-center justify-center text-brand-mint">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold font-heading text-white tracking-tight">
                  Create
                </h3>
                <p className="text-[11px] text-text-muted hidden sm:block">
                  Zeitnah Community Publishing
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-text-muted hover:text-white hover:bg-white/[0.06] transition-colors flex items-center justify-center cursor-pointer"
              aria-label="Close creation menu"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ── Prompt Section ── */}
          <div className="mb-6 sm:mb-8 text-center sm:text-left">
            <h2
              id="create-chooser-title"
              className="text-xl sm:text-2xl font-extrabold font-heading text-white tracking-tight"
            >
              What do you want to share?
            </h2>
            <p className="text-xs sm:text-sm text-text-muted mt-1.5 leading-relaxed">
              Choose your format to start creating for the Zeitnah engineering community.
            </p>
          </div>

          {/* ── Two Primary Choices: POST and REEL ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {/* ── Card 1: ✦ POST ── */}
            <button
              type="button"
              id="create-action-post"
              onClick={() => {
                onClose();
                if (onSelectPost) onSelectPost();
              }}
              className="w-full text-left p-5 sm:p-6 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.08] hover:border-brand-mint/40 transition-all cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint/60 flex flex-col justify-between min-h-[220px] sm:min-h-[260px] shadow-sm hover:shadow-lg hover:shadow-brand-mint/5"
              aria-label="Create a Post — Share ideas, photos, knowledge, polls and updates"
            >
              <div>
                {/* Header with Icon */}
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-brand-mint/10 border border-brand-mint/20 flex items-center justify-center text-brand-mint group-hover:scale-105 transition-transform">
                    <FileText className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-mono text-text-muted group-hover:text-brand-mint transition-colors flex items-center gap-1">
                    <span>Open Post Studio</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>

                {/* Title & Description */}
                <h4 className="text-base sm:text-lg font-bold font-heading text-white group-hover:text-brand-mint transition-colors mb-1.5 flex items-center gap-1.5">
                  <span className="text-brand-mint">✦</span>
                  <span>POST</span>
                </h4>
                <p className="text-xs text-text-muted leading-relaxed mb-4">
                  Share ideas, photos, knowledge, polls and architectural discussions with your peers.
                </p>
              </div>

              {/* Miniature Visual Mockup & Feature Chips */}
              <div>
                <div className="p-2.5 rounded-xl bg-black/30 border border-white/[0.04] mb-3 hidden sm:block">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-4 h-4 rounded-full bg-white/10" />
                    <div className="h-1.5 w-16 bg-white/15 rounded-full" />
                  </div>
                  <div className="space-y-1 mb-2">
                    <div className="h-1.5 w-full bg-white/10 rounded-full" />
                    <div className="h-1.5 w-3/4 bg-white/5 rounded-full" />
                  </div>
                  <div className="h-10 w-full bg-white/[0.03] rounded-lg border border-white/[0.05] flex items-center justify-center text-[10px] text-text-muted/60 font-mono">
                    Ideas · Photos · Polls · Carousel
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 rounded-md bg-white/[0.04] text-[10px] text-text-muted font-medium">Ideas</span>
                  <span className="px-2 py-0.5 rounded-md bg-white/[0.04] text-[10px] text-text-muted font-medium">Photos</span>
                  <span className="px-2 py-0.5 rounded-md bg-white/[0.04] text-[10px] text-text-muted font-medium">Polls</span>
                  <span className="px-2 py-0.5 rounded-md bg-white/[0.04] text-[10px] text-text-muted font-medium">Knowledge</span>
                </div>
              </div>
            </button>

            {/* ── Card 2: ▶ REEL ── */}
            <button
              type="button"
              id="create-action-reel"
              onClick={() => {
                onClose();
                if (onSelectReel) onSelectReel();
              }}
              className="w-full text-left p-5 sm:p-6 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.08] hover:border-brand-mint/40 transition-all cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint/60 flex flex-col justify-between min-h-[220px] sm:min-h-[260px] shadow-sm hover:shadow-lg hover:shadow-brand-mint/5"
              aria-label="Create a Reel — Short vertical video for high-impact discovery"
            >
              <div>
                {/* Header with Icon */}
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-brand-mint/15 to-brand-yellow/10 border border-brand-mint/20 flex items-center justify-center text-brand-mint group-hover:scale-105 transition-transform">
                    <Film className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-mono text-text-muted group-hover:text-brand-mint transition-colors flex items-center gap-1">
                    <span>Open Reel Studio</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>

                {/* Title & Description */}
                <h4 className="text-base sm:text-lg font-bold font-heading text-white group-hover:text-brand-mint transition-colors mb-1.5 flex items-center gap-1.5">
                  <span className="text-brand-mint">▶</span>
                  <span>REEL</span>
                </h4>
                <p className="text-xs text-text-muted leading-relaxed mb-4">
                  Create a short vertical video (up to 90 seconds) for high-impact visual discovery.
                </p>
              </div>

              {/* Miniature Visual Mockup & Feature Chips */}
              <div>
                <div className="p-2.5 rounded-xl bg-black/30 border border-white/[0.04] mb-3 hidden sm:block">
                  <div className="flex items-center justify-center gap-3">
                    <div className="h-10 w-6 rounded-md bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-brand-mint">
                      <Film className="w-3 h-3" />
                    </div>
                    <div className="text-[10px] text-text-muted/70 font-mono space-y-0.5">
                      <p className="text-white/80 font-medium">9:16 Vertical Video</p>
                      <p>Up to 90s · Up to 1 GB</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 rounded-md bg-brand-mint/10 text-[10px] text-brand-mint font-medium">9:16 Vertical</span>
                  <span className="px-2 py-0.5 rounded-md bg-white/[0.04] text-[10px] text-text-muted font-medium">Up to 90s</span>
                  <span className="px-2 py-0.5 rounded-md bg-white/[0.04] text-[10px] text-text-muted font-medium">Discovery</span>
                </div>
              </div>
            </button>
          </div>

          {/* ── Optional Secondary Story Link ── */}
          {onSelectStory && (
            <div className="mt-6 pt-4 border-t border-white/[0.04] flex items-center justify-between text-xs text-text-muted">
              <span>Looking to share quick 24-hour updates?</span>
              <button
                type="button"
                id="create-action-story-link"
                onClick={() => {
                  onClose();
                  onSelectStory();
                }}
                className="text-text-secondary hover:text-brand-mint transition-colors font-semibold flex items-center gap-1.5 cursor-pointer p-1"
              >
                <PlayCircle className="w-4 h-4 text-brand-mint" />
                <span>Add to Story</span>
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
