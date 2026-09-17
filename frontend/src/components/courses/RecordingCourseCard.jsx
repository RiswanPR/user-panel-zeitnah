import { useState } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  CheckCircle2,
  HelpCircle,
  Play,
  TrendingUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import OptimizedImage from "../ui/OptimizedImage";
import CourseTypeBadge from "./CourseTypeBadge";
import CourseEnquiryModal from "./CourseEnquiryModal";

/**
 * RecordingCourseCard
 *
 * Secondary premium card for additional Recording Courses (after the featured one).
 * Visually elevated compared to OnlineCourseCard but lighter than FeaturedRecordingCard.
 */
export default function RecordingCourseCard({ course }) {
  const navigate = useNavigate();
  const [enquiryModalOpen, setEnquiryModalOpen] = useState(false);

  const progress = course.learningProgress?.completionPercent ?? 0;
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
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        onClick={handleCardClick}
        className={`group relative flex flex-col overflow-hidden rounded-2xl border cursor-pointer w-full
          transition-all duration-400
          hover:-translate-y-1.5
          ${
            completed
              ? "bg-gradient-to-b from-bg-card to-bg-surface border-success/15 hover:border-success/30 hover:shadow-[0_16px_48px_rgba(16,185,129,0.08)]"
              : "bg-gradient-to-b from-bg-card to-bg-surface border-warning/15 hover:border-warning/30 hover:shadow-[0_16px_48px_rgba(245,158,11,0.08),0_4px_16px_rgba(0,0,0,0.3)]"
          }`}
        aria-label={`Recording course: ${course.name}`}
      >
        {/* Amber-to-mint top gradient line */}
        <div
          className="absolute top-0 left-0 right-0 h-px z-20 pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(245,158,11,0.35) 50%, transparent 100%)",
          }}
        />

        {/* Subtle amber ambient glow */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-warning/5 blur-[60px]" />

        {/* ── Cover Image ── */}
        <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-bg-elevated">
          <OptimizedImage
            src={imageUrl}
            alt={course.name}
            eager
            containerClassName="h-full w-full"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-bg-card via-bg-card/40 to-transparent" />

          {/* Badges */}
          <div className="absolute left-3.5 top-3.5 z-10 flex flex-wrap gap-1.5">
            <CourseTypeBadge type={course.type} size="sm" prominent />
            <span
              className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider backdrop-blur-md ${
                completed
                  ? "border-success/25 bg-success/10 text-success"
                  : purchased
                  ? "border-brand-mint/20 bg-brand-mint/8 text-brand-mint"
                  : "border-white/8 bg-white/5 text-text-secondary"
              }`}
            >
              {completed ? "Completed" : purchased ? "Enrolled" : "Available"}
            </span>
          </div>

          {/* Course name on image */}
          <div className="absolute inset-x-0 bottom-0 z-10 p-4">
            <p className="mb-0.5 text-[9px] font-semibold uppercase tracking-widest text-text-muted">
              Course
            </p>
            <h3 className="font-heading text-base font-extrabold leading-tight tracking-tight text-white line-clamp-2 sm:text-lg">
              {course.name}
            </h3>
          </div>
        </div>

        {/* ── Card Body ── */}
        <div className="flex flex-1 flex-col justify-between p-4 sm:p-5">
          <p className="text-sm font-medium leading-relaxed text-text-muted line-clamp-2">
            {course.description ||
              "Complete recorded sessions available for self-paced learning."}
          </p>

          {/* Meta row */}
          <div className="mt-3.5 flex items-center gap-3 text-text-muted">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium">
              <BookOpen className="w-3.5 h-3.5 text-brand-mint" />
              {chapterCount} {chapterCount === 1 ? "chapter" : "chapters"}
            </span>
            <div className="h-3 w-px bg-border-default" />
            <span className="inline-flex items-center gap-1.5 text-xs font-medium">
              <Play className="w-3.5 h-3.5 text-warning opacity-80 fill-warning" />
              Recording Class
            </span>
          </div>

          {/* Progress */}
          <div
            className={`mt-4 rounded-xl border p-3.5 ${
              completed
                ? "border-success/15 bg-success/5"
                : "border-white/[0.04] bg-white/[0.02]"
            }`}
          >
            <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              <span className="inline-flex items-center gap-1.5">
                {completed ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                ) : (
                  <TrendingUp className="w-3.5 h-3.5 text-brand-mint" />
                )}
                {completed
                  ? "Course Completed"
                  : purchased
                  ? "Your Progress"
                  : "Start Progress"}
              </span>
              <span className="font-bold text-white">{progress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.9, ease: "easeOut" }}
                className={`h-full rounded-full ${
                  completed
                    ? "bg-gradient-to-r from-success to-brand-mint"
                    : "bg-gradient-to-r from-warning/70 via-brand-mint to-brand-mint"
                }`}
              />
            </div>
          </div>

          {/* CTA */}
          {purchased ? (
            <button
              type="button"
              id={`recording-card-cta-${course._id}`}
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/courses/${course._id}/chapters`);
              }}
              className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer select-none border active:scale-[0.98]
                ${
                  completed
                    ? "border-success/25 bg-success/8 text-success hover:bg-success/12"
                    : "border-warning/20 bg-warning/5 text-warning hover:bg-warning/10 hover:border-warning/30"
                }`}
            >
              {completed ? (
                <><CheckCircle2 className="w-3.5 h-3.5" /> Review Course</>
              ) : (
                <><Play className="w-3.5 h-3.5 fill-current" /> Continue Learning</>
              )}
            </button>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                id={`recording-card-explore-${course._id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/courses/${course._id}/chapters`);
                }}
                className="inline-flex w-full items-center justify-center rounded-xl py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer select-none border bg-brand-yellow border-brand-yellow text-bg-base hover:shadow-[0_4px_20px_rgba(246,237,74,0.2)] active:scale-[0.98]"
              >
                Explore
              </button>
              <button
                type="button"
                id={`recording-card-enquire-${course._id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setEnquiryModalOpen(true);
                }}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer select-none border border-border-default bg-white/[0.03] text-white hover:bg-white/[0.08] hover:border-brand-mint/25 active:scale-[0.98]"
              >
                <HelpCircle className="w-3.5 h-3.5 text-brand-mint" />
                Enquire
              </button>
            </div>
          )}
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
