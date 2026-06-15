import {
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiLock,
  FiPlayCircle,
  FiVideo,
} from "react-icons/fi";

import {
  formatDuration,
  getCourseTypeLabel,
  getUploadUrl,
} from "../../utils/courseUi";

function ClassCard({
  cls,
  courseType,
  index,
  onLockedClick,
  onOpen,
}) {
  const thumbnailUrl = getUploadUrl(cls.thumbnail);
  const locked = cls.locked;
  const completed = Boolean(cls.completed);
  const inProgress = !completed && (cls.progressPercent || 0) > 0;

  return (
    <article
      className={`group relative overflow-hidden glass-card p-4 sm:p-5 shadow-xl transition-all duration-300 hover:-translate-y-0.5 w-full ${
        completed
          ? "border-emerald-500/30 hover:border-emerald-500/50 hover:shadow-[0_20px_50px_rgba(16,185,129,0.12)]"
          : "hover:border-[#9fd5b2]/40 hover:shadow-[0_20px_50px_rgba(159,213,178,0.08)]"
      }`}
    >
      {/* Subtle interior edge lighting accent line */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[rgba(159,213,178,0.25)] to-transparent z-20" />

      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between w-full relative z-10">
        <div className="flex flex-col gap-4 sm:flex-row flex-1 min-w-0">
          
          {/* THUMBNAIL GRAPHIC CELL */}
          <div className="relative h-40 w-full overflow-hidden rounded-xl border border-white/[0.04] bg-[#0d2035] sm:h-32 sm:w-48 shrink-0 select-none flex items-center justify-center">
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt={cls.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-103"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[#9fd5b2]">
                {locked ? (
                  <FiLock className="text-2xl opacity-60" />
                ) : completed ? (
                  <FiCheckCircle className="text-2xl text-emerald-400" />
                ) : (
                  <FiVideo className="text-2xl opacity-60" />
                )}
              </div>
            )}

            <div className="absolute left-3 top-3 rounded-md border border-white/[0.1] bg-[#07192a]/80 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/90 backdrop-blur-xs">
              Lesson {String(index + 1).padStart(2, "0")}
            </div>
          </div>

          {/* LECTURE DESCRIPTION METADATA */}
          <div className="flex flex-1 flex-col min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <span className="rounded-lg border border-[rgba(159,213,178,0.25)] bg-[rgba(159,213,178,0.06)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#9fd5b2]">
                {getCourseTypeLabel(courseType)}
              </span>

              {completed ? (
                <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  <FiCheckCircle className="shrink-0" />
                  Completed
                </span>
              ) : (
                <span
                  className={`rounded-lg border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    locked
                      ? "border-[#f6ed4a]/20 bg-[#f6ed4a]/5 text-[#f6ed4a]"
                      : "border-white/[0.08] bg-white/[0.02] text-white/50"
                  }`}
                >
                  {locked ? "Locked" : "Available now"}
                </span>
              )}
            </div>

            <h2 className="text-lg sm:text-xl font-heading font-bold text-white tracking-tight leading-snug truncate">
              {cls.title}
            </h2>

            <p className="mt-2 text-xs sm:text-sm font-medium text-white/50 leading-relaxed line-clamp-2 sm:line-clamp-none">
              {cls.description || "Class structural details will appear here once configuration parameters sync."}
            </p>

            {/* LOWER PILL METRICS FOOTER */}
            <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider text-white/60">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.04] bg-white/[0.01] px-2.5 py-1.5">
                <FiClock className="text-[#9fd5b2] w-3.5 h-3.5" />
                {formatDuration(cls.duration)}
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.04] bg-white/[0.01] px-2.5 py-1.5">
                <FiFileText className="text-[#9fd5b2] w-3.5 h-3.5" />
                {cls.exerciseCount} {cls.exerciseCount === 1 ? "exercise" : "exercises"}
              </span>
            </div>
          </div>
        </div>

        {/* INTERACTIVE WORKSTATION TRIGGER INTERFACE CTA */}
        <button
          type="button"
          onClick={locked ? onLockedClick : onOpen}
          className={`inline-flex w-full lg:w-auto items-center justify-center gap-2 self-start rounded-xl py-3 px-5 text-xs font-extrabold uppercase tracking-wider transition-all duration-150 lg:self-center cursor-pointer select-none border block ${
            locked
              ? "border-[#f6ed4a]/30 bg-[#f6ed4a]/5 text-[#f6ed4a] hover:bg-[#f6ed4a]/10"
              : completed
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15"
              : "bg-[#f6ed4a] border-[#f6ed4a] text-[#07192a] shadow-[0_4px_15px_rgba(246,237,74,0.15)] hover:shadow-[0_4px_20px_rgba(246,237,74,0.25)] hover:scale-[1.01] active:scale-[0.99]"
          }`}
        >
          {locked ? <FiLock className="w-3.5 h-3.5" /> : completed ? <FiCheckCircle className="w-3.5 h-3.5" /> : <FiPlayCircle className="w-3.5 h-3.5" />}
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
    </article>
  );
}

export default ClassCard;
