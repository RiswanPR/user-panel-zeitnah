import { motion } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  FileText,
  Lock,
  Play,
  Video,
} from "lucide-react";
import { formatDuration, getCourseTypeLabel } from "../../utils/courseUi";
import OptimizedImage from "../ui/OptimizedImage";

function ClassCard({ cls, courseType, index, onLockedClick, onOpen }) {
  const thumbnailUrl = cls.coverImage;
  const locked = Boolean(cls.locked);
  const completed = Boolean(cls.completed);
  const inProgress = !completed && (cls.progressPercent || 0) > 0;
  const progressPercent = cls.progressPercent || 0;

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04, ease: "easeOut" }}
      className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 w-full card-subtle focus-ring ${
        completed
          ? "border-success/25 hover:border-success/40 bg-gradient-to-r from-success/5 to-bg-card"
          : inProgress
          ? "border-brand-mint/30 hover:border-brand-mint/50 bg-gradient-to-r from-brand-mint/5 to-bg-card"
          : locked
          ? "border-white/[0.06] hover:border-white/10 opacity-75"
          : "border-white/[0.08] hover:border-brand-mint/30"
      }`}
    >
      <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between w-full relative z-10">
        <div className="flex flex-col gap-4 sm:flex-row flex-1 min-w-0">

          {/* ── Thumbnail (16:9 on mobile/tablet) ── */}
          <div
            onClick={locked ? onLockedClick : onOpen}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                locked ? onLockedClick() : onOpen();
              }
            }}
            className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/[0.06] bg-bg-elevated sm:w-44 shrink-0 select-none flex items-center justify-center cursor-pointer focus-ring"
          >
            {thumbnailUrl ? (
              <OptimizedImage
                src={thumbnailUrl}
                alt={cls.title}
                containerClassName="h-full w-full"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-text-muted">
                {locked ? (
                  <Lock className="w-5 h-5 opacity-40" />
                ) : completed ? (
                  <CheckCircle2 className="w-5 h-5 text-success" />
                ) : (
                  <Video className="w-5 h-5 opacity-40" />
                )}
              </div>
            )}

            {/* Play badge overlay */}
            <div className="absolute inset-0 bg-black/25 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <div className="w-9 h-9 rounded-full bg-black/50 border border-white/20 flex items-center justify-center backdrop-blur-sm group-hover:scale-105 transition-all">
                {locked ? (
                  <Lock className="w-3.5 h-3.5 text-white/70" />
                ) : (
                  <Play className="w-3.5 h-3.5 text-brand-mint fill-current ml-0.5" />
                )}
              </div>
            </div>

            {/* Lesson order tag */}
            <div className="absolute left-2 top-2 rounded-md bg-black/70 border border-white/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/90 backdrop-blur-md">
              Lesson {String(index + 1).padStart(2, "0")}
            </div>

            {/* Progress overlay */}
            {inProgress && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/[0.1]">
                <div
                  className="h-full bg-gradient-to-r from-brand-mint to-brand-yellow"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            )}
          </div>

          {/* ── Info ── */}
          <div className="flex flex-1 flex-col min-w-0 justify-center">
            {/* Status pills */}
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <span className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-text-muted">
                {getCourseTypeLabel(courseType)}
              </span>

              {completed ? (
                <span className="inline-flex items-center gap-1 rounded-md border border-success/25 bg-success/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-success">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  Completed
                </span>
              ) : inProgress ? (
                <span className="rounded-md border border-brand-mint/25 bg-brand-mint/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brand-mint">
                  {progressPercent}% watched
                </span>
              ) : locked ? (
                <span className="inline-flex items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.02] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-text-muted">
                  <Lock className="w-2.5 h-2.5" />
                  Locked
                </span>
              ) : (
                <span className="rounded-md border border-brand-mint/20 bg-brand-mint/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brand-mint">
                  Available
                </span>
              )}
            </div>

            {/* Title */}
            <h3
              onClick={locked ? onLockedClick : onOpen}
              className="text-base sm:text-lg font-heading font-bold text-white tracking-tight leading-snug line-clamp-2 cursor-pointer group-hover:text-brand-mint transition-colors"
            >
              {cls.title}
            </h3>

            {cls.description && (
              <p className="mt-1 text-xs font-medium text-text-muted leading-relaxed line-clamp-2">
                {cls.description}
              </p>
            )}

            {/* Metadata (duration + exercises) */}
            <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              {cls.duration && (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-white/[0.03] border border-white/[0.05] px-2 py-1">
                  <Clock className="w-3 h-3 text-brand-mint" />
                  {formatDuration(cls.duration)}
                </span>
              )}
              {cls.exerciseCount > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-white/[0.03] border border-white/[0.05] px-2 py-1">
                  <FileText className="w-3 h-3 text-brand-mint" />
                  {cls.exerciseCount} {cls.exerciseCount === 1 ? "Resource" : "Resources"}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Action Button ── */}
        <div className="shrink-0 w-full lg:w-auto pt-2 lg:pt-0">
          <button
            type="button"
            onClick={locked ? onLockedClick : onOpen}
            className={`w-full lg:w-auto inline-flex items-center justify-center gap-2 rounded-xl py-2.5 px-5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border focus-ring ${
              locked
                ? "border-white/[0.08] bg-white/[0.03] text-text-muted hover:text-white"
                : completed
                ? "border-success/25 bg-success/10 text-success hover:bg-success/15"
                : inProgress
                ? "bg-brand-mint text-bg-base font-extrabold hover:bg-brand-mint/90 shadow-sm"
                : "bg-brand-yellow text-bg-base font-extrabold hover:bg-brand-yellow/90 shadow-sm"
            }`}
          >
            {locked ? (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>Locked</span>
              </>
            ) : completed ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Rewatch</span>
              </>
            ) : inProgress ? (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Continue</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Watch</span>
              </>
            )}
          </button>
        </div>
      </div>
    </motion.article>
  );
}

export default ClassCard;
