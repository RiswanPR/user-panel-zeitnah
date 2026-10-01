import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronRight,
  AlertTriangle,
  HelpCircle,
  Menu,
} from 'lucide-react';

export default function LearningHeader({
  course,
  chapter,
  currentClass,
  learningProgress,
  syncState,
  isClassCompleted,
  onOpenCurriculum,
  onOpenIssueModal,
  onOpenShortcuts,
}) {
  const navigate = useNavigate();

  const courseCompletionPercent = Math.min(
    100,
    Math.max(0, Math.round(learningProgress?.completionPercent || 0))
  );

  const syncLabel = isClassCompleted
    ? 'Completed'
    : syncState === 'saved'
    ? 'Synced'
    : syncState === 'saving'
    ? 'Saving...'
    : syncState === 'watching'
    ? 'Playing'
    : syncState === 'error'
    ? 'Sync Failed'
    : 'Ready';

  const syncDotColor = isClassCompleted || syncState === 'saved'
    ? 'bg-emerald-400'
    : syncState === 'saving' || syncState === 'watching'
    ? 'bg-brand-mint animate-pulse'
    : syncState === 'error'
    ? 'bg-rose-500'
    : 'bg-white/40';

  return (
    <header className="sticky top-0 z-30 w-full bg-bg-base/90 backdrop-blur-xl border-b border-white/[0.08] transition-all">
      <div className="max-w-[1680px] mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3">
        {/* Left: Brand Mark, Back Navigation, and Breadcrumb Trail */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => {
              if (course?._id) {
                navigate(`/courses/${course._id}/chapters`);
              } else {
                navigate('/courses');
              }
            }}
            aria-label="Back to course overview"
            className="h-9 w-9 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.08] text-white/70 hover:text-white flex items-center justify-center transition-all cursor-pointer shrink-0 focus-ring"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {/* Breadcrumbs (Responsive truncation) */}
          <nav aria-label="Course hierarchy" className="flex items-center gap-1.5 min-w-0 text-xs text-text-muted">
            <Link
              to="/courses"
              className="hidden md:inline hover:text-white transition-colors truncate shrink-0"
            >
              Courses
            </Link>

            {course?.name && (
              <>
                <ChevronRight className="hidden md:inline w-3 h-3 text-white/30 shrink-0" />
                <Link
                  to={`/courses/${course._id}/chapters`}
                  title={course.name}
                  className="hidden sm:inline font-medium hover:text-white transition-colors truncate max-w-[120px] md:max-w-[200px] lg:max-w-[280px]"
                >
                  {course.name}
                </Link>
              </>
            )}

            {chapter?.title && (
              <>
                <ChevronRight className="hidden sm:inline w-3 h-3 text-white/30 shrink-0" />
                <span
                  title={chapter.title}
                  className="hidden lg:inline text-white/60 truncate max-w-[160px]"
                >
                  {chapter.title}
                </span>
              </>
            )}

            <ChevronRight className="w-3 h-3 text-white/30 shrink-0 sm:hidden" />
            <span
              title={currentClass?.title || 'Lesson'}
              className="text-white font-semibold truncate text-xs sm:text-sm max-w-[180px] sm:max-w-[260px] md:max-w-[340px]"
            >
              {currentClass?.title || 'Lesson'}
            </span>
          </nav>
        </div>

        {/* Right: Sync Status, Progress, and Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Micro-Sync Status Badge */}
          <div
            title={`Playback Status: ${syncLabel}`}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/[0.08] bg-white/[0.02] text-[11px] font-medium text-white/70"
          >
            <span className={`w-2 h-2 rounded-full ${syncDotColor}`} />
            <span className="hidden sm:inline">{syncLabel}</span>
          </div>

          {/* Overall Course Progress Chip */}
          <div
            className="hidden md:flex items-center gap-2.5 px-3 py-1 rounded-xl border border-white/[0.08] bg-white/[0.02]"
            title={`Course Progress: ${courseCompletionPercent}%`}
          >
            <div className="w-16 h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
              <div
                className="h-full rounded-full bg-brand-mint transition-all duration-500"
                style={{ width: `${courseCompletionPercent}%` }}
              />
            </div>
            <span className="text-[11px] font-mono font-bold text-brand-mint">
              {courseCompletionPercent}%
            </span>
          </div>

          {/* Keyboard Shortcuts Trigger */}
          <button
            type="button"
            onClick={onOpenShortcuts}
            aria-label="View keyboard shortcuts"
            title="Keyboard shortcuts (?)"
            className="hidden sm:flex h-9 w-9 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.08] text-white/60 hover:text-white items-center justify-center transition-all cursor-pointer focus-ring"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Report Video Issue Trigger */}
          <button
            type="button"
            onClick={onOpenIssueModal}
            aria-label="Report a playback problem"
            title="Report playback problem"
            className="hidden sm:flex items-center gap-1.5 h-9 px-3 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.08] text-[11px] font-semibold text-white/70 hover:text-white transition-all cursor-pointer focus-ring"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-warning" />
            <span className="hidden lg:inline">Report Issue</span>
          </button>

          {/* Curriculum Sidebar / Drawer Toggle */}
          <button
            type="button"
            onClick={onOpenCurriculum}
            aria-label="Toggle course curriculum playlist"
            className="h-9 px-3 sm:px-3.5 rounded-xl border border-brand-mint/30 bg-brand-mint/10 hover:bg-brand-mint/20 text-brand-mint text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer focus-ring"
          >
            <Menu className="w-4 h-4" />
            <span className="hidden sm:inline">Curriculum</span>
          </button>
        </div>
      </div>
    </header>
  );
}
