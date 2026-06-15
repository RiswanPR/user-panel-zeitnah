import {
  FiArrowRight,
  FiBookOpen,
  FiCheckCircle,
  FiLock,
  FiPlayCircle,
} from "react-icons/fi";

function ChapterCard({
  chapter,
  index,
  onOpen,
}) {
  const locked = chapter.locked;
  const completed = Boolean(chapter.completed);
  const completedClasses = chapter.completedClasses || 0;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group relative flex h-full w-full flex-col overflow-hidden glass-card p-5 sm:p-6 text-left shadow-xl transition-all duration-300 hover:-translate-y-0.5 cursor-pointer select-none ${
        completed
          ? "border-emerald-500/30 hover:border-emerald-500/50 hover:shadow-[0_20px_50px_rgba(16,185,129,0.12)]"
          : "hover:border-[#9fd5b2]/40 hover:shadow-[0_20px_50px_rgba(159,213,178,0.08)]"
      }`}
    >
      {/* Subtle interior edge lighting top architectural accent line */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[rgba(159,213,178,0.25)] to-transparent z-20" />

      {/* HEADER SECTION WRAPPER */}
      <div className="mb-4 flex items-start justify-between gap-4 w-full relative z-10">
        <div className="flex items-start gap-3.5 min-w-0 flex-1">
          
          {/* Index Counter Badge Box */}
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgba(7,25,42,0.6)] border border-white/[0.05] text-xs font-heading font-black text-white/90 select-none">
            {String(index + 1).padStart(2, "0")}
          </div>

          {/* Module Information Details Block */}
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <span className="rounded-md border border-white/[0.08] bg-white/[0.02] px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/50 select-none">
                Module
              </span>

              <span
                className={`rounded-lg border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider select-none ${
                  completed
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                    : locked
                    ? "border-[#f6ed4a]/20 bg-[#f6ed4a]/5 text-[#f6ed4a]"
                    : "border-[rgba(159,213,178,0.25)] bg-[rgba(159,213,178,0.06)] text-[#9fd5b2]"
                }`}
              >
                {completed ? "Completed" : locked ? "Locked" : "Open"}
              </span>
            </div>

            <h2 className="text-base sm:text-lg font-heading font-bold text-white tracking-tight leading-snug truncate">
              {chapter.title}
            </h2>
          </div>
        </div>

        {/* Functional Icon Capsule Node State Identifier */}
        <div className={`h-9 w-9 rounded-xl border flex items-center justify-center shrink-0 transition-colors select-none ${
          locked 
            ? "bg-[#f6ed4a]/5 border-[#f6ed4a]/15 text-[#f6ed4a]" 
            : completed 
            ? "bg-emerald-500/5 border-emerald-500/15 text-emerald-400" 
            : "bg-[rgba(159,213,178,0.06)] border-[rgba(159,213,178,0.15)] text-[#9fd5b2]"
        }`}>
          {locked ? (
            <FiLock className="text-sm" />
          ) : completed ? (
            <FiCheckCircle className="text-sm" />
          ) : (
            <FiPlayCircle className="text-sm" />
          )}
        </div>
      </div>

      {/* Description Body Paragraph Module */}
      <p className="mb-5 flex-1 text-xs sm:text-sm font-medium text-white/50 leading-relaxed line-clamp-3 sm:line-clamp-none w-full relative z-10">
        {chapter.description || "Chapter operational specifications will load here once configuration parameters sync."}
      </p>

      {/* FOOTER PARAMETER ROWS MAPS - Fully responsive fluid structure */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-wider w-full border-t border-white/[0.04] pt-4 mt-auto relative z-10">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.04] bg-white/[0.01] px-2.5 py-1.5 text-white/60 select-none">
          <FiBookOpen className="text-[#9fd5b2] w-3.5 h-3.5" />
          {completedClasses} / {chapter.totalClasses} completed
        </span>

        <span className="inline-flex items-center gap-1.5 text-[#9fd5b2] group-hover:text-white transition-colors duration-200">
          <span>View lessons</span>
          <FiArrowRight className="text-xs transition-transform duration-200 group-hover:translate-x-0.5" />
        </span>
      </div>
    </button>
  );
}

export default ChapterCard;
