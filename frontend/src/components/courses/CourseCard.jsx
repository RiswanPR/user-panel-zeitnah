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

/**
 * CourseCard
 *
 * Reusable editorial course card component.
 * Ensures consistent design language across all course views.
 */
const CourseCard = memo(function CourseCard({ course }) {
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
    "https://placehold.co/1920x1080/07090B/FFFFFF?text=Course";

  const handleCardClick = () => navigate(`/courses/${course._id}/chapters`);

  const easePremium = [0.16, 1, 0.3, 1];

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: easePremium }}
        onClick={handleCardClick}
        tabIndex={0}
        role="button"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleCardClick();
          }
        }}
        aria-label={`Course: ${course.name}`}
        className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] hover:border-brand-mint/40 bg-gradient-to-b from-[#0D141A] to-[#0A0F14] cursor-pointer w-full transition-all duration-300 shadow-md hover:-translate-y-1 hover:shadow-2xl focus-ring"
      >
        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-brand-mint/20 to-transparent pointer-events-none" />

        <div className="pointer-events-none absolute -right-6 -bottom-6 w-32 h-32 select-none opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-300">
          <ZeitnahZMotif variant="white" className="w-full h-full rotate-6" />
        </div>

        {/* ── 16:9 Media Cover ── */}
        <div
          className="relative aspect-video w-full shrink-0 overflow-hidden bg-bg-elevated"
          style={{ aspectRatio: "16 / 9" }}
        >
          <OptimizedImage
            src={imageUrl}
            alt={course.name}
            containerClassName="h-full w-full"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0D141A] via-transparent to-transparent pointer-events-none" />

          <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-1.5">
            <CourseTypeBadge type={course.type} size="sm" prominent />
            {purchased && (
              <span
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider border backdrop-blur-md ${
                  completed
                    ? "border-brand-mint/30 bg-brand-mint/15 text-brand-mint"
                    : "border-brand-yellow/30 bg-brand-yellow/15 text-brand-yellow"
                }`}
              >
                {completed ? "Completed" : "Enrolled"}
              </span>
            )}
          </div>
        </div>

        {/* ── Editorial Content Body ── */}
        <div className="flex flex-1 flex-col justify-between p-5 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[10px] font-mono text-text-muted uppercase">
              <BookOpen className="w-3 h-3 text-brand-mint" />
              <span>
                {chapterCount} {chapterCount === 1 ? "Chapter" : "Chapters"}
              </span>
            </div>

            <h3 className="font-heading text-lg font-extrabold text-white tracking-tight leading-snug line-clamp-2 group-hover:text-brand-mint transition-colors">
              {course.name}
            </h3>

            {course.description && (
              <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">
                {course.description}
              </p>
            )}
          </div>

          <div className="space-y-3 pt-2 border-t border-white/[0.06]">
            {purchased && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-mono text-text-muted uppercase">
                  <span>{completed ? "Status" : "Progress"}</span>
                  <span className="font-bold text-white">{progress}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-brand-mint transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {purchased ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/courses/${course._id}/chapters`);
                }}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-mono font-bold uppercase tracking-wider bg-brand-mint/10 border border-brand-mint/30 text-brand-mint hover:bg-brand-mint hover:text-black transition-all cursor-pointer shadow-sm"
              >
                {completed ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Review
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Continue
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
                  className="w-full inline-flex items-center justify-center py-2.5 rounded-xl text-xs font-heading font-extrabold uppercase tracking-wider bg-brand-yellow text-black hover:bg-brand-yellow/90 shadow-sm transition-all cursor-pointer active:scale-[0.98]"
                >
                  View
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEnquiryModalOpen(true);
                  }}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider border border-white/[0.08] bg-white/[0.03] text-white hover:bg-white/[0.07] hover:border-brand-mint/30 transition-all cursor-pointer active:scale-[0.98]"
                >
                  <HelpCircle className="w-3 h-3 text-brand-mint" />
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

export default CourseCard;
