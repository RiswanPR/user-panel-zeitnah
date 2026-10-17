import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Lock,
  PlayCircle,
} from "lucide-react";
import OptimizedImage from "../ui/OptimizedImage";
import { formatDuration, parseDurationToSeconds, getUploadUrl } from "../../utils/courseUi";

function ChapterCard({ chapter, index, onOpen }) {
  if (!chapter) return null;
  const locked = Boolean(chapter.locked ?? chapter.isLocked);
  const completed = Boolean(chapter.completed ?? chapter.isCompleted);
  const completedClasses = Number(chapter.completedClasses ?? chapter.completedLessonsCount ?? 0);
  const totalClasses = Number(chapter.totalClasses ?? chapter.lessonsCount ?? chapter.lessons?.length ?? chapter.classes?.length ?? 0);
  const inProgress = !completed && !locked && (completedClasses > 0 || (chapter.progressPercent || 0) > 0);
  const progressPercent = Math.min(
    100,
    Math.max(
      0,
      Number(
        chapter.progressPercent !== undefined
          ? chapter.progressPercent
          : totalClasses > 0
          ? Math.round((completedClasses / totalClasses) * 100)
          : 0
      )
    )
  );

  const totalDurationSeconds = (chapter.lessons || chapter.classes || []).reduce(
    (sum, l) => sum + (l.durationSeconds || parseDurationToSeconds(l.duration)),
    0
  );
  const formattedDuration = totalDurationSeconds > 0 ? formatDuration(totalDurationSeconds) : null;

  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: "easeOut" }}
      aria-label={`Module ${index + 1}: ${chapter.title}. ${
        completed
          ? "Completed"
          : locked
          ? "Locked"
          : inProgress
          ? `${progressPercent}% completed`
          : "Available"
      }`}
      className={`group relative flex h-full w-full flex-col overflow-hidden rounded-2xl border p-5 sm:p-6 text-left transition-all duration-300 cursor-pointer select-none card-subtle focus-ring min-h-[44px] ${
        completed
          ? "border-success/25 hover:border-success/40 bg-surface-card"
          : inProgress
          ? "border-brand-mint/30 hover:border-brand-mint/50 bg-surface-card"
          : locked
          ? "border-border hover:border-border-accent bg-surface-card/75 opacity-80"
          : "border-border hover:border-brand-mint/30 bg-surface-card"
      }`}
    >
      <div className="gradient-line-top" />

      {/* Optional Background Art */}
      {chapter.coverImage && (
        <div className="absolute inset-0 z-0">
          <OptimizedImage
            src={getUploadUrl(chapter.coverImage) || chapter.coverImage}
            alt={chapter.title}
            containerClassName="w-full h-full"
            className="w-full h-full object-cover opacity-10 transition-transform duration-700 group-hover:scale-105 group-hover:opacity-15"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface-card via-surface-card/85 to-transparent" />
        </div>
      )}

      {/* ── Header ── */}
      <div className="mb-4 flex items-start justify-between gap-3 w-full relative z-10">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {/* Index badge */}
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-mono font-bold border ${
              completed
                ? "bg-success/10 border-success/20 text-success"
                : inProgress
                ? "bg-brand-mint/10 border-brand-mint/25 text-brand-mint"
                : locked
                ? "bg-surface-elevated border-border text-text-muted"
                : "bg-surface-elevated border-border text-text-primary"
            }`}
          >
            {String(index + 1).padStart(2, "0")}
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <span className="rounded-md bg-surface-elevated border border-border px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider text-text-muted">
                MODULE {String(index + 1).padStart(2, "0")}
              </span>
              <span
                className={`rounded-md px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider border ${
                  completed
                    ? "border-success/20 bg-success/10 text-success"
                    : inProgress
                    ? "border-brand-mint/20 bg-brand-mint/10 text-brand-mint"
                    : locked
                    ? "border-border bg-surface-elevated/40 text-text-muted"
                    : "border-brand-mint/20 bg-brand-mint/5 text-brand-mint"
                }`}
              >
                {completed
                  ? "Completed"
                  : inProgress
                  ? "In Progress"
                  : locked
                  ? "Locked"
                  : "Available"}
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-heading font-bold text-text-primary tracking-tight leading-snug line-clamp-2 group-hover:text-brand-mint transition-colors">
              {chapter.title}
            </h3>
          </div>
        </div>

        {/* Status Icon */}
        <div
          className={`h-8 w-8 rounded-xl border flex items-center justify-center shrink-0 transition-all ${
            completed
              ? "bg-success/10 border-success/25 text-success"
              : inProgress
              ? "bg-brand-mint/10 border-brand-mint/25 text-brand-mint"
              : locked
              ? "bg-surface-elevated border-border text-text-muted"
              : "bg-surface-elevated border-border text-brand-mint"
          }`}
        >
          {locked ? (
            <Lock className="w-3.5 h-3.5" />
          ) : completed ? (
            <CheckCircle2 className="w-3.5 h-3.5" />
          ) : (
            <PlayCircle className="w-3.5 h-3.5" />
          )}
        </div>
      </div>

      {/* ── Description ── */}
      {chapter.description && (
        <p className="mb-4 flex-1 text-xs font-medium text-text-muted leading-relaxed line-clamp-2 w-full relative z-10">
          {chapter.description}
        </p>
      )}

      {/* ── Progress bar for open/in-progress/completed chapters ── */}
      {!locked && totalClasses > 0 && (
        <div className="mb-4 w-full relative z-10 space-y-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-elevated border border-border/40">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                completed
                  ? "bg-success"
                  : "bg-gradient-to-r from-brand-mint to-brand-yellow"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <div className="flex items-center justify-between gap-2 text-[10px] font-mono font-semibold uppercase tracking-wider w-full border-t border-border pt-3.5 mt-auto relative z-10">
        <div className="flex items-center gap-2 text-text-muted truncate">
          <span className="inline-flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-brand-mint" />
            {completedClasses} / {totalClasses} classes
          </span>
          {formattedDuration && (
            <>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3 text-text-faint" />
                {formattedDuration}
              </span>
            </>
          )}
        </div>

        <span className="inline-flex items-center gap-1 text-brand-mint group-hover:text-text-primary transition-colors shrink-0">
          <span>{locked ? "View" : inProgress ? "Resume" : "Explore"}</span>
          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </span>
      </div>
    </motion.div>
  );
}

export default ChapterCard;
