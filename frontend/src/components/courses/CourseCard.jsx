import { motion } from "framer-motion";
import {
  BookOpen,
  CheckCircle2,
  Play,
  TrendingUp,
  Video,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getCourseTypeLabel, getUploadUrl } from "../../utils/courseUi";

function CourseCard({ course }) {
  const navigate = useNavigate();

  const progress = course.learningProgress?.completionPercent || 0;
  const purchased = !!course.learningProgress;
  const completed = purchased && progress >= 100;
  const completedClasses = course.learningProgress?.completedClasses || 0;
  const isRecording = course.type === "Recording";
  const imageUrl = course.coverImage || "https://placehold.co/1280x720/0A0D14/FFFFFF?text=Course+Cover";
  const chapterCount = course.chapters?.length || 0;

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`group overflow-hidden rounded-2xl border transition-all duration-300 hover:-translate-y-1 flex flex-col relative w-full cursor-pointer ${
        completed
          ? "bg-gradient-to-b from-bg-card to-bg-surface border-success/20 hover:border-success/35 hover:shadow-[0_20px_60px_rgba(16,185,129,0.1)]"
          : "bg-gradient-to-b from-bg-card to-bg-surface border-border-default hover:border-brand-mint/25 hover:shadow-[0_20px_60px_rgba(159,213,178,0.06)]"
      }`}
      onClick={() => navigate(`/courses/${course._id}/chapters`)}
    >
      {/* Gradient accent line */}
      <div className="gradient-line-top" />

      {/* ── Cover Image ── */}
      <div className="relative aspect-video w-full overflow-hidden bg-bg-elevated shrink-0 select-none">
        <link rel="preload" as="image" href={imageUrl} fetchPriority="high" />
        <img
          src={imageUrl}
          alt={course.name}
          fetchPriority="high"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-bg-card via-bg-card/40 to-transparent" />

        {/* Badges */}
        <div className="absolute left-4 top-4 flex flex-wrap gap-1.5 z-10">
          <span
            className={`rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border ${
              isRecording
                ? "border-warning/25 bg-warning/10 text-warning"
                : "border-brand-mint/20 bg-brand-mint/8 text-brand-mint"
            }`}
          >
            {getCourseTypeLabel(course.type)}
          </span>

          <span
            className={`rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border ${
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
        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 z-10">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-1">
            Course
          </p>
          <h2 className="font-heading font-extrabold text-lg sm:text-xl text-white tracking-tight leading-tight line-clamp-2">
            {course.name}
          </h2>
        </div>
      </div>

      {/* ── Card Body ── */}
      <div className="p-4 sm:p-5 flex flex-col flex-1 justify-between w-full">
        <p className="text-sm font-medium text-text-muted leading-relaxed line-clamp-2">
          {course.description || "Explore this course to discover structured learning modules and content."}
        </p>

        {/* Info pills */}
        <div className="mt-4 flex items-center gap-3 text-text-muted">
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <BookOpen className="w-3.5 h-3.5 text-brand-mint" />
            <span>{chapterCount} {chapterCount === 1 ? "chapter" : "chapters"}</span>
          </div>
          <div className="w-px h-3 bg-border-default" />
          <div className="flex items-center gap-1.5 text-xs font-medium">
            {isRecording ? <Play className="w-3.5 h-3.5 text-brand-mint" /> : <Video className="w-3.5 h-3.5 text-brand-mint" />}
            <span>{getCourseTypeLabel(course.type)}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div
          className={`mt-4 rounded-xl p-3.5 flex flex-col w-full border ${
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
              {completed ? "Course Completed" : purchased ? "Your Progress" : "Start Progress"}
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
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/courses/${course._id}/chapters`);
          }}
          className={`mt-4 inline-flex w-full items-center justify-center rounded-xl py-3 text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer select-none border ${
            completed
              ? "border-success/25 bg-success/8 text-success hover:bg-success/12"
              : purchased
              ? "bg-white/[0.03] border-border-default text-white hover:bg-white/[0.06] hover:border-brand-mint/25"
              : "bg-brand-yellow border-brand-yellow text-bg-base hover:shadow-[0_4px_20px_rgba(246,237,74,0.2)] active:scale-[0.98]"
          }`}
        >
          {completed ? "Review Course" : purchased ? "Continue Learning" : "Explore Course"}
        </button>
      </div>
    </motion.article>
  );
}

export default CourseCard;
