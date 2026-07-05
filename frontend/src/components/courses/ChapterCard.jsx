import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Lock,
  PlayCircle,
} from "lucide-react";

function ChapterCard({ chapter, index, onOpen }) {
  const locked = chapter.locked;
  const completed = Boolean(chapter.completed);
  const completedClasses = chapter.completedClasses || 0;
  const totalClasses = chapter.totalClasses || 0;
  const progressPercent = totalClasses > 0 ? Math.round((completedClasses / totalClasses) * 100) : 0;

  return (
    <motion.button
      type="button"
      onClick={onOpen}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: "easeOut" }}
      className={`group relative flex h-full w-full flex-col overflow-hidden rounded-2xl border p-5 sm:p-6 text-left transition-all duration-300 hover:-translate-y-0.5 cursor-pointer select-none ${
        completed
          ? "bg-gradient-to-br from-success/5 to-bg-card border-success/20 hover:border-success/35 hover:shadow-[0_16px_48px_rgba(16,185,129,0.08)]"
          : locked
          ? "bg-gradient-to-br from-warning/3 to-bg-card border-warning/12 hover:border-warning/25"
          : "bg-gradient-to-br from-bg-card to-bg-surface border-border-default hover:border-brand-mint/25 hover:shadow-[0_16px_48px_rgba(159,213,178,0.06)]"
      }`}
    >
      {/* Gradient accent line */}
      <div className="gradient-line-top z-20" />

      {/* ── Optional Chapter Cover Image ── */}
      {chapter.coverImage && (
        <div className="absolute inset-0 z-0">
          <link rel="preload" as="image" href={chapter.coverImage} fetchPriority="high" />
          <img 
            src={chapter.coverImage} 
            alt={chapter.title} 
            fetchPriority="high"
            decoding="async"
            className="w-full h-full object-cover opacity-10 transition-transform duration-700 group-hover:scale-105 group-hover:opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-bg-card via-bg-card/90 to-transparent" />
        </div>
      )}

      {/* ── Header ── */}
      <div className="mb-4 flex items-start justify-between gap-4 w-full relative z-10">
        <div className="flex items-start gap-3.5 min-w-0 flex-1">

          {/* Index badge */}
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-heading font-extrabold select-none border ${
            completed
              ? "bg-success/10 border-success/20 text-success"
              : locked
              ? "bg-warning/10 border-warning/20 text-warning"
              : "bg-brand-mint/8 border-brand-mint/15 text-brand-mint"
          }`}>
            {String(index + 1).padStart(2, "0")}
          </div>

          {/* Chapter info */}
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <span className="rounded-md bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-text-muted">
                Module
              </span>
              <span
                className={`rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${
                  completed
                    ? "border-success/20 bg-success/10 text-success"
                    : locked
                    ? "border-warning/20 bg-warning/8 text-warning"
                    : "border-brand-mint/20 bg-brand-mint/8 text-brand-mint"
                }`}
              >
                {completed ? "Completed" : locked ? "Locked" : "Open"}
              </span>
            </div>

            <h2 className="text-base sm:text-lg font-heading font-bold text-white tracking-tight leading-snug line-clamp-2">
              {chapter.title}
            </h2>
          </div>
        </div>

        {/* Status icon */}
        <div className={`h-9 w-9 rounded-xl border flex items-center justify-center shrink-0 transition-all ${
          locked
            ? "bg-warning/8 border-warning/15 text-warning"
            : completed
            ? "bg-success/8 border-success/15 text-success"
            : "bg-brand-mint/8 border-brand-mint/15 text-brand-mint"
        }`}>
          {locked ? (
            <Lock className="w-4 h-4" />
          ) : completed ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <PlayCircle className="w-4 h-4" />
          )}
        </div>
      </div>

      {/* ── Description ── */}
      <p className="mb-5 flex-1 text-sm font-medium text-text-muted leading-relaxed line-clamp-2 w-full relative z-10">
        {chapter.description || "Chapter content and learning objectives will appear here."}
      </p>

      {/* ── Progress bar (for open/completed chapters) ── */}
      {!locked && totalClasses > 0 && (
        <div className="mb-4 w-full relative z-10">
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
              className={`h-full rounded-full ${
                completed
                  ? "bg-gradient-to-r from-success to-brand-mint"
                  : "bg-gradient-to-r from-brand-mint to-brand-yellow"
              }`}
            />
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-wider w-full border-t border-white/[0.04] pt-4 mt-auto relative z-10">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05] px-2.5 py-1.5 text-text-muted">
          <BookOpen className="w-3.5 h-3.5 text-brand-mint" />
          {completedClasses} / {totalClasses} lessons
        </span>

        <span className="inline-flex items-center gap-1.5 text-brand-mint group-hover:text-white transition-colors duration-200">
          <span>View lessons</span>
          <ArrowRight className="w-3 h-3 transition-transform duration-200 group-hover:translate-x-0.5" />
        </span>
      </div>
    </motion.button>
  );
}

export default ChapterCard;
