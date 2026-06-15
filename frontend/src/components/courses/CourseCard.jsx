import {
  FiBookOpen,
  FiCheckCircle,
  FiPlay,
  FiTrendingUp,
  FiVideo,
} from "react-icons/fi";

import { useNavigate } from "react-router-dom";

import {
  getCourseTypeLabel,
  getUploadUrl,
} from "../../utils/courseUi";

function CourseCard({
  course,
}) {
  const navigate = useNavigate();

  const progress = course.learningProgress?.completionPercent || 0;
  const purchased = !!course.learningProgress;
  const completed = purchased && progress >= 100;
  const isRecording = course.type === "Recording";
  const imageUrl = getUploadUrl(course.image) || "https://placehold.co/600x400";
  const chapterCount = course.chapters?.length || 0;

  return (
    <article
      className={`group overflow-hidden glass-card shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col relative w-full ${
        completed
          ? "border-emerald-500/30 hover:border-emerald-500/50 hover:shadow-[0_20px_50px_rgba(16,185,129,0.12)]"
          : "hover:border-[#9fd5b2]/40 hover:shadow-[0_20px_50px_rgba(159,213,178,0.08)]"
      }`}
    >
      {/* Subtle interior edge lighting accent line */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[rgba(159,213,178,0.25)] to-transparent z-20" />

      {/* MEDIA BANNER MODULE */}
      <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-[#0d2035] shrink-0 select-none">
        <img
          src={imageUrl}
          alt={course.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-103"
        />

        {/* Gradated visual shield text protections */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#07192a] via-[#07192a]/40 to-transparent z-10" />

        {/* BADGES DISPLAY LAYER */}
        <div className="absolute left-4 top-4 flex flex-wrap gap-1.5 z-20">
          <span
            className={`rounded-lg border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-xs ${
              isRecording
                ? "border-amber-500/20 bg-amber-500/10 text-amber-400"
                : "border-[rgba(159,213,178,0.25)] bg-[rgba(159,213,178,0.06)] text-[#9fd5b2]"
            }`}
          >
            {getCourseTypeLabel(course.type)}
          </span>

          <span
            className={`rounded-lg border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-xs ${
              completed
                ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
                : purchased
                ? "border-[rgba(159,213,178,0.25)] bg-[rgba(159,213,178,0.06)] text-[#9fd5b2]"
                : "border-white/[0.08] bg-white/[0.02] text-white/50"
            }`}
          >
            {completed ? "Completed" : purchased ? "Enrolled" : "Available"}
          </span>
        </div>

        {/* BOTTOM METADATA CONTAINER INSIDE OVERLAY */}
        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 z-20 flex flex-col justify-end">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
            Course Module
          </p>
          <h2 className="mt-1 font-heading font-black text-lg sm:text-xl text-white tracking-tight leading-tight truncate">
            {course.name}
          </h2>
        </div>
      </div>

      {/* CORE BODY INFO BLOCK */}
      <div className="p-4 sm:p-5 flex flex-col flex-1 justify-between w-full">
        <p className="text-xs sm:text-sm font-medium text-white/50 leading-relaxed line-clamp-3">
          {course.description || "No specific configuration roadmap summary appended to this catalog context yet."}
        </p>

        {/* METRICS SPECIFICATION GRID */}
        <div className="mt-5 grid grid-cols-2 gap-2.5 w-full">
          <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-3 flex flex-col">
            <div className="mb-1.5 flex items-center gap-1.5 text-[#9fd5b2]">
              <FiBookOpen className="text-xs shrink-0" />
              <span className="text-[9px] font-bold uppercase tracking-wider text-white/30">
                Structure
              </span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-white/90 truncate">
              {chapterCount} {chapterCount === 1 ? "chapter" : "chapters"}
            </p>
          </div>

          <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-3 flex flex-col">
            <div className="mb-1.5 flex items-center gap-1.5 text-[#9fd5b2]">
              {isRecording ? <FiPlay className="text-xs shrink-0" /> : <FiVideo className="text-xs shrink-0" />}
              <span className="text-[9px] font-bold uppercase tracking-wider text-white/30">
                Format
              </span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-white/90 truncate">
              {getCourseTypeLabel(course.type)}
            </p>
          </div>
        </div>

        {/* PROGRESS SYSTEM VISUAL RENDER PIPELINE */}
        <div
          className={`mt-4 rounded-xl border p-3.5 flex flex-col w-full ${
            completed
              ? "border-emerald-500/20 bg-emerald-500/5"
              : "border-white/[0.04] bg-white/[0.01]"
          }`}
        >
          <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-white/40">
            <span className="inline-flex items-center gap-1.5">
              {completed ? (
                <FiCheckCircle className="text-emerald-400 text-xs shrink-0" />
              ) : (
                <FiTrendingUp className="text-[#9fd5b2] text-xs shrink-0" />
              )}
              {completed ? "Course Completed 🎉" : purchased ? "Your Progress" : "Start Progress"}
            </span>
            <span className="font-bold text-white">{progress}%</span>
          </div>

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${
                completed
                  ? "bg-gradient-to-r from-emerald-400 to-[#9fd5b2]"
                  : "bg-gradient-to-r from-[#9fd5b2] to-[#f6ed4a]"
              }`}
              style={{
                width: `${progress}%`,
              }}
            />
          </div>
        </div>

        {/* ACTION CALL PIPELINE ROUTE INTERACTIVE CTAS */}
        <button
          type="button"
          onClick={() => navigate(`/courses/${course._id}/chapters`)}
          className={`mt-4 inline-flex w-full items-center justify-center rounded-xl py-3 text-xs font-extrabold uppercase tracking-wider transition-all duration-150 cursor-pointer select-none border block ${
            completed
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15"
              : purchased
              ? "bg-white/[0.03] border-white/[0.08] text-white hover:bg-white/[0.06] hover:border-[rgba(159,213,178,0.25)]"
              : "bg-[#f6ed4a] border-[#f6ed4a] text-[#07192a] hover:shadow-[0_4px_15px_rgba(246,237,74,0.2)] active:scale-[0.99]"
          }`}
        >
          {completed ? "Review Course" : purchased ? "Continue Learning" : "Explore Course"}
        </button>
      </div>
    </article>
  );
}

export default CourseCard;
