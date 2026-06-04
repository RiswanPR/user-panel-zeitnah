import {
  FiArrowRight,
  FiBookOpen,
  FiLock,
  FiPlayCircle,
} from "react-icons/fi";

function ChapterCard({
  chapter,
  index,
  onOpen,
}) {
  const locked = chapter.locked;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative flex h-full w-full flex-col overflow-hidden rounded-[30px] border border-white/[0.08] bg-[#101010]/95 p-6 text-left shadow-[0_24px_80px_rgba(0,0,0,0.26)] transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400/20 hover:shadow-[0_28px_90px_rgba(34,211,238,0.12)]"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent opacity-60" />

      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-gradient-to-br from-cyan-500/18 via-[#111111] to-violet-500/18 text-sm font-semibold text-cyan-100">
            {String(index + 1).padStart(2, "0")}
          </div>

          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs font-medium text-white/65">
                Module
              </span>

              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  locked
                    ? "border-yellow-400/20 bg-yellow-500/10 text-yellow-200"
                    : "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                }`}
              >
                {locked ? "Locked" : "Open"}
              </span>
            </div>

            <h2 className="text-xl font-semibold text-white">
              {chapter.title}
            </h2>
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3 text-cyan-300">
          {locked ? <FiLock className="text-lg" /> : <FiPlayCircle className="text-lg" />}
        </div>
      </div>

      <p className="mb-6 flex-1 text-sm leading-7 text-white/55">
        {chapter.description || "Chapter details will appear here once they are added."}
      </p>

      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-white/65">
          <FiBookOpen className="text-cyan-300" />
          {chapter.totalClasses} {chapter.totalClasses === 1 ? "class" : "classes"}
        </span>

        <span className="inline-flex items-center gap-2 font-medium text-cyan-200">
          View lessons
          <FiArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
        </span>
      </div>
    </button>
  );
}

export default ChapterCard;
