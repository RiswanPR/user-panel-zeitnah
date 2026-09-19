import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Lock,
  PlayCircle,
} from "lucide-react";
import OptimizedImage from "../ui/OptimizedImage";
import { getUploadUrl } from "../../utils/courseUi";

function ChapterCard({ chapter, index, onOpen }) {
  if (!chapter) return null;
  const locked = Boolean(chapter.locked);
  const completed = Boolean(chapter.completed);
  const completedClasses = chapter.completedClasses || 0;
  const totalClasses = chapter.totalClasses || 0;
  const inProgress = !completed && !locked && completedClasses > 0;
  const progressPercent =
    totalClasses > 0
      ? Math.min(100, Math.round((completedClasses / totalClasses) * 100))
      : 0;

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
      aria-label={`Chapter ${index + 1}: ${chapter.title}. ${
        completed
          ? "Completed"
          : locked
          ? "Locked"
          : inProgress
          ? `${progressPercent}% completed`
          : "Available"
      }`}
      className={`group relative flex h-full w-full flex-col overflow-hidden rounded-2xl border p-5 sm:p-6 text-left transition-all duration-300 cursor-pointer select-none card-subtle focus-ring ${
        completed
          ? "border-success/25 hover:border-success/40 bg-gradient-to-br from-success/5 to-bg-card"
          : inProgress
          ? "border-brand-mint/30 hover:border-brand-mint/50 bg-gradient-to-br from-brand-mint/5 to-bg-card"
          : locked
          ? "border-white/[0.06] hover:border-white/10 opacity-75"
          : "border-white/[0.08] hover:border-brand-mint/30"
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
          <div className="absolute inset-0 bg-gradient-to-t from-bg-card via-bg-card/85 to-transparent" />
        </div>
      )}

      {/* ── Header ── */}
      <div className="mb-4 flex items-start justify-between gap-3 w-full relative z-10">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {/* Index badge */}
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-heading font-extrabold border ${
              completed
                ? "bg-success/10 border-success/20 text-success"
                : inProgress
                ? "bg-brand-mint/10 border-brand-mint/25 text-brand-mint"
                : locked
                ? "bg-white/[0.03] border-white/[0.06] text-text-muted"
                : "bg-white/[0.05] border-white/[0.08] text-white"
            }`}
          >
            {String(index + 1).padStart(2, "0")}
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <span className="rounded-md bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-text-muted">
                Chapter
              </span>
              <span
                className={`rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${
                  completed
                    ? "border-success/20 bg-success/10 text-success"
                    : inProgress
                    ? "border-brand-mint/20 bg-brand-mint/10 text-brand-mint"
                    : locked
                    ? "border-white/[0.08] bg-white/[0.02] text-text-muted"
                    : "border-brand-mint/20 bg-brand-mint/5 text-brand-mint"
                }`}
              >
                {completed
                  ? "Completed"
                  : inProgress
                  ? "In Progress"
                  : locked
                  ? "Locked"
                  : "Open"}
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-heading font-bold text-white tracking-tight leading-snug line-clamp-2 group-hover:text-brand-mint transition-colors">
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
              ? "bg-white/[0.03] border-white/[0.06] text-text-muted"
              : "bg-white/[0.04] border-white/[0.08] text-brand-mint"
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
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
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
      <div className="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-wider w-full border-t border-white/[0.06] pt-3.5 mt-auto relative z-10">
        <span className="inline-flex items-center gap-1.5 text-text-muted">
          <BookOpen className="w-3.5 h-3.5 text-brand-mint" />
          {completedClasses} / {totalClasses} classes
        </span>

        <span className="inline-flex items-center gap-1 text-brand-mint group-hover:text-white transition-colors">
          <span>{locked ? "View" : "Open"}</span>
          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </span>
      </div>
    </motion.div>
  );
}

export default ChapterCard;
