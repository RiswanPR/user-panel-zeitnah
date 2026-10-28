import { useState, memo } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  CheckCircle2,
  HelpCircle,
  Play,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import OptimizedImage from "../ui/OptimizedImage";
import CourseTypeBadge from "./CourseTypeBadge";
import CourseEnquiryModal from "./CourseEnquiryModal";
import ZeitnahZMotif from "./ZeitnahZMotif";
import { getUploadUrl } from "../../utils/courseUi";
import { useCardSpotlight } from "../../hooks/useCardSpotlight";

/**
 * RecordingCourseCard
 *
 * Editorial card for Recorded Masterclasses in the grid.
 * Directly grounded in the Zeitnah Group of Institution Brand Guideline.
 *
 * Features & Effects:
 * - Dominant 16:9 cinematic aspect ratio container with subtle zoom
 * - Mouse-tracking tactile radial spotlight in Light Mode
 * - High-contrast typography & mint telemetry
 * - Distinct yellow CTA for discovery & mint CTA for active learning
 * - Micro-interactions: lift, image zoom, border brightening
 *
 * @param {object} course - Course object from API
 */
const RecordingCourseCard = memo(function RecordingCourseCard({ course }) {
  const navigate = useNavigate();
  const [enquiryModalOpen, setEnquiryModalOpen] = useState(false);
  const { onMouseMove, onMouseLeave, spotlightStyle } = useCardSpotlight({
    radius: 420,
  });

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
    "https://placehold.co/1920x1080/F5F7F6/12314C?text=Masterclass";

  const handleCardClick = () => navigate(`/courses/${course._id}/chapters`);

  const easePremium = [0.16, 1, 0.3, 1];

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: easePremium }}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        onClick={handleCardClick}
        tabIndex={0}
        role="button"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleCardClick();
          }
        }}
        aria-label={`Masterclass: ${course.name}`}
        className="group relative flex flex-col overflow-hidden rounded-2xl border border-border hover:border-emerald-600/40 dark:hover:border-brand-mint/40 bg-surface-card bg-white dark:bg-surface-card cursor-pointer w-full transition-all duration-300 shadow-xs hover:-translate-y-1 hover:shadow-lg focus-ring select-none"
      >
        {/* Subtle top hairline */}
        <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-brand-mint/35 to-transparent pointer-events-none z-10" />

        {/* ── INTERACTIVE MOUSE SPOTLIGHT (Light Mode Tactile Sheen) ── */}
        <div
          className="pointer-events-none absolute inset-0 z-0"
          style={spotlightStyle}
        />

        {/* Spatial subtle Z watermark */}
        <div className="pointer-events-none absolute -right-6 -bottom-6 w-32 h-32 select-none opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-300 z-0">
          <ZeitnahZMotif variant="white" className="w-full h-full rotate-6" />
        </div>

        {/* ── 16:9 Media Cover ── */}
        <div
          className="relative aspect-video w-full shrink-0 overflow-hidden bg-surface-elevated z-10"
          style={{ aspectRatio: "16 / 9" }}
        >
          <OptimizedImage
            src={imageUrl}
            alt={course.name}
            containerClassName="h-full w-full"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

          {/* Badges */}
          <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-1.5">
            <CourseTypeBadge type={course.type} size="sm" prominent />
            {purchased && (
              <span
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider border backdrop-blur-md ${
                  completed
                    ? "border-brand-mint/30 bg-brand-mint/15 text-emerald-800 dark:text-brand-mint"
                    : "border-amber-500/30 dark:border-brand-yellow/30 bg-amber-500/15 dark:bg-brand-yellow/15 text-amber-800 dark:text-brand-yellow"
                }`}
              >
                {completed ? "Completed" : "Enrolled"}
              </span>
            )}
          </div>
        </div>

        {/* ── Editorial Content Body ── */}
        <div className="relative z-10 flex flex-1 flex-col justify-between p-5 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[10px] font-mono text-text-muted uppercase">
              <BookOpen className="w-3 h-3 text-emerald-800 dark:text-brand-mint" />
              <span>
                {chapterCount} {chapterCount === 1 ? "Chapter" : "Chapters"}
              </span>
              <span className="text-text-faint">•</span>
              <span>Self-Paced</span>
            </div>

            <h3 className="font-heading text-lg font-extrabold text-text-primary tracking-tight leading-snug line-clamp-2 group-hover:text-brand-primary dark:group-hover:text-brand-mint transition-colors">
              {course.name}
            </h3>

            {course.description && (
              <p className="text-xs text-text-secondary leading-relaxed line-clamp-2 font-normal">
                {course.description}
              </p>
            )}
          </div>

          <div className="space-y-3 pt-2 border-t border-border">
            {/* Progress line if enrolled */}
            {purchased && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-mono text-text-muted uppercase">
                  <span>{completed ? "Status" : "Progress"}</span>
                  <span className="font-bold font-mono text-brand-navy dark:text-text-primary">{progress}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-surface-elevated border border-border/40">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-brand-mint dark:from-brand-mint dark:to-brand-mint transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* CTAs */}
            {purchased ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/courses/${course._id}/chapters`);
                }}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-mono font-bold uppercase tracking-wider bg-brand-surface-subtle dark:bg-brand-mint/10 border border-emerald-600/30 dark:border-brand-mint/30 text-brand-primary dark:text-brand-mint hover:bg-brand-primary hover:text-white dark:hover:bg-brand-mint dark:hover:text-brand-navy transition-all cursor-pointer shadow-sm min-h-[44px]"
              >
                {completed ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Review Masterclass
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Continue Masterclass
                    <ArrowRight className="w-3.5 h-3.5 ml-auto" />
                  </>
                )}
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/courses/${course._id}/chapters`);
                  }}
                  className="w-full inline-flex items-center justify-center py-2.5 rounded-xl text-xs font-heading font-extrabold uppercase tracking-wider bg-brand-yellow text-brand-navy hover:bg-brand-yellow/90 shadow-sm hover:shadow-[0_0_20px_rgba(246,237,74,0.35)] transition-all cursor-pointer active:scale-[0.98] min-h-[44px]"
                >
                  View
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEnquiryModalOpen(true);
                  }}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider border border-border bg-surface-elevated text-text-primary hover:bg-surface-card hover:border-brand-mint/40 transition-all cursor-pointer active:scale-[0.98] min-h-[44px]"
                >
                  <HelpCircle className="w-3 h-3 text-emerald-800 dark:text-brand-mint" />
                  Enquire
                </button>
              </div>
            )}
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

export default RecordingCourseCard;
