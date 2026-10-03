import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, PlusSquare, PlayCircle, Sparkles } from 'lucide-react';

/**
 * CreateActionModal — Instagram-style quick creation chooser:
 * Allows user to choose between creating a Feed Post or adding to Story.
 * Implements full modal accessibility, keyboard support, and backdrop dismissal.
 */
export default function CreateActionModal({
  isOpen,
  onClose,
  onSelectPost,
  onSelectStory,
}) {
  const modalRef = useRef(null);
  const previousActiveElementRef = useRef(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (isOpen) {
      previousActiveElementRef.current = document.activeElement;
      return () => {
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
        className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-action-title"
        onClick={onClose}
      >
        <motion.div
          ref={modalRef}
          initial={
            shouldReduceMotion
              ? { opacity: 0 }
              : { y: 40, opacity: 0 }
          }
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full sm:max-w-xs bg-[#0E1726] border border-white/[0.1] rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl text-white select-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/[0.08]">
            <h3 id="create-action-title" className="text-sm font-bold font-heading text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-mint" />
              <span>Create</span>
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-text-muted hover:text-white hover:bg-white/[0.06] transition-colors"
              aria-label="Close creation menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Action Choices */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              id="create-action-post"
              onClick={() => {
                onClose();
                onSelectPost();
              }}
              className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] hover:border-brand-mint/30 flex items-center gap-3 transition-all cursor-pointer group text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-brand-mint/10 border border-brand-mint/20 flex items-center justify-center text-brand-mint group-hover:scale-105 transition-transform">
                <PlusSquare className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold font-heading text-white group-hover:text-brand-mint transition-colors">
                  New Post
                </p>
                <p className="text-[10px] text-text-muted">
                  Share photos, videos, technical insights or questions
                </p>
              </div>
            </button>

            <button
              type="button"
              id="create-action-story"
              onClick={() => {
                onClose();
                onSelectStory();
              }}
              className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] hover:border-brand-mint/30 flex items-center gap-3 transition-all cursor-pointer group text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-mint/15 to-brand-yellow/10 border border-brand-mint/20 flex items-center justify-center text-brand-mint group-hover:scale-105 transition-transform">
                <PlayCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold font-heading text-white group-hover:text-brand-mint transition-colors">
                  Add to Story
                </p>
                <p className="text-[10px] text-text-muted">
                  Share ephemeral 24h updates with your network
                </p>
              </div>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
