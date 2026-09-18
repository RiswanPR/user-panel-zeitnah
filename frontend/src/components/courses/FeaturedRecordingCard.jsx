import { useState } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  CheckCircle2,
  HelpCircle,
  Play,
  TrendingUp,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import OptimizedImage from "../ui/OptimizedImage";
import CourseTypeBadge from "./CourseTypeBadge";
import CourseEnquiryModal from "./CourseEnquiryModal";

/**
 * FeaturedRecordingCard
 *
 * The primary hero card for the flagship Recorded Course.
 * Balanced cinematic split-layout on desktop, structured stacked on mobile.
 */
export default function FeaturedRecordingCard({ course }) {
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
  const handleCTA = (e) => {
    e.stopPropagation();
    if (purchased) {
      navigate(`/courses/${course._id}/chapters`);
    } else {
      setEnquiryModalOpen(true);
    }
  };

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        onClick={handleCardClick}
        tabIndex={0}
        role="button"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleCardClick();
          }
        }}
        aria-label={`Featured recorded course: ${course.name}`}
        className="group relative overflow-hidden rounded-2xl border border-white/[0.08] hover:border-brand-mint/30 bg-gradient-to-br from-bg-card via-bg-elevated to-bg-card cursor-pointer transition-all duration-300 focus-ring shadow-md"
      >
        <div className="gradient-line-top" />

        {/* Ambient subtle glows */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-warning/5 blur-[100px]" />
        <div className="pointer-events-none absolute -left-12 bottom-0 h-56 w-56 rounded-full bg-brand-mint/5 blur-[80px]" />

        {/* ── LAYOUT: desktop split / mobile stacked ── */}
        <div className="flex flex-col lg:flex-row lg:min-h-[400px]">

          {/* ── LEFT: Course Image ── */}
          <div className="relative w-full overflow-hidden lg:w-[48%] shrink-0">
            {/* Overlay labels */}
            <div className="absolute left-4 top-4 z-20 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/60 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-white/80 backdrop-blur-md">
                <Sparkles className="w-2.5 h-2.5 text-warning" />
                Featured
              </span>
              <CourseTypeBadge type={course.type} size="sm" prominent />
            </div>

            {/* Cover image */}
            <div className="aspect-video w-full lg:h-full lg:aspect-auto">
              <OptimizedImage
                src={imageUrl}
                alt={course.name}
                eager
                fetchPriority="high"
                containerClassName="h-full w-full"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-bg-card via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-bg-card/30 lg:to-bg-card" />
          </div>

          {/* ── RIGHT: Course Info ── */}
          <div className="relative z-10 flex flex-1 flex-col justify-between p-5 sm:p-7 lg:p-8">

            <div className="space-y-4">
              {/* Status and Title */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                    Flagship Module
                  </span>
                  {(completed || purchased) && (
                    <span
                      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider backdrop-blur-md ${
                        completed
                          ? "border-success/25 bg-success/10 text-success"
                          : "border-brand-mint/20 bg-brand-mint/8 text-brand-mint"
                      }`}
                    >
                      {completed && <CheckCircle2 className="w-2.5 h-2.5" />}
                      {completed ? "Completed" : "Enrolled"}
                    </span>
                  )}
                </div>

                <h2 className="font-heading text-xl sm:text-2xl lg:text-3xl font-extrabold leading-snug tracking-tight text-white line-clamp-2 group-hover:text-brand-mint transition-colors">
                  {course.name}
                </h2>
              </div>

              {/* Description */}
              <p className="text-sm font-medium leading-relaxed text-text-muted line-clamp-2 sm:line-clamp-3">
                {course.description ||
                  "Access comprehensive recorded sessions and master key concepts at your own pace."}
              </p>

              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-text-secondary">
                <span className="inline-flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-brand-mint" />
                  {chapterCount} {chapterCount === 1 ? "Chapter" : "Chapters"}
                </span>
                <span className="w-1 h-1 rounded-full bg-border-default" />
                <span>Self-Paced Learning</span>
              </div>
            </div>

            {/* Progress block for enrolled students */}
            {purchased && (
              <div className="mt-5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
                <div className="mb-2 flex items-center justify-between text-xs font-medium text-text-secondary">
                  <span className="inline-flex items-center gap-1.5">
                    {completed ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                    ) : (
                      <TrendingUp className="w-3.5 h-3.5 text-brand-mint" />
                    )}
                    {completed ? "Completed" : "Learning Progress"}
                  </span>
                  <span className="font-bold text-white">{progress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      completed
                        ? "bg-gradient-to-r from-success to-brand-mint"
                        : "bg-gradient-to-r from-brand-mint to-brand-yellow"
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* CTA Buttons */}
            <div className="mt-6">
              {purchased ? (
                <button
                  type="button"
                  onClick={handleCTA}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-brand-mint text-bg-base font-bold text-xs uppercase tracking-wider shadow-md hover:bg-brand-mint/90 transition-all cursor-pointer"
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
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold uppercase tracking-wider transition-all bg-brand-yellow text-bg-base hover:bg-brand-yellow/90 shadow-sm cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    View Course
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEnquiryModalOpen(true);
                    }}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl py-3 text-xs font-bold uppercase tracking-wider transition-all border border-white/[0.08] bg-white/[0.03] text-white hover:bg-white/[0.06] hover:border-brand-mint/25 cursor-pointer"
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
}
