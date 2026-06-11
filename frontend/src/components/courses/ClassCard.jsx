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
      className={`group relative overflow-hidden rounded-[30px] border bg-[#101010]/95 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.28)] transition-all duration-300 hover:-translate-y-1 sm:p-5 ${
        completed
          ? "border-emerald-400/25 hover:border-emerald-400/40 hover:shadow-[0_28px_90px_rgba(52,211,153,0.14)]"
          : "border-white/[0.08] hover:border-cyan-400/20 hover:shadow-[0_28px_90px_rgba(34,211,238,0.12)]"
      }`}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent opacity-60" />

      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative h-40 w-full overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#0c1418] sm:h-32 sm:w-48">
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt={cls.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-cyan-500/18 via-[#121212] to-violet-500/18 text-cyan-200">
                {locked ? (
                  <FiLock className="text-3xl" />
                ) : completed ? (
                  <FiCheckCircle className="text-3xl text-emerald-300" />
                ) : (
                  <FiVideo className="text-3xl" />
                )}
              </div>
            )}

            <div className="absolute left-3 top-3 rounded-full border border-white/[0.14] bg-[#090909]/75 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur">
              Lesson {String(index + 1).padStart(2, "0")}
            </div>
          </div>

          <div className="flex flex-1 flex-col">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-200">
                {getCourseTypeLabel(courseType)}
              </span>

              {completed ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200">
                  <FiCheckCircle />
                  Completed
                </span>
              ) : (
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    locked
                      ? "border-yellow-400/20 bg-yellow-500/10 text-yellow-200"
                      : "border-cyan-400/20 bg-cyan-500/10 text-cyan-200"
                  }`}
                >
                  {locked ? "Locked" : "Available now"}
                </span>
              )}
            </div>

            <h2 className="text-xl font-semibold text-white sm:text-[1.35rem]">
              {cls.title}
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/55 sm:text-[0.95rem]">
              {cls.description || "Class details will appear here once they are added."}
            </p>

            <div className="mt-4 flex flex-wrap gap-3 text-sm text-white/60">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-2">
                <FiClock className="text-cyan-300" />
                {formatDuration(cls.duration)}
              </span>

              <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-2">
                <FiFileText className="text-cyan-300" />
                {cls.exerciseCount} {cls.exerciseCount === 1 ? "exercise" : "exercises"}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={locked ? onLockedClick : onOpen}
          className={`inline-flex items-center justify-center gap-2 self-start rounded-2xl border px-5 py-3 text-sm font-medium transition-all xl:self-center ${
            locked
              ? "border-yellow-400/20 bg-yellow-500/10 text-yellow-200 hover:bg-yellow-500/15"
              : completed
                ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-200 hover:shadow-[0_18px_45px_rgba(52,211,153,0.14)]"
              : "border-cyan-400/20 bg-gradient-to-r from-cyan-500/12 to-violet-500/12 text-cyan-200 hover:shadow-[0_18px_45px_rgba(34,211,238,0.14)]"
          }`}
        >
          {locked ? <FiLock /> : completed ? <FiCheckCircle /> : <FiPlayCircle />}
          {locked
            ? "Unlock to watch"
            : completed
              ? "Rewatch Class"
              : inProgress
                ? "Continue"
                : "Watch Class"}
        </button>
      </div>
    </article>
  );
}

export default ClassCard;
