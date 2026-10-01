import React from 'react';
import { ChevronLeft, ChevronRight, Play, CheckCircle2, Lock, Sparkles, BookOpen } from 'lucide-react';
import { formatDuration } from '../../utils/courseUi';

/**
 * LessonNavigation Component
 *
 * Full cross-chapter navigation controls powered by the unified curriculum model.
 * Seamlessly resolves previous and next lessons across chapter boundaries without dead-ends.
 */
export default function LessonNavigation({
  prevLesson,
  nextLesson,
  nextChapter,
  isLastLessonInChapter,
  isLastLessonInCourse,
  autoPlayNext = false,
  onToggleAutoPlay,
  onNavigateLesson,
  onNavigateNextChapter,
  onOpenCurriculum,
}) {
  const isPrevCrossChapter = prevLesson && prevLesson.chapterCode && nextLesson && prevLesson.chapterCode !== nextLesson.chapterCode;
  const isNextCrossChapter = nextLesson && prevLesson && nextLesson.chapterCode !== prevLesson.chapterCode;

  return (
    <div className="w-full rounded-2xl sm:rounded-3xl border border-white/[0.08] bg-bg-card/70 backdrop-blur-md p-4 sm:p-6 transition-all space-y-4">
      {/* Top bar: Autoplay toggle + Curriculum shortcut */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-b border-white/[0.06] pb-3">
        <label className="inline-flex items-center gap-2.5 cursor-pointer select-none text-text-muted hover:text-white transition-colors min-h-[44px] sm:min-h-0">
          <input
            type="checkbox"
            checked={autoPlayNext}
            onChange={(e) => onToggleAutoPlay && onToggleAutoPlay(e.target.checked)}
            className="w-4 h-4 rounded border-white/20 bg-white/5 text-brand-mint focus:ring-brand-mint/40 cursor-pointer"
          />
          <span className="font-medium text-xs">Auto-play next lesson</span>
        </label>

        <button
          type="button"
          onClick={onOpenCurriculum}
          className="inline-flex items-center gap-1.5 text-xs text-brand-mint hover:underline font-semibold cursor-pointer min-h-[44px] sm:min-h-0"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>View Curriculum Modules →</span>
        </button>
      </div>

      {/* Main navigation controls (Responsive grid, cross-chapter traversal) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 items-stretch">
        {/* PREVIOUS LESSON */}
        <button
          type="button"
          disabled={!prevLesson}
          onClick={() => prevLesson && onNavigateLesson(prevLesson)}
          aria-label={prevLesson ? `Previous lesson: ${prevLesson.title}` : 'Beginning of course'}
          className={`flex items-center gap-3 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border transition-all text-left group min-h-[56px] ${
            prevLesson
              ? 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/20 cursor-pointer'
              : 'border-white/[0.04] bg-white/[0.01] opacity-35 cursor-not-allowed'
          }`}
        >
          <div className="w-9 h-9 rounded-xl border border-white/[0.08] bg-white/[0.04] flex items-center justify-center text-white/70 group-hover:text-white group-hover:border-white/20 shrink-0 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </div>

          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted block">
              {prevLesson?.chapterTitle ? `Prev · ${prevLesson.chapterTitle}` : 'Previous Lesson'}
            </span>
            <h4 className="text-xs sm:text-sm font-semibold text-white/90 truncate group-hover:text-white transition-colors">
              {prevLesson ? prevLesson.title : 'Course Beginning'}
            </h4>
          </div>
        </button>

        {/* NEXT LESSON OR CHAPTER BOUNDARY */}
        {nextLesson ? (
          <button
            type="button"
            onClick={() => onNavigateLesson(nextLesson)}
            aria-label={nextLesson.locked || nextLesson.isLocked ? `Next lesson (Locked): ${nextLesson.title}` : `Next lesson: ${nextLesson.title}`}
            className={`flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border transition-all text-left group min-h-[56px] cursor-pointer ${
              nextLesson.locked || nextLesson.isLocked
                ? 'border-white/[0.06] bg-white/[0.02] hover:border-white/10'
                : 'border-brand-mint/30 bg-brand-mint/[0.04] hover:bg-brand-mint/[0.08] hover:border-brand-mint/50'
            }`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-mint block">
                  {nextLesson?.chapterTitle ? `Next · ${nextLesson.chapterTitle}` : 'Next Up'}
                </span>
                {nextLesson.duration && (
                  <span className="text-[10px] font-mono text-text-muted">
                    · {formatDuration(nextLesson.duration)}
                  </span>
                )}
              </div>
              <h4 className="text-xs sm:text-sm font-semibold text-white truncate group-hover:text-brand-mint transition-colors">
                {nextLesson.title}
              </h4>
            </div>

            <div className="w-9 h-9 rounded-xl bg-brand-mint/20 border border-brand-mint/40 text-brand-mint flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              {nextLesson.locked || nextLesson.isLocked ? (
                <Lock className="w-4 h-4 text-text-muted" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </div>
          </button>
        ) : isLastLessonInChapter && nextChapter ? (
          /* Chapter Boundary: Seamless Continuation to Next Chapter */
          <button
            type="button"
            onClick={() => onNavigateNextChapter(nextChapter)}
            aria-label={`Continue to next chapter: ${nextChapter.title}`}
            className="flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-brand-yellow/30 bg-brand-yellow/[0.06] hover:bg-brand-yellow/[0.12] hover:border-brand-yellow/50 transition-all text-left group min-h-[56px] cursor-pointer"
          >
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-yellow flex items-center gap-1.5 block">
                <Sparkles className="w-3 h-3" />
                Module Complete · Next Module
              </span>
              <h4 className="text-xs sm:text-sm font-semibold text-white truncate group-hover:text-brand-yellow transition-colors">
                Continue to {nextChapter.title || 'Next Chapter'}
              </h4>
              <p className="text-[10px] text-text-muted mt-0.5">
                {nextChapter.classes?.length || nextChapter.lessons?.length || 0} Lessons in next module
              </p>
            </div>

            <div className="w-9 h-9 rounded-xl bg-brand-yellow text-bg-base font-bold flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>
        ) : isLastLessonInCourse ? (
          /* Course Finale */
          <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] min-h-[56px]">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 block">
                Course Completed
              </span>
              <h4 className="text-xs sm:text-sm font-semibold text-white truncate">
                You reached the final lecture!
              </h4>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
