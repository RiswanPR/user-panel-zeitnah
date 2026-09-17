import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Play, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import OptimizedImage from "../ui/OptimizedImage";

/**
 * ContinueLearning
 *
 * Personalized "Continue Learning" banner.
 * Only renders when `course.learningProgress.completionPercent > 0`.
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
  const progress = learningProgress.completionPercent ?? 0;

  // Determine last-viewed chapter if the data exists
  const lastChapter = learningProgress.lastAccessedChapter
    ? chapters?.find((ch) => ch._id === learningProgress.lastAccessedChapter) ||
      null
    : null;

  const imageUrl =
    coverImage ||
    "https://placehold.co/800x450/0A0D14/FFFFFF?text=Course";

  const handleContinue = () => navigate(`/courses/${_id}/chapters`);

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      aria-label="Continue Learning"
    >
      {/* Section eyebrow */}
      <div className="mb-4 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-brand-mint">
          <span className="block w-4 h-px bg-brand-mint/60" />
          Continue Learning
          <span className="block w-4 h-px bg-brand-mint/60" />
        </span>
      </div>

      {/* Banner card */}
      <div className="continue-learning-banner group cursor-pointer" onClick={handleContinue}>
        {/* Ambient glow */}
        <div className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-brand-mint/8 blur-[80px]" />
        <div className="pointer-events-none absolute -bottom-12 right-8 h-40 w-40 rounded-full bg-warning/5 blur-[60px]" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-5 p-5 sm:p-6">

          {/* Thumbnail */}
          <div className="relative w-full sm:w-40 md:w-48 shrink-0 aspect-video sm:aspect-auto sm:h-28 rounded-xl overflow-hidden bg-bg-elevated">
            <OptimizedImage
              src={imageUrl}
              alt={name}
              eager
              containerClassName="h-full w-full"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            {/* Overlay with play icon */}
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/15 transition-colors duration-300 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-brand-mint/20 border border-brand-mint/40 flex items-center justify-center backdrop-blur-sm group-hover:bg-brand-mint/30 transition-all duration-300 group-hover:scale-110">
                <Play className="w-4 h-4 text-brand-mint fill-current ml-0.5" />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 flex flex-col gap-3">
            {/* Course type + title */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-text-muted">
                  <BookOpen className="w-2.5 h-2.5" />
                  {String(type || "").trim().toLowerCase() === "recording"
                    ? "Recording Class"
                    : "Online Class"}
                </span>
                {lastChapter && (
                  <>
                    <span className="w-px h-3 bg-border-default" />
                    <span className="text-[9px] font-medium text-text-muted truncate max-w-[160px]">
                      {lastChapter.title || lastChapter.name || ""}
                    </span>
                  </>
                )}
              </div>
              <h2 className="font-heading text-base sm:text-xl font-extrabold leading-tight tracking-tight text-white line-clamp-1 group-hover:text-brand-mint/90 transition-colors duration-300">
                {name}
              </h2>
            </div>

            {/* Progress */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <TrendingUp className="w-3 h-3 text-brand-mint" />
                  Your Progress
                </span>
                <span className="font-bold text-white text-xs">{progress}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1.1, ease: "easeOut", delay: 0.3 }}
                  className="h-full rounded-full bg-gradient-to-r from-warning/70 via-brand-mint to-brand-mint"
                />
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="w-full sm:w-auto shrink-0">
            <button
              type="button"
              id={`continue-learning-cta-${_id}`}
              onClick={(e) => {
                e.stopPropagation();
                handleContinue();
              }}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2.5 rounded-xl border border-brand-mint/25 bg-brand-mint/10 px-5 py-3 text-xs font-bold uppercase tracking-wider text-brand-mint transition-all duration-200 hover:bg-brand-mint/18 hover:border-brand-mint/40 hover:shadow-[0_4px_20px_rgba(159,213,178,0.15)] active:scale-[0.98] cursor-pointer select-none whitespace-nowrap"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Continue Learning
              <ArrowRight className="w-3.5 h-3.5 opacity-60" />
            </button>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
