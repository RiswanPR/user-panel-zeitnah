import { memo } from "react";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Play, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import OptimizedImage from "../ui/OptimizedImage";
import ZeitnahZMotif from "./ZeitnahZMotif";
import { getUploadUrl } from "../../utils/courseUi";

/**
 * ContinueLearning
 *
 * Ultra-premium flagship "Continue Learning" media card.
 * Designed to feel like a standalone product hero.
 * Uses 100% authentic API telemetry — no fabricated numbers or durations.
 *
 * @param {object} course – The most-in-progress enrolled course
 */
const ContinueLearning = memo(function ContinueLearning({ course }) {
  const navigate = useNavigate();

  if (
    !course ||
    !course.learningProgress ||
    (course.learningProgress.completionPercent ?? 0) <= 0
  ) {
    return null;
  }

  const { name, coverImage, _id, learningProgress, chapters, type } = course;
  const progress = Math.min(
    100,
    Math.max(0, Math.round(learningProgress.completionPercent ?? 0))
  );
  const isCompleted = progress >= 100;

  // Real last-accessed chapter lookup from API data
  const lastChapter = learningProgress.lastAccessedChapter
    ? chapters?.find((ch) => ch._id === learningProgress.lastAccessedChapter) || null
    : chapters?.[0] || null;

  const imageUrl =
    getUploadUrl(coverImage) ||
    coverImage ||
    "https://placehold.co/1920x1080/07090B/FFFFFF?text=Course";

  const handleContinue = () => navigate(`/courses/${_id}/chapters`);

  const easePremium = [0.16, 1, 0.3, 1];

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: easePremium }}
      aria-label="Continue Learning Active Track"
      className="w-full space-y-3"
    >
      {/* ── Section Header / Eyebrow ── */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-brand-yellow" />
          <h2 className="text-[11px] sm:text-xs font-mono font-bold tracking-[0.2em] uppercase text-white">
            CONTINUE LEARNING
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-brand-mint">
            {progress}%
          </span>
          <span className="text-[11px] font-mono text-text-muted uppercase">
            {isCompleted ? "COMPLETED" : "IN PROGRESS"}
          </span>
        </div>
      </div>

      {/* ── Flagship Horizontal Media Card ── */}
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
        className="group relative overflow-hidden rounded-3xl border border-white/[0.08] hover:border-brand-mint/35 bg-gradient-to-r from-[#0D141A] via-[#0A0F14] to-[#12314C]/30 p-5 sm:p-7 lg:p-8 cursor-pointer transition-all duration-300 shadow-xl focus-ring"
      >
        {/* Subtle Top Accent Hairline */}
        <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-brand-mint/40 to-transparent pointer-events-none" />

        {/* Ambient Glows */}
        <div className="pointer-events-none absolute -left-20 -top-20 w-64 h-64 rounded-full bg-brand-mint/8 blur-[80px]" />
        <div className="pointer-events-none absolute -right-20 -bottom-20 w-64 h-64 rounded-full bg-brand-yellow/6 blur-[90px]" />

        {/* Spatial Z Motif Watermark */}
        <div className="pointer-events-none absolute right-4 sm:right-12 -bottom-10 w-64 h-64 select-none opacity-[0.04] group-hover:opacity-[0.07] transition-opacity duration-500">
          <ZeitnahZMotif variant="white" className="w-full h-full rotate-[-8deg]" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6 lg:gap-8 w-full">
          {/* ── 16:9 Cinematic Image Container ── */}
          <div
            className="relative w-full md:w-64 lg:w-72 aspect-video rounded-2xl overflow-hidden bg-bg-elevated border border-white/[0.08] shrink-0"
            style={{ aspectRatio: "16 / 9" }}
          >
            <OptimizedImage
              src={imageUrl}
              alt={name}
              eager
              containerClassName="h-full w-full"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            {/* Cinematic dark gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

            {/* Play badge / completion icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-black/50 border border-white/20 backdrop-blur-md flex items-center justify-center group-hover:bg-brand-yellow group-hover:border-brand-yellow transition-all duration-300 shadow-lg">
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5 text-white group-hover:text-black transition-colors" />
                ) : (
                  <Play className="w-5 h-5 text-white group-hover:text-black fill-current ml-0.5 transition-colors" />
                )}
              </div>
            </div>
          </div>

          {/* ── Editorial Content Column ── */}
          <div className="flex-1 min-w-0 space-y-4 w-full">
            <div className="space-y-2">
              {/* Type & Real Chapter breadcrumb */}
              <div className="flex flex-wrap items-center gap-2 text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-[0.16em]">
                <span className="inline-flex items-center gap-1.5 text-brand-mint">
                  <BookOpen className="w-3.5 h-3.5" />
                  {String(type || "").trim().toLowerCase() === "recording"
                    ? "RECORDED MASTERCLASS"
                    : "ONLINE COHORT"}
                </span>
                {lastChapter && (
                  <>
                    <span className="text-white/20">•</span>
                    <span className="text-text-muted truncate max-w-[280px]">
                      {lastChapter.title || lastChapter.name}
                    </span>
                  </>
                )}
              </div>

              {/* Course Title */}
              <h3 className="font-heading text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight leading-tight line-clamp-2 group-hover:text-brand-mint transition-colors">
                {name}
              </h3>
            </div>

            {/* Mint Progress Line & Telemetry */}
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center justify-between text-xs font-mono font-semibold">
                <span className="text-text-muted uppercase tracking-wider text-[10px]">
                  TRACK TELEMETRY
                </span>
                <span className="text-brand-mint">
                  {progress}% COMPLETED
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-brand-mint transition-all duration-700 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          {/* ── Brand Yellow Primary CTA ── */}
          <div className="w-full md:w-auto shrink-0 pt-2 md:pt-0">
            <button
              type="button"
              tabIndex={-1}
              className="w-full md:w-auto inline-flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl bg-brand-yellow text-black font-heading font-extrabold text-xs uppercase tracking-wider shadow-lg hover:bg-brand-yellow/90 group-hover:shadow-[0_0_24px_rgba(246,237,74,0.3)] transition-all cursor-pointer select-none active:scale-[0.98]"
            >
              <span>{isCompleted ? "REVIEW COURSE" : "CONTINUE LEARNING"}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </motion.section>
  );
});

export default ContinueLearning;
