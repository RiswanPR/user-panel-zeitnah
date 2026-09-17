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
 * The primary hero card for the top Recording Course.
 * Cinematic split-layout on desktop, stacked on mobile.
 * Visually dominant — this is the flagship learning experience.
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
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        onClick={handleCardClick}
        className="group relative overflow-hidden rounded-2xl border border-warning/20 recording-card-glow bg-gradient-to-br from-bg-card via-bg-elevated to-bg-card cursor-pointer
          transition-all duration-500
          hover:border-warning/35
          hover:-translate-y-1.5"
        aria-label={`Featured recording course: ${course.name}`}
      >
        {/* Top gradient accent line — amber themed for recording */}
        <div
          className="absolute top-0 left-0 right-0 h-px z-20 pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(245,158,11,0.5) 30%, rgba(159,213,178,0.4) 70%, transparent 100%)",
          }}
        />

        {/* Ambient glows */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-warning/6 blur-[100px]" />
        <div className="pointer-events-none absolute -left-12 bottom-0 h-56 w-56 rounded-full bg-brand-mint/5 blur-[80px]" />

        {/* ── LAYOUT: desktop split / mobile stacked ── */}
        <div className="flex flex-col lg:flex-row lg:min-h-[420px] xl:min-h-[460px]">

          {/* ── LEFT: Course Image ── */}
          <div className="relative w-full overflow-hidden lg:w-[45%] xl:w-[48%] lg:self-stretch">

            {/* Desktop overlay labels */}
            <div className="absolute left-5 top-5 z-20 hidden lg:flex flex-col gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-black/50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.15em] text-white/40 backdrop-blur-md">
                <Sparkles className="w-2.5 h-2.5" />
                Featured
              </span>
              <CourseTypeBadge type={course.type} size="md" prominent />
            </div>

            {/* Mobile overlay labels */}
            <div className="absolute left-4 top-4 z-20 lg:hidden flex flex-col gap-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-black/50 px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest text-white/40 backdrop-blur-md">
                <Sparkles className="w-2 h-2" />
                Featured
              </span>
              <CourseTypeBadge type={course.type} size="sm" prominent />
            </div>

            {/* Cover image — cinematic fill */}
            <div className="aspect-[4/3] w-full lg:aspect-auto lg:absolute lg:inset-0">
              <OptimizedImage
                src={imageUrl}
                alt={course.name}
                eager
                fetchPriority="high"
                containerClassName="h-full w-full"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              />
            </div>

            {/* Cinematic gradient overlay — strong on mobile, right-fading on desktop */}
            <div className="absolute inset-0 bg-gradient-to-t from-bg-card via-bg-card/50 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-bg-card/20 lg:to-bg-card" />

            {/* Mobile: course title over image */}
            <div className="absolute inset-x-0 bottom-0 z-10 p-5 lg:hidden">
              <h2 className="font-heading text-2xl font-extrabold leading-tight tracking-tight text-white drop-shadow-2xl line-clamp-2">
                {course.name}
              </h2>
            </div>
          </div>

          {/* ── RIGHT: Course Info ── */}
          <div className="relative z-10 flex flex-1 flex-col justify-between p-5 sm:p-7 lg:p-10">

            {/* Desktop: badge row + title */}
            <div className="hidden lg:block space-y-5">
              <div className="flex items-center gap-2.5">
                <CourseTypeBadge type={course.type} size="lg" prominent />
                {(completed || purchased) && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${
                      completed
                        ? "border-success/25 bg-success/10 text-success"
                        : "border-brand-mint/20 bg-brand-mint/8 text-brand-mint"
                    }`}
                  >
                    {completed && <CheckCircle2 className="w-3 h-3" />}
                    {completed ? "Completed" : "Enrolled"}
                  </span>
                )}
              </div>

              <h2 className="font-heading text-2xl xl:text-4xl font-extrabold leading-tight tracking-tight text-white line-clamp-2">
                {course.name}
              </h2>
            </div>

            {/* Description */}
            <p className="mt-4 text-sm font-medium leading-relaxed text-text-muted line-clamp-3 lg:mt-0 lg:line-clamp-2">
              {course.description ||
                "Access complete recorded sessions and learn at your own pace with this comprehensive course."}
            </p>

            {/* Meta row */}
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-text-muted">
              <span className="inline-flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-brand-mint" />
                {chapterCount} {chapterCount === 1 ? "Chapter" : "Chapters"}
              </span>
              <div className="h-3 w-px bg-border-default" />
              <span className="inline-flex items-center gap-1.5">
                <Play className="w-3.5 h-3.5 text-warning fill-warning opacity-80" />
                Recording Class
              </span>
              <div className="h-3 w-px bg-border-default" />
              <span className="inline-flex items-center gap-1.5">
                Self Paced
              </span>
            </div>

            {/* Progress block */}
            <div
              className={`mt-5 rounded-xl border p-4 ${
                completed
                  ? "border-success/15 bg-success/5"
                  : "border-white/[0.06] bg-white/[0.02]"
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  {completed ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                  ) : (
                    <TrendingUp className="w-3.5 h-3.5 text-brand-mint" />
                  )}
                  {completed
                    ? "Course Completed"
                    : purchased
                    ? "Your Progress"
                    : "Start Learning"}
                </span>
                <span className="text-base font-extrabold text-white">{progress}%</span>
              </div>

              {/* Progress bar — thicker for featured */}
              <div className="h-3 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1.2, ease: "easeOut", delay: 0.25 }}
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
                  className={`inline-flex w-full items-center justify-center gap-3 rounded-xl py-4 text-sm font-bold uppercase tracking-wider transition-all duration-250 cursor-pointer select-none border active:scale-[0.98]
                    ${
                      completed
                        ? "border-success/25 bg-success/10 text-success hover:bg-success/15 hover:border-success/35"
                        : "bg-brand-mint/12 border-brand-mint/28 text-brand-mint hover:bg-brand-mint/20 hover:border-brand-mint/45 hover:shadow-[0_6px_28px_rgba(159,213,178,0.18)]"
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
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    id={`featured-recording-explore-${course._id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/courses/${course._id}/chapters`);
                    }}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer select-none border bg-brand-yellow border-brand-yellow text-bg-base hover:shadow-[0_4px_24px_rgba(246,237,74,0.25)] active:scale-[0.98]"
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
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl py-3.5 text-sm font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer select-none border border-border-default bg-white/[0.03] text-white hover:bg-white/[0.07] hover:border-brand-mint/25 active:scale-[0.98]"
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
