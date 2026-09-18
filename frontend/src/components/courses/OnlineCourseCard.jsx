import { useState } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  Play,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import OptimizedImage from "../ui/OptimizedImage";
import CourseTypeBadge from "./CourseTypeBadge";
import CourseEnquiryModal from "./CourseEnquiryModal";

/**
 * OnlineCourseCard
 *
 * Card for Online / Scheduled Courses, engineered to fit uniformly
 * in the horizontal carousel or grid.
 */
export default function OnlineCourseCard({ course, compact = false }) {
  const navigate = useNavigate();
  const [enquiryModalOpen, setEnquiryModalOpen] = useState(false);

  const progress = Math.min(100, Math.max(0, Math.round(course.learningProgress?.completionPercent ?? 0)));
  const purchased =
    !!course.learningProgress ||
    !!course.purchased ||
    !!course.isPurchased ||
    !!course.isEnrolled;
  const completed = purchased && progress >= 100;
  const chapterCount = course.chapters?.length ?? 0;
  const imageUrl =
    course.coverImage ||
    "https://placehold.co/1920x1080/0A0D14/FFFFFF?text=Course+Cover";

  const handleCardClick = () => navigate(`/courses/${course._id}/chapters`);

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        onClick={handleCardClick}
        tabIndex={0}
        role="button"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleCardClick();
          }
        }}
        aria-label={`Online course: ${course.name}`}
        className={`carousel-card group relative flex flex-col overflow-hidden rounded-2xl border cursor-pointer w-full h-full card-subtle focus-ring ${
          completed
            ? "border-success/20 hover:border-success/35"
            : "border-white/[0.08] hover:border-brand-mint/30"
        }`}
      >
        <div className="gradient-line-top" />

        {/* ── Cover Image (16:9) ── */}
        <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-bg-elevated">
          <OptimizedImage
            src={imageUrl}
            alt={course.name}
            containerClassName="h-full w-full"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-bg-card via-transparent to-transparent" />

          {/* Badges */}
          <div className="absolute left-3.5 top-3.5 z-10 flex flex-wrap gap-1.5">
            <CourseTypeBadge type={course.type || "online"} size="sm" />
            {purchased && (
              <CourseTypeBadge
                status={completed ? "completed" : "enrolled"}
                size="sm"
              />
            )}
          </div>
        </div>

        {/* ── Card Body ── */}
        <div className="flex flex-1 flex-col justify-between p-4 sm:p-5 gap-3">
          <div className="space-y-2">
            <h3 className="font-heading text-base font-bold leading-snug tracking-tight text-white line-clamp-2 group-hover:text-brand-mint transition-colors">
              {course.name}
            </h3>

            {!compact && course.description && (
              <p className="text-xs font-medium leading-relaxed text-text-muted line-clamp-2">
                {course.description}
              </p>
            )}
          </div>

          <div className="space-y-3 pt-1">
            {/* Meta */}
            <div className="flex items-center gap-3 text-xs font-semibold text-text-muted">
              <span className="inline-flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-brand-mint" />
                {chapterCount} {chapterCount === 1 ? "Chapter" : "Chapters"}
              </span>
              <span className="w-1 h-1 rounded-full bg-border-default" />
              <span>Interactive</span>
            </div>

            {/* Progress bar if enrolled */}
            {purchased && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-medium text-text-secondary">
                  <span>{completed ? "Completed" : "Progress"}</span>
                  <span className="font-bold text-white">{progress}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      completed
                        ? "bg-success"
                        : "bg-gradient-to-r from-brand-mint to-brand-yellow"
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {purchased ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/courses/${course._id}/chapters`);
                }}
                className={`w-full inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                  completed
                    ? "border-success/25 bg-success/8 text-success hover:bg-success/15"
                    : "border-brand-mint/25 bg-brand-mint/10 text-brand-mint hover:bg-brand-mint/20"
                }`}
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
                    <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-70" />
                  </>
                )}
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/courses/${course._id}/chapters`);
                  }}
                  className="w-full inline-flex items-center justify-center py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all bg-brand-yellow text-bg-base hover:bg-brand-yellow/90 cursor-pointer"
                >
                  View
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEnquiryModalOpen(true);
                  }}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border border-white/[0.08] bg-white/[0.03] text-white hover:bg-white/[0.07] cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-brand-mint" />
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
}
