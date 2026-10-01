import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ChevronRight, RotateCcw, X, Sparkles } from 'lucide-react';

export default function ChapterCompleteModal({
  isOpen,
  onClose,
  chapter,
  nextChapter,
  completedLessonCount = 0,
  totalLessonCount = 0,
  onContinueToNextChapter,
  onReviewChapter,
}) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-md rounded-2xl sm:rounded-3xl border border-white/10 bg-bg-surface p-6 sm:p-8 shadow-2xl shadow-black/80 z-10 text-center space-y-6"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close chapter complete dialog"
            className="absolute top-4 right-4 h-8 w-8 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.08] text-white/60 hover:text-white flex items-center justify-center transition-all cursor-pointer focus-ring"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Achievement Icon */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-mint/20 to-brand-yellow/10 border border-brand-mint/30 text-brand-mint flex items-center justify-center mx-auto shadow-lg shadow-brand-mint/5">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          {/* Title & Copy */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-mint/10 border border-brand-mint/20 text-brand-mint text-[10px] font-bold uppercase tracking-widest">
              <Sparkles className="w-3 h-3" />
              Chapter Completed
            </div>

            <h3 className="font-heading font-extrabold text-xl sm:text-2xl text-white tracking-tight">
              {chapter?.title || 'Chapter Milestone'}
            </h3>

            <p className="text-xs sm:text-sm text-text-muted leading-relaxed max-w-xs mx-auto">
              You have completed all {totalLessonCount || completedLessonCount} lessons in this chapter module.
            </p>
          </div>

          {/* Progress summary divider */}
          <div className="py-3 px-4 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-center justify-between text-xs text-text-muted">
            <span>Lessons Finished</span>
            <span className="font-mono font-bold text-white">
              {completedLessonCount} / {totalLessonCount || completedLessonCount}
            </span>
          </div>

          {/* Actions */}
          <div className="space-y-2.5 pt-2">
            {nextChapter ? (
              <button
                type="button"
                onClick={onContinueToNextChapter}
                className="w-full py-3.5 px-5 rounded-xl bg-brand-mint hover:bg-brand-mint/90 text-bg-base font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-brand-mint/15 focus-ring"
              >
                <span>Continue to {nextChapter.title || 'Next Chapter'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3.5 px-5 rounded-xl bg-brand-mint hover:bg-brand-mint/90 text-bg-base font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer focus-ring"
              >
                <span>Return to Learning Studio</span>
              </button>
            )}

            <button
              type="button"
              onClick={onReviewChapter}
              className="w-full py-2.5 px-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] text-white/80 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer focus-ring"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Review Chapter</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
