import { useState, memo } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  CheckCircle2,
  HelpCircle,
  Play,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import OptimizedImage from "../ui/OptimizedImage";
import CourseTypeBadge from "./CourseTypeBadge";
import CourseEnquiryModal from "./CourseEnquiryModal";
import ZeitnahZMotif from "./ZeitnahZMotif";
import { getUploadUrl } from "../../utils/courseUi";

/**
 * FeaturedRecordingCard
 *
 * Flagship Recorded Masterclass experience.
 * Features:
 * - 16:9 cinematic aspect ratio container with subtle zoom
 * - Deep navy (#12314C) / deep charcoal (#0A0F14) content architecture
 * - Oversized typography & mint metadata
 * - Brand Yellow (#F6ED4A) primary action CTA
 * - Authentic chapter count, enrollment detection, and completion percentage
 * - Subdued spatial organic Z brand watermark
 *
 * @param {object} course - Featured recorded course
 */
const FeaturedRecordingCard = memo(function FeaturedRecordingCard({ course }) {
  const navigate = useNavigate();
  const [enquiryModalOpen, setEnquiryModalOpen] = useState(false);

  if (!course) return null;

  const progress = Math.min(
    100,
    Math.max(0, Math.round(course.learningProgress?.completionPercent ?? 0))
  );
  const purchased =
    !!course.learningProgress ||
    !!course.purchased ||
    !!course.isPurchased ||
    !!course.isEnrolled;
  const completed = purchased && progress >= 100;
  const chapterCount = course.chapters?.length ?? 0;

  const imageUrl =
    getUploadUrl(course.coverImage) ||
    course.coverImage ||
    "https://placehold.co/1920x1080/07090B/FFFFFF?text=Masterclass";

  const handleCardClick = () => navigate(`/courses/${course._id}/chapters`);

  const handleCTA = (e) => {
    e.stopPropagation();
    if (purchased) {
      navigate(`/courses/${course._id}/chapters`);
    } else {
      setEnquiryModalOpen(true);
    }
  };

  const easePremium = [0.16, 1, 0.3, 1];

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: easePremium }}
        onClick={handleCardClick}
        tabIndex={0}
        role="button"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleCardClick();
          }
        }}
        aria-label={`Featured masterclass: ${course.name}`}
        className="group relative overflow-hidden rounded-3xl border border-white/[0.08] hover:border-brand-mint/40 bg-gradient-to-br from-[#0D141A] via-[#0A0F14] to-[#12314C]/40 cursor-pointer transition-all duration-300 shadow-2xl focus-ring"
      >
        {/* Subtle accent hairline */}
        <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-brand-mint/40 to-transparent pointer-events-none" />

        {/* Ambient Glows */}
        <div className="pointer-events-none absolute -right-24 -top-24 w-80 h-80 rounded-full bg-brand-yellow/8 blur-[100px]" />
        <div className="pointer-events-none absolute -left-12 bottom-0 w-72 h-72 rounded-full bg-brand-mint/8 blur-[90px]" />

        {/* Spatial Z Motif watermark */}
        <div className="pointer-events-none absolute right-4 bottom-4 w-72 h-72 select-none opacity-[0.035] group-hover:opacity-[0.06] transition-opacity duration-500">
          <ZeitnahZMotif variant="gradient" className="w-full h-full rotate-12" />
        </div>

        {/* ── LAYOUT: 16:9 Media Left / Editorial Content Right ── */}
        <div className="flex flex-col lg:flex-row items-stretch">
          {/* ── MEDIA CONTAINER (Strict 16:9) ── */}
          <div
            className="relative w-full lg:w-1/2 shrink-0 aspect-video overflow-hidden bg-bg-elevated"
            style={{ aspectRatio: "16 / 9" }}
          >
            {/* Top Badges */}
            <div className="absolute left-4 top-4 z-20 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-brand-yellow/30 bg-[#07090B]/80 px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-brand-yellow backdrop-blur-md shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-yellow" />
                FLAGSHIP MASTERCLASS
              </span>
              <CourseTypeBadge type={course.type} size="sm" prominent />
            </div>

            {/* Cinematic Cover Image */}
            <OptimizedImage
              src={imageUrl}
              alt={course.name}
              eager
              fetchPriority="high"
              containerClassName="h-full w-full"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />

            {/* Dark gradient overlay blending with panel */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0F14] via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-[#0A0F14]/40 lg:to-[#0A0F14] pointer-events-none" />
          </div>

          {/* ── EDITORIAL CONTENT PANEL ── */}
          <div className="relative z-10 flex flex-1 flex-col justify-between p-6 sm:p-8 lg:p-10 space-y-6">
            <div className="space-y-4">
              {/* Telemetry Status & Chapter Count */}
              <div className="flex items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">
                    CURRICULUM SPEC
                  </span>
                  {purchased && (
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${
                        completed
                          ? "border-brand-mint/30 bg-brand-mint/10 text-brand-mint"
                          : "border-brand-yellow/30 bg-brand-yellow/10 text-brand-yellow"
                      }`}
                    >
                      {completed && <CheckCircle2 className="w-2.5 h-2.5" />}
                      {completed ? "Completed" : "Enrolled"}
                    </span>
                  )}
                </div>

                <div className="inline-flex items-center gap-1.5 text-brand-mint font-semibold">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>
                    {chapterCount} {chapterCount === 1 ? "Chapter" : "Chapters"}
                  </span>
                </div>
              </div>

              {/* Course Title */}
              <h3 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-[1.05] line-clamp-2 group-hover:text-brand-mint transition-colors">
                {course.name}
              </h3>

              {/* Description */}
              <p className="text-xs sm:text-sm font-medium leading-relaxed text-text-secondary line-clamp-3">
                {course.description ||
                  "Master advanced modular concepts and production architecture with comprehensive hands-on instruction."}
              </p>
            </div>

            {/* Progress section if enrolled */}
            {purchased && (
              <div className="rounded-2xl border border-white/[0.08] bg-[#07090B]/60 p-4 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="inline-flex items-center gap-1.5 text-text-muted text-[10px] uppercase">
                    <TrendingUp className="w-3.5 h-3.5 text-brand-mint" />
                    Course Progress
                  </span>
                  <span className="font-bold text-white">{progress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-brand-mint transition-all duration-700 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* ── ACTION CTAs ── */}
            <div className="pt-2">
              {purchased ? (
                <button
                  type="button"
                  onClick={handleCTA}
                  className="w-full inline-flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-brand-yellow text-black font-heading font-extrabold text-xs uppercase tracking-wider shadow-lg hover:bg-brand-yellow/90 group-hover:shadow-[0_0_24px_rgba(246,237,74,0.3)] transition-all cursor-pointer active:scale-[0.98]"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>{completed ? "Review Course" : "Continue Learning"}</span>
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/courses/${course._id}/chapters`);
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl py-3.5 px-4 text-xs font-heading font-extrabold uppercase tracking-wider bg-brand-yellow text-black hover:bg-brand-yellow/90 shadow-md transition-all cursor-pointer active:scale-[0.98]"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    View Course
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEnquiryModalOpen(true);
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl py-3.5 px-4 text-xs font-mono font-bold uppercase tracking-wider border border-white/[0.1] bg-white/[0.03] text-white hover:bg-white/[0.07] hover:border-brand-mint/40 transition-all cursor-pointer active:scale-[0.98]"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-brand-mint" />
                    Enquire
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.article>

      <CourseEnquiryModal
        isOpen={enquiryModalOpen}
        onClose={() => setEnquiryModalOpen(false)}
        course={course}
      />
    </>
  );
});

export default FeaturedRecordingCard;
