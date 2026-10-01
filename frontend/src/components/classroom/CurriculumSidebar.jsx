import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  Lock,
  Play,
  Circle,
  ChevronDown,
  X,
  FileText,
  Clock,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { formatDuration } from '../../utils/courseUi';

/**
 * Shared Curriculum Content Component
 * Consumed by both desktop persistent sidebar and mobile slide-over drawer.
 */
export function CurriculumContent({
  curriculum,
  chapters = [],
  currentChapterCode,
  currentClassId,
  learningProgress,
  onSelectClass,
  onLockedClick,
  onClose,
}) {
  // Support both unified curriculum object or separate props
  const resolvedChapters = curriculum?.chapters || chapters || [];
  const resolvedProgress = curriculum?.overallProgress || learningProgress || {};
  const courseTitle = curriculum?.course?.name || 'Course Curriculum';

  const [openChapters, setOpenChapters] = useState({});

  // Auto-expand active chapter on mount or when active chapter changes
  useEffect(() => {
    if (currentChapterCode) {
      setOpenChapters((prev) => ({
        ...prev,
        [currentChapterCode]: true,
      }));
    } else if (resolvedChapters.length > 0) {
      const activeCh = resolvedChapters.find(
        (ch) => (ch.classes || ch.lessons || []).some((c) => String(c._id || c.id) === String(currentClassId))
      );
      const codeToOpen = activeCh ? (activeCh.uniqueCode || activeCh._id) : (resolvedChapters[0].uniqueCode || resolvedChapters[0]._id);
      if (codeToOpen) {
        setOpenChapters((prev) => ({ ...prev, [codeToOpen]: true }));
      }
    }
  }, [currentChapterCode, currentClassId, resolvedChapters]);

  const toggleChapter = (code) => {
    setOpenChapters((prev) => ({
      ...prev,
      [code]: !prev[code],
    }));
  };

  const totalClasses = resolvedProgress?.totalClasses || resolvedChapters.reduce((sum, ch) => sum + (ch.classes?.length || ch.lessons?.length || 0), 0);
  const completedClasses = resolvedProgress?.completedClasses || resolvedChapters.reduce((sum, ch) => sum + (ch.completedClasses || 0), 0);
  const completionPercent = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        resolvedProgress?.completionPercent !== undefined
          ? resolvedProgress.completionPercent
          : (totalClasses > 0 ? (completedClasses / totalClasses) * 100 : 0)
      )
    )
  );

  return (
    <div className="flex flex-col h-full select-none">
      {/* ── Curriculum Header ── */}
      <div className="p-4 sm:p-5 border-b border-white/[0.08] bg-white/[0.01] shrink-0">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-mint">
            Course Curriculum
          </span>
          <span className="text-[11px] font-mono font-semibold text-white/50">
            {completedClasses} / {totalClasses} Lessons
          </span>
        </div>

        <h3 className="text-sm sm:text-base font-heading font-bold text-white leading-snug line-clamp-2">
          {courseTitle}
        </h3>

        {/* Overall Course Progress Bar */}
        <div className="mt-3.5 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-text-muted">
            <span>Overall Progress</span>
            <span className="font-mono font-bold text-brand-mint">{completionPercent}%</span>
          </div>
          <div
            role="progressbar"
            aria-label="Overall course curriculum progress"
            aria-valuenow={completionPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            className="w-full h-1.5 rounded-full bg-white/[0.08] overflow-hidden"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-mint to-brand-yellow transition-all duration-500"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Chapters Accordion List ── */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04] p-2 space-y-2 no-scrollbar">
        {resolvedChapters.length === 0 ? (
          <div className="p-8 text-center text-text-muted text-xs">
            No curriculum modules published yet.
          </div>
        ) : (
          resolvedChapters.map((chapter, chIdx) => {
            const code = chapter.uniqueCode || chapter._id || `ch-${chIdx}`;
            const isExpanded = Boolean(openChapters[code]);
            const chapterLessons = chapter.lessons || chapter.classes || [];
            const isChapterActive =
              code === currentChapterCode ||
              chapterLessons.some((c) => String(c._id || c.id) === String(currentClassId));
            const isLocked = Boolean(chapter.locked ?? chapter.isLocked);
            const isCompleted = Boolean(chapter.completed ?? chapter.isCompleted);

            return (
              <div
                key={code}
                className={`rounded-2xl transition-all overflow-hidden border ${
                  isChapterActive
                    ? 'border-brand-mint/30 bg-brand-mint/[0.02]'
                    : 'border-white/[0.04] bg-white/[0.01]'
                }`}
              >
                {/* Chapter Header Accordion Button */}
                <button
                  type="button"
                  onClick={() => toggleChapter(code)}
                  aria-expanded={isExpanded}
                  className="w-full p-3.5 flex items-center justify-between gap-3 text-left hover:bg-white/[0.04] transition-all cursor-pointer focus-ring"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-brand-mint/80">
                        Module {String(chIdx + 1).padStart(2, '0')}
                      </span>
                      {isCompleted && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          Done
                        </span>
                      )}
                      {isLocked && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-white/40 bg-white/[0.05] px-1.5 py-0.5 rounded">
                          <Lock className="w-2.5 h-2.5" />
                          Locked
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs sm:text-sm font-semibold text-white truncate">
                      {chapter.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-text-muted">
                      <span>{chapterLessons.length} {chapterLessons.length === 1 ? 'lesson' : 'lessons'}</span>
                      {chapter.completedClasses > 0 && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-white/20" />
                          <span className="text-emerald-400/90 font-mono">{chapter.completedClasses} completed</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className={`p-1 text-white/50 transition-transform duration-200 shrink-0 ${isExpanded ? 'rotate-180' : ''}`}>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {/* Lesson Items inside Chapter */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="p-1.5 pt-0 space-y-1">
                        {chapterLessons.length === 0 ? (
                          <p className="text-[11px] text-text-muted p-3 text-center">
                            No lessons available in this module yet.
                          </p>
                        ) : (
                          chapterLessons.map((cls) => {
                            const classId = String(cls._id || cls.id);
                            const isCurrent = classId === String(currentClassId);
                            const isClassDone = Boolean(cls.completed ?? cls.isCompleted ?? cls.classProgress?.completed);
                            const isClassLocked = Boolean(cls.locked ?? cls.isLocked ?? isLocked);

                            return (
                              <button
                                key={classId}
                                type="button"
                                onClick={() => {
                                  if (isClassLocked) {
                                    if (onLockedClick) onLockedClick(cls, chapter);
                                  } else {
                                    if (onSelectClass) onSelectClass(cls);
                                    if (onClose) onClose();
                                  }
                                }}
                                className={`w-full flex items-center justify-between gap-2.5 p-2.5 rounded-xl text-left transition-all cursor-pointer focus-ring ${
                                  isCurrent
                                    ? 'bg-brand-mint/15 border border-brand-mint/40 text-white shadow-lg shadow-brand-mint/5'
                                    : isClassDone
                                    ? 'bg-emerald-500/[0.04] border border-emerald-500/20 text-white/90 hover:bg-emerald-500/10'
                                    : isClassLocked
                                    ? 'opacity-40 border border-transparent hover:bg-white/[0.02] text-white/40'
                                    : 'border border-transparent hover:border-white/[0.08] hover:bg-white/[0.04] text-white/80'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  {/* State Indicator Icon */}
                                  <div className="shrink-0">
                                    {isCurrent ? (
                                      <div className="w-5 h-5 rounded-full bg-brand-mint/20 border border-brand-mint text-brand-mint flex items-center justify-center animate-pulse">
                                        <Play className="w-2.5 h-2.5 fill-current" />
                                      </div>
                                    ) : isClassDone ? (
                                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                    ) : isClassLocked ? (
                                      <Lock className="w-4 h-4 text-white/30" />
                                    ) : (
                                      <Circle className="w-3.5 h-3.5 text-white/30" />
                                    )}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <p className={`text-xs truncate ${isCurrent ? 'font-bold text-white' : 'font-medium'}`}>
                                      {cls.title}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-text-muted">
                                      {cls.duration && (
                                        <span className="inline-flex items-center gap-1 font-mono">
                                          <Clock className="w-2.5 h-2.5 text-text-muted" />
                                          {formatDuration(cls.duration)}
                                        </span>
                                      )}
                                      {cls.exerciseCount > 0 && (
                                        <span className="inline-flex items-center gap-1 text-brand-mint/80">
                                          <FileText className="w-2.5 h-2.5" />
                                          {cls.exerciseCount} {cls.exerciseCount === 1 ? 'file' : 'files'}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {isCurrent && (
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-brand-mint px-2 py-0.5 rounded-full bg-brand-mint/20 border border-brand-mint/30 shrink-0">
                                    Playing
                                  </span>
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/**
 * Desktop Persistent Curriculum Sidebar Component
 * Rendered ONLY on desktop (>= 1280px) inside studio column.
 * Guarantees exactly ONE semantic landmark <aside aria-label="Course Curriculum Navigation">.
 */
export default function CurriculumSidebar({
  curriculum,
  course,
  chapters = [],
  currentChapterCode,
  currentClassId,
  learningProgress,
  onSelectClass,
  onLockedClick,
}) {
  return (
    <aside
      aria-label="Course Curriculum Navigation"
      className="flex flex-col w-full h-full rounded-2xl sm:rounded-3xl border border-white/[0.08] bg-bg-card/90 backdrop-blur-xl overflow-hidden shadow-2xl"
    >
      <CurriculumContent
        curriculum={curriculum}
        chapters={chapters}
        currentChapterCode={currentChapterCode}
        currentClassId={currentClassId}
        learningProgress={learningProgress}
        onSelectClass={onSelectClass}
        onLockedClick={onLockedClick}
      />
    </aside>
  );
}

/**
 * Mobile / Tablet Slide-over Drawer Component
 * Rendered ONLY when isOpen is true on mobile (< 1280px).
 * Uses accessible dialog semantics and safe area padding.
 */
export function CurriculumDrawer({
  isOpen,
  onClose,
  curriculum,
  chapters = [],
  currentChapterCode,
  currentClassId,
  learningProgress,
  onSelectClass,
  onLockedClick,
}) {
  // Close drawer on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Course Curriculum"
          className="fixed inset-0 z-50 flex items-end justify-center xl:hidden"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
          />

          {/* Slide-over Drawer with Safe-Area Padding */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
            className="relative w-full max-w-xl rounded-t-3xl bg-bg-surface border-t border-white/15 p-2 pt-3 shadow-2xl z-10 max-h-[85vh] flex flex-col pb-[env(safe-area-inset-bottom,24px)]"
          >
            {/* Drag Handle */}
            <div className="w-12 h-1.5 rounded-full bg-white/20 mx-auto mb-2 shrink-0" />

            {/* Header with Close Button */}
            <div className="flex items-center justify-between px-4 pb-2 border-b border-white/[0.08]">
              <h3 className="text-sm font-bold text-white font-heading">
                Curriculum Navigation
              </h3>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close curriculum drawer"
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white/60 hover:text-white bg-white/[0.04] border border-white/[0.08] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Scrollable Content */}
            <div className="flex-1 overflow-hidden">
              <CurriculumContent
                curriculum={curriculum}
                chapters={chapters}
                currentChapterCode={currentChapterCode}
                currentClassId={currentClassId}
                learningProgress={learningProgress}
                onSelectClass={onSelectClass}
                onLockedClick={onLockedClick}
                onClose={onClose}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
