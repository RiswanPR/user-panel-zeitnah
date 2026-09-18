import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import OptimizedImage from "../ui/OptimizedImage";

/**
 * ContinueLearning
 *
 * Flagship "Continue Learning" banner.
 * Prioritizes the user's most in-progress enrolled course.
 * Uses 100% real API data — no invented chapter numbers, timestamps, or progress.
 *
 * @param {object} course – The most-in-progress enrolled course
 */
export default function ContinueLearning({ course }) {
  const navigate = useNavigate();

  if (
    !course ||
    !course.learningProgress ||
    course.learningProgress.completionPercent <= 0
  ) {
    return null;
  }

  const { name, coverImage, _id, learningProgress, chapters, type } = course;
  const progress = Math.min(100, Math.max(0, Math.round(learningProgress.completionPercent ?? 0)));

  // Determine last-viewed chapter if real data exists
  const lastChapter = learningProgress.lastAccessedChapter
    ? chapters?.find((ch) => ch._id === learningProgress.lastAccessedChapter) || null
    : chapters?.[0] || null;

  const imageUrl =
    coverImage || "https://placehold.co/800x450/0A0D14/FFFFFF?text=Course";

  const handleContinue = () => navigate(`/courses/${_id}/chapters`);

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      aria-label="Continue Learning Active Course"
      className="w-full"
    >
      {/* Eyebrow */}
      <div className="mb-3 flex items-center justify-between">
        <div className="inline-flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-mint" />
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-mint">
            Continue Learning
          </span>
        </div>
        <span className="text-xs font-semibold text-text-muted">
          {progress}% completed
        </span>
      </div>

      {/* Banner card */}
      <div
        onClick={handleContinue}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleContinue();
          }
        }}
        aria-label={`Resume learning ${name}`}
        className="continue-learning-banner group cursor-pointer border border-white/[0.08] hover:border-brand-mint/30 transition-all duration-300 focus-ring"
      >
        {/* Ambient subtle glow */}
        <div className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-brand-mint/6 blur-[80px]" />
        <div className="pointer-events-none absolute -bottom-16 right-10 h-48 w-48 rounded-full bg-info/4 blur-[70px]" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-5 p-5 sm:p-6 w-full">

          {/* Thumbnail */}
          <div className="relative w-full sm:w-44 md:w-52 shrink-0 aspect-video rounded-xl overflow-hidden bg-bg-elevated border border-white/[0.06]">
            <OptimizedImage
              src={imageUrl}
              alt={name}
              eager
              containerClassName="h-full w-full"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            {/* Play badge overlay */}
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/15 transition-colors duration-300 flex items-center justify-center">
              <div className="w-11 h-11 rounded-full bg-brand-mint/20 border border-brand-mint/40 flex items-center justify-center backdrop-blur-sm group-hover:bg-brand-mint/30 group-hover:scale-105 transition-all">
                <Play className="w-4 h-4 text-brand-mint fill-current ml-0.5" />
              </div>
            </div>
          </div>

          {/* Content info */}
          <div className="flex-1 min-w-0 flex flex-col justify-between gap-3 w-full">
            <div className="space-y-1.5">
              {/* Type and Chapter breadcrumb */}
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                <span className="inline-flex items-center gap-1 text-brand-mint">
                  <BookOpen className="w-3 h-3" />
                  {String(type || "").trim().toLowerCase() === "recording"
                    ? "Recorded Class"
                    : "Online Class"}
                </span>
                {lastChapter && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-border-default" />
                    <span className="truncate max-w-[220px]">
                      {lastChapter.title || lastChapter.name}
                    </span>
                  </>
                )}
              </div>

              {/* Course Title */}
              <h2 className="font-heading text-lg sm:text-xl md:text-2xl font-extrabold text-white tracking-tight leading-snug line-clamp-1 group-hover:text-brand-mint transition-colors">
                {name}
              </h2>
            </div>

            {/* Progress bar and metrics */}
            <div className="space-y-2 w-full max-w-xl">
              <div className="flex items-center justify-between text-xs font-medium text-text-secondary">
                <span>Course Progress</span>
                <span className="font-bold text-white">{progress}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-mint to-brand-yellow transition-all duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Primary Action Button */}
          <div className="w-full sm:w-auto shrink-0 pt-2 sm:pt-0">
            <button
              type="button"
              tabIndex={-1}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-brand-mint text-bg-base font-bold text-xs uppercase tracking-wider shadow-md hover:bg-brand-mint/90 group-hover:shadow-[0_0_20px_rgba(159,213,178,0.25)] transition-all cursor-pointer select-none"
            >
              <span>Resume Lesson</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

        </div>
      </div>
    </motion.section>
  );
}
