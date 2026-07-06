import { motion } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  FileText,
  Lock,
  PlayCircle,
  Video,
} from "lucide-react";
import { formatDuration, getCourseTypeLabel } from "../../utils/courseUi";

function ClassCard({ cls, courseType, index, onLockedClick, onOpen }) {
  const thumbnailUrl = cls.coverImage;
  const locked = cls.locked;
  const completed = Boolean(cls.completed);
  const inProgress = !completed && (cls.progressPercent || 0) > 0;
  const progressPercent = cls.progressPercent || 0;

  // Color-coded left border based on status
  const statusBorderColor = completed
    ? "border-l-success"
    : inProgress
    ? "border-l-info"
    : locked
    ? "border-l-warning"
    : "border-l-brand-mint/30";

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: "easeOut" }}
      className={`group relative overflow-hidden rounded-2xl border border-l-[3px] transition-all duration-300 hover:-translate-y-0.5 w-full ${statusBorderColor} ${
        completed
          ? "bg-gradient-to-r from-success/3 to-bg-card border-success/15 hover:border-success/30"
          : "bg-bg-card border-border-default hover:border-brand-mint/20 hover:shadow-[0_12px_40px_rgba(159,213,178,0.05)]"
      }`}
    >
      <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between w-full relative z-10">
        <div className="flex flex-col gap-4 sm:flex-row flex-1 min-w-0">

          {/* ── Thumbnail ── */}
          <div className="relative h-36 w-full overflow-hidden rounded-xl border border-white/[0.04] bg-bg-elevated sm:h-28 sm:w-44 shrink-0 select-none flex items-center justify-center">
            {thumbnailUrl ? (
              <>
                <link rel="preload" as="image" href={thumbnailUrl} fetchPriority="high" />
                <img
                  src={thumbnailUrl}
                  alt={cls.title}
                  fetchPriority="high"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </>
            ) : (
              <div className="flex h-full w-full items-center justify-center text-text-muted">
                {locked ? (
                  <Lock className="w-6 h-6 opacity-50" />
                ) : completed ? (
                  <CheckCircle2 className="w-6 h-6 text-success" />
                ) : (
                  <Video className="w-6 h-6 opacity-50" />
                )}
              </div>
            )}

            {/* Lesson number overlay */}
            <div className="absolute left-2.5 top-2.5 rounded-lg bg-bg-base/80 border border-white/[0.08] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/90 backdrop-blur-md">
              Lesson {String(index + 1).padStart(2, "0")}
            </div>

            {/* Progress overlay for in-progress */}
            {inProgress && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/[0.06]">
                <div
                  className="h-full bg-gradient-to-r from-info to-brand-mint"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            )}
          </div>

          {/* ── Info ── */}
          <div className="flex flex-1 flex-col min-w-0">
            {/* Badges */}
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <span className="rounded-lg border border-brand-mint/20 bg-brand-mint/8 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-mint">
                {getCourseTypeLabel(courseType)}
              </span>

              {completed ? (
                <span className="inline-flex items-center gap-1 rounded-lg border border-success/20 bg-success/8 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success">
                  <CheckCircle2 className="w-3 h-3" />
                  Completed
                </span>
              ) : (
                <span
                  className={`rounded-lg border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    locked
                      ? "border-warning/20 bg-warning/8 text-warning"
                      : inProgress
                      ? "border-info/20 bg-info/8 text-info"
                      : "border-white/[0.06] bg-white/[0.03] text-text-muted"
                  }`}
                >
                  {locked ? "Locked" : inProgress ? "In Progress" : "Available"}
                </span>
              )}
            </div>

            <h2 className="text-lg sm:text-xl font-heading font-bold text-white tracking-tight leading-snug line-clamp-2">
              {cls.title}
            </h2>

            <p className="mt-1.5 text-sm font-medium text-text-muted leading-relaxed line-clamp-2">
              {cls.description || "Class content and learning material details."}
            </p>

            {/* Meta pills */}
            <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05] px-2.5 py-1.5">
                <Clock className="w-3.5 h-3.5 text-brand-mint" />
                {formatDuration(cls.duration)}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05] px-2.5 py-1.5">
                <FileText className="w-3.5 h-3.5 text-brand-mint" />
                {cls.exerciseCount} {cls.exerciseCount === 1 ? "exercise" : "exercises"}
              </span>
            </div>
          </div>
        </div>

        {/* ── CTA Button ── */}
        <button
          type="button"
          onClick={locked ? onLockedClick : onOpen}
          className={`inline-flex w-full lg:w-auto items-center justify-center gap-2 self-start rounded-xl py-3 px-5 text-xs font-bold uppercase tracking-wider transition-all duration-200 lg:self-center cursor-pointer select-none border ${
            locked
              ? "border-warning/25 bg-warning/8 text-warning hover:bg-warning/12"
              : completed
              ? "border-success/25 bg-success/8 text-success hover:bg-success/12"
              : "bg-brand-yellow border-brand-yellow text-bg-base hover:shadow-[0_4px_20px_rgba(246,237,74,0.15)] hover:translate-y-[-1px] active:scale-[0.98]"
          }`}
        >
          {locked ? <Lock className="w-3.5 h-3.5" /> : completed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <PlayCircle className="w-3.5 h-3.5" />}
          <span>
            {locked
              ? "Unlock to watch"
              : completed
              ? "Rewatch Class"
              : inProgress
              ? "Continue"
              : "Watch Class"}
          </span>
        </button>
      </div>
    </motion.article>
  );
}

export default ClassCard;
