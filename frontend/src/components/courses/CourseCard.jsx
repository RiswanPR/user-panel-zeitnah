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
      className={`group overflow-hidden rounded-[32px] border bg-[#101010]/95 shadow-[0_24px_80px_rgba(0,0,0,0.26)] transition-all duration-300 hover:-translate-y-1 ${
        completed
          ? "border-emerald-400/25 hover:border-emerald-400/40 hover:shadow-[0_28px_90px_rgba(52,211,153,0.14)]"
          : "border-white/[0.08] hover:border-cyan-400/20 hover:shadow-[0_28px_90px_rgba(34,211,238,0.14)]"
      }`}
    >
      <div className="relative h-56 overflow-hidden">
        <img
          src={imageUrl}
          alt={course.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-[#0f0f0f]/35 to-transparent" />

        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <span
            className={`rounded-full border px-3 py-1 text-xs font-medium backdrop-blur ${
              isRecording
                ? "border-violet-400/20 bg-violet-500/10 text-violet-200"
                : "border-cyan-400/20 bg-cyan-500/10 text-cyan-200"
            }`}
          >
            {getCourseTypeLabel(course.type)}
          </span>

          <span
            className={`rounded-full border px-3 py-1 text-xs font-medium backdrop-blur ${
              completed
                ? "border-emerald-300/30 bg-emerald-500/15 text-emerald-100"
                : purchased
                ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                : "border-white/[0.12] bg-black/35 text-white/75"
            }`}
          >
            {completed ? "Completed" : purchased ? "Enrolled" : "Available"}
          </span>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-white/45">
            Course
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">
            {course.name}
          </h2>
        </div>
      </div>

      <div className="p-5">
        <p className="text-sm leading-7 text-white/55">
          {course.description || "No description has been added to this course yet."}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3">
            <div className="mb-2 inline-flex items-center gap-2 text-cyan-200">
              <FiBookOpen />
              <span className="text-xs uppercase tracking-[0.18em] text-white/40">
                Structure
              </span>
            </div>

            <p className="text-sm text-white/75">
              {chapterCount} {chapterCount === 1 ? "chapter" : "chapters"}
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3">
            <div className="mb-2 inline-flex items-center gap-2 text-cyan-200">
              {isRecording ? <FiPlay /> : <FiVideo />}
              <span className="text-xs uppercase tracking-[0.18em] text-white/40">
                Format
              </span>
            </div>

            <p className="text-sm text-white/75">
              {getCourseTypeLabel(course.type)}
            </p>
          </div>
        </div>

        <div
          className={`mt-5 rounded-[24px] border p-4 ${
            completed
              ? "border-emerald-400/20 bg-emerald-500/10"
              : "border-white/[0.08] bg-black/20"
          }`}
        >
          <div className="mb-3 flex items-center justify-between text-xs text-white/45">
            <span className="inline-flex items-center gap-2">
              {completed ? (
                <FiCheckCircle className="text-emerald-300" />
              ) : (
                <FiTrendingUp className="text-cyan-300" />
              )}
              {completed ? "Course Completed 🎉" : purchased ? "Your progress" : "Start progress"}
            </span>
            <span>{progress}%</span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                completed
                  ? "bg-gradient-to-r from-emerald-400 to-cyan-300"
                  : "bg-gradient-to-r from-cyan-400 via-sky-300 to-violet-400"
              }`}
              style={{
                width: `${progress}%`,
              }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate(`/courses/${course._id}/chapters`)}
          className={`mt-5 inline-flex w-full items-center justify-center rounded-2xl border px-4 py-3 text-sm font-medium transition-all ${
            completed
              ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-200 hover:shadow-[0_18px_45px_rgba(52,211,153,0.14)]"
              : "border-cyan-400/20 bg-gradient-to-r from-cyan-500/12 to-violet-500/12 text-cyan-200 hover:shadow-[0_18px_45px_rgba(34,211,238,0.14)]"
          }`}
        >
          {completed ? "Review Course" : purchased ? "Continue Learning" : "Explore Course"}
        </button>
      </div>
    </article>
  );
}

export default CourseCard;
