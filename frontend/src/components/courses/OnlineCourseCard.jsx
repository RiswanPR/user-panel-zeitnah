import { useState } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  CheckCircle2,
  HelpCircle,
  TrendingUp,
  Video,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import OptimizedImage from "../ui/OptimizedImage";
import CourseTypeBadge from "./CourseTypeBadge";
import CourseEnquiryModal from "./CourseEnquiryModal";

/**
 * OnlineCourseCard
 *
 * Standard card for Online Courses. Polished but visually secondary
 * compared to the Recording course cards. Same functionality as before.
 */
export default function OnlineCourseCard({ course }) {
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
        transition={{ duration: 0.4, ease: "easeOut" }}
        onClick={handleCardClick}
        className={`group relative flex flex-col overflow-hidden rounded-2xl border cursor-pointer w-full
          transition-all duration-300 hover:-translate-y-1
          ${
            completed
              ? "bg-gradient-to-b from-bg-card to-bg-surface border-success/20 hover:border-success/35 hover:shadow-[0_20px_60px_rgba(16,185,129,0.08)]"
              : "bg-gradient-to-b from-bg-card to-bg-surface border-border-default hover:border-brand-mint/25 hover:shadow-[0_20px_60px_rgba(159,213,178,0.06)]"
          }`}
        aria-label={`Online course: ${course.name}`}
      >
        <div className="gradient-line-top" />

        {/* ── Cover Image ── */}
        <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-bg-elevated">
          <OptimizedImage
            src={imageUrl}
            alt={course.name}
            containerClassName="h-full w-full"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-bg-card via-bg-card/40 to-transparent" />

          {/* Badges */}
          <div className="absolute left-3.5 top-3.5 z-10 flex flex-wrap gap-1.5">
            <CourseTypeBadge type={course.type} size="sm" />
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
          <div className="absolute inset-x-0 bottom-0 z-10 p-4 sm:p-5">
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
              "Explore this course to discover structured learning modules and content."}
          </p>

          {/* Meta pills */}
          <div className="mt-4 flex items-center gap-3 text-text-muted">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium">
              <BookOpen className="w-3.5 h-3.5 text-brand-mint" />
              {chapterCount} {chapterCount === 1 ? "chapter" : "chapters"}
            </span>
            <div className="h-3 w-px bg-border-default" />
            <span className="inline-flex items-center gap-1.5 text-xs font-medium">
              <Video className="w-3.5 h-3.5 text-brand-mint" />
              Online Class
            </span>
          </div>

          {/* Progress */}
          <div
            className={`mt-4 rounded-xl border p-3.5 flex flex-col w-full ${
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
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className={`h-full rounded-full ${
                  completed
                    ? "bg-gradient-to-r from-success to-brand-mint"
                    : "bg-gradient-to-r from-brand-mint to-brand-yellow"
                }`}
              />
            </div>
          </div>

          {/* CTA */}
          {purchased ? (
            <button
              type="button"
              id={`online-card-cta-${course._id}`}
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/courses/${course._id}/chapters`);
              }}
              className={`mt-4 inline-flex w-full items-center justify-center rounded-xl py-3 text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer select-none border active:scale-[0.98]
                ${
                  completed
                    ? "border-success/25 bg-success/8 text-success hover:bg-success/12"
                    : "bg-white/[0.03] border-border-default text-white hover:bg-white/[0.06] hover:border-brand-mint/25"
                }`}
            >
              {completed ? "Review Course" : "Continue Learning"}
            </button>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                id={`online-card-explore-${course._id}`}
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
                id={`online-card-enquire-${course._id}`}
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
