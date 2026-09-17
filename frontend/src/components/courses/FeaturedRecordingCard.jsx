import { useState } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  CheckCircle2,
  HelpCircle,
  Play,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import OptimizedImage from "../ui/OptimizedImage";
import CourseTypeBadge from "./CourseTypeBadge";
import CourseEnquiryModal from "./CourseEnquiryModal";

/**
 * FeaturedRecordingCard
 *
 * The primary hero card for the top Recording Course.
 * Desktop: split left-image / right-info layout.
 * Mobile: stacked full-width layout.
 */
export default function FeaturedRecordingCard({ course }) {
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
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        onClick={handleCardClick}
        className="group relative overflow-hidden rounded-2xl border border-brand-mint/15 bg-gradient-to-br from-bg-card via-bg-elevated to-bg-card cursor-pointer
          transition-all duration-500
          hover:border-brand-mint/30
          hover:shadow-[0_12px_60px_rgba(159,213,178,0.12),0_4px_20px_rgba(0,0,0,0.4)]
          hover:-translate-y-1"
        aria-label={`Featured recording course: ${course.name}`}
      >
        {/* Gradient accent line */}
        <div className="gradient-line-top" />

        {/* Ambient glow top-right */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-warning/6 blur-[80px]" />
        <div className="pointer-events-none absolute -left-12 bottom-0 h-48 w-48 rounded-full bg-brand-mint/4 blur-[60px]" />

        {/* ── FEATURED label ── */}
        <div className="absolute left-0 top-0 z-20 px-4 pt-4 lg:hidden">
          <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-black/40 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white/50 backdrop-blur-md">
            Featured
          </span>
        </div>

        {/* ── LAYOUT: desktop split / mobile stacked ── */}
        <div className="flex flex-col lg:flex-row lg:min-h-[340px]">

          {/* ── LEFT: Course Image (desktop) ── */}
          <div className="relative w-full overflow-hidden lg:w-[42%] xl:w-[45%] lg:self-stretch">
            {/* Desktop featured label */}
            <div className="absolute left-4 top-4 z-20 hidden lg:flex flex-col gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-black/40 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white/50 backdrop-blur-md">
                Featured
              </span>
              <CourseTypeBadge type={course.type} size="md" prominent />
            </div>

            {/* Mobile badge */}
            <div className="absolute left-4 top-10 z-20 lg:hidden">
              <CourseTypeBadge type={course.type} size="md" prominent />
            </div>

            {/* Cover image */}
            <div className="aspect-video w-full lg:aspect-auto lg:absolute lg:inset-0">
              <OptimizedImage
                src={imageUrl}
                alt={course.name}
                eager
                fetchPriority="high"
                containerClassName="h-full w-full"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>

            {/* Cinematic gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-bg-card via-bg-card/30 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-bg-card/10 lg:to-bg-card" />

            {/* Mobile: course name on image */}
            <div className="absolute inset-x-0 bottom-0 z-10 p-4 lg:hidden">
              <h2 className="font-heading text-xl font-extrabold leading-tight tracking-tight text-white drop-shadow-lg line-clamp-2">
                {course.name}
              </h2>
            </div>
          </div>

          {/* ── RIGHT: Course Info ── */}
          <div className="relative z-10 flex flex-1 flex-col justify-between p-5 sm:p-6 lg:p-8">
            {/* Desktop: badge + title */}
            <div className="hidden lg:block space-y-4">
              <div className="flex items-center gap-2">
                <CourseTypeBadge type={course.type} size="lg" prominent />
                {(completed || purchased) && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${
                      completed
                        ? "border-success/25 bg-success/10 text-success"
                        : "border-brand-mint/20 bg-brand-mint/8 text-brand-mint"
                    }`}
                  >
                    {completed ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : null}
                    {completed ? "Completed" : "Enrolled"}
                  </span>
                )}
              </div>

              <h2 className="font-heading text-2xl font-extrabold leading-tight tracking-tight text-white xl:text-3xl line-clamp-2">
                {course.name}
              </h2>
            </div>

            {/* Description */}
            <p className="mt-3 text-sm font-medium leading-relaxed text-text-muted line-clamp-2 lg:mt-4">
              {course.description ||
                "Access complete recorded sessions and learn at your own pace with this comprehensive course."}
            </p>

            {/* Meta pills */}
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-text-muted">
              <span className="inline-flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-brand-mint" />
                {chapterCount} {chapterCount === 1 ? "Chapter" : "Chapters"}
              </span>
              <div className="h-3 w-px bg-border-default" />
              <span className="inline-flex items-center gap-1.5">
                <Play className="w-3.5 h-3.5 text-warning fill-warning opacity-70" />
                Recording Class
              </span>
            </div>

            {/* Progress block */}
            <div
              className={`mt-5 rounded-xl border p-4 ${
                completed
                  ? "border-success/15 bg-success/5"
                  : "border-white/[0.05] bg-white/[0.02]"
              }`}
            >
              <div className="mb-2.5 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
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
                <span className="text-sm font-extrabold text-white">{progress}%</span>
              </div>

              {/* Progress bar — thicker for featured card */}
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                  className={`h-full rounded-full ${
                    completed
                      ? "bg-gradient-to-r from-success to-brand-mint"
                      : "bg-gradient-to-r from-warning/80 via-brand-mint to-brand-mint"
                  }`}
                />
              </div>
            </div>

            {/* CTA */}
            <div className="mt-5">
              {purchased ? (
                <button
                  type="button"
                  id={`featured-recording-cta-${course._id}`}
                  onClick={handleCTA}
                  className={`inline-flex w-full items-center justify-center gap-2.5 rounded-xl py-3.5 text-sm font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer select-none border active:scale-[0.98]
                    ${
                      completed
                        ? "border-success/25 bg-success/10 text-success hover:bg-success/15 hover:border-success/35"
                        : "bg-brand-mint/10 border-brand-mint/25 text-brand-mint hover:bg-brand-mint/18 hover:border-brand-mint/40 hover:shadow-[0_4px_20px_rgba(159,213,178,0.15)]"
                    }`}
                >
                  {completed ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Review Course
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      Continue Learning
                      <ArrowRight className="w-4 h-4 ml-auto opacity-60" />
                    </>
                  )}
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    id={`featured-recording-explore-${course._id}`}
                    onClick={handleCTA}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer select-none border bg-brand-yellow border-brand-yellow text-bg-base hover:shadow-[0_4px_24px_rgba(246,237,74,0.25)] active:scale-[0.98]"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Explore
                  </button>
                  <button
                    type="button"
                    id={`featured-recording-enquire-${course._id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEnquiryModalOpen(true);
                    }}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer select-none border border-border-default bg-white/[0.03] text-white hover:bg-white/[0.07] hover:border-brand-mint/25 active:scale-[0.98]"
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
