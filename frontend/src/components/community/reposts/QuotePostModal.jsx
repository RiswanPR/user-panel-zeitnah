import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Loader2 } from 'lucide-react';
import QuotedPost from './QuotedPost';
import { useQuotePost } from '../../../hooks/useCommunity';

/**
 * QuotePostModal — Accessible dialog / mobile bottom-sheet for writing commentary
 * and quoting an existing Community post.
 */
export default function QuotePostModal({
  isOpen,
  onClose,
  targetPost,
  triggerRef,
}) {
  const [commentary, setCommentary] = useState('');
  const textareaRef = useRef(null);
  const modalRef = useRef(null);
  const quoteMutation = useQuotePost();

  // Determine canonical original post for the preview
  const originalPost =
    targetPost?.postType === 'repost' && targetPost?.originalPost
      ? targetPost.originalPost
      : targetPost;

  const originalPostId = originalPost?._id || originalPost?.id || targetPost?._id || targetPost?.id;

  useEffect(() => {
    if (isOpen) {
      setCommentary('');
      // Auto-focus the commentary textarea
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
        return;
      }

      if (e.key === 'Tab') {
        if (!modalRef.current) return;
        const focusableElements = modalRef.current.querySelectorAll(
          'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (!focusableElements.length) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleClose = () => {
    onClose();
    triggerRef?.current?.focus();
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    const trimmed = commentary.trim();
    if (!trimmed || !originalPostId) return;

    quoteMutation.mutate(
      {
        postId: originalPostId,
        content: trimmed,
        audience: targetPost?.audience || 'public',
        courseId: targetPost?.courseId,
      },
      {
        onSuccess: () => {
          handleClose();
        },
      }
    );
  };

  if (!isOpen) return null;

  const charLimit = 5000;
  const remaining = charLimit - commentary.length;
  const isSubmitDisabled = !commentary.trim() || quoteMutation.isPending;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quote-modal-title"
      >
        {/* Backdrop Click Dismiss */}
        <div
          className="absolute inset-0"
          onClick={handleClose}
          aria-hidden="true"
        />

        {/* Modal Window */}
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.96 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg bg-[#0F172A] border border-white/[0.12] rounded-t-3xl sm:rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] p-5 sm:p-6 overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-4">
            <h2
              id="quote-modal-title"
              className="text-base font-semibold text-white tracking-tight"
            >
              Quote post
            </h2>
            <button
              type="button"
              onClick={handleClose}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-text-muted hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
              aria-label="Close quote dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            {/* Commentary Textarea */}
            <div className="mb-3">
              <label htmlFor="quote-commentary-input" className="sr-only">
                Add your thoughts
              </label>
              <textarea
                id="quote-commentary-input"
                ref={textareaRef}
                value={commentary}
                onChange={(e) => setCommentary(e.target.value)}
                placeholder="Add your thoughts..."
                maxLength={charLimit}
                rows={3}
                className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-brand-mint/60 rounded-xl p-3 text-sm text-white placeholder-text-muted/60 focus:outline-none transition-colors resize-none leading-relaxed"
              />
              <div className="flex justify-end text-[11px] text-text-muted mt-1 px-1">
                <span>{remaining} characters left</span>
              </div>
            </div>

            {/* Read-only Embedded Post Card */}
            <div className="overflow-y-auto max-h-56 pr-1 mb-4 select-none">
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider block mb-1">
                Quoted content
              </span>
              <QuotedPost originalPost={originalPost} />
            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08] mt-auto">
              <button
                type="button"
                onClick={handleClose}
                className="min-h-[44px] px-4 py-2 text-xs font-semibold text-text-muted hover:text-white hover:bg-white/[0.04] rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitDisabled}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-brand-mint text-[#0B111E] font-semibold text-xs flex items-center gap-2 hover:bg-brand-mint/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-[0_2px_12px_rgba(52,211,153,0.25)]"
                aria-label="Publish quote post"
              >
                {quoteMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Quote</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
