import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  Lock,
  Play,
  HelpCircle,
  ChevronRight,
} from "lucide-react";
import ChapterCard from "../../components/courses/ChapterCard";
import CourseTypeBadge from "../../components/courses/CourseTypeBadge";
import CourseEnquiryModal from "../../components/courses/CourseEnquiryModal";
import api from "../../services/api";
import { useImagePreloader } from "../../hooks/useImagePreloader";

function CourseChapters() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [enquiryModalOpen, setEnquiryModalOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadChapters = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/courses/${courseId}/chapters`);
        if (mounted) setData(res.data);
      } catch (error) {
        console.error("Failed to load chapters:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadChapters();
    return () => {
      mounted = false;
    };
  }, [courseId]);

  const totalClasses = useMemo(
    () => data?.chapters?.reduce((sum, ch) => sum + (ch.totalClasses || 0), 0) || 0,
    [data]
  );

  // Preload chapter cover images in background
  const chapterImageUrls = useMemo(
    () => (data?.chapters || []).map((ch) => ch.coverImage).filter(Boolean),
    [data]
  );
  useImagePreloader(chapterImageUrls);

  if (loading) {
    return (
      <div className="space-y-8 max-w-7xl mx-auto">
        <div className="h-4 w-48 shimmer rounded" />
        <div className="rounded-2xl border border-white/[0.06] bg-bg-card p-6 sm:p-8 flex flex-col md:flex-row gap-6">
          <div
            className="w-full md:w-5/12 aspect-video shimmer rounded-xl shrink-0"
            style={{ aspectRatio: "16 / 9" }}
          />
          <div className="flex-1 space-y-4">
            <div className="h-4 w-32 shimmer rounded" />
            <div className="h-8 w-3/4 shimmer rounded-lg" />
            <div className="h-4 w-full shimmer rounded" />
            <div className="h-10 w-44 shimmer rounded-xl mt-4" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-56 shimmer rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || !data.course) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
        <p className="text-text-muted text-sm font-medium">
          Unable to load course syllabus right now.
        </p>
        <button
          type="button"
          onClick={() => navigate("/courses")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-xs font-semibold text-white hover:bg-white/[0.1] transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Courses
        </button>
      </div>
    );
  }

  const { course, chapters = [], purchased } = data;
  const isPurchased =
    !!purchased ||
    !!course?.learningProgress ||
    !!course?.purchased ||
    !!course?.isPurchased ||
    !!course?.isEnrolled;
  const learningProgress = course?.learningProgress;
  const completionPercent = Math.min(100, Math.max(0, Math.round(learningProgress?.completionPercent || 0)));
  const completedClasses = learningProgress?.completedClasses || 0;
  const imageUrl =
    course?.coverImage ||
    "https://placehold.co/1920x1080/0A0D14/FFFFFF?text=Course+Cover";

  // Find next actionable chapter for the Continue button
  const nextChapter = chapters.find((ch) => !ch.completed && !ch.locked) || chapters[0];

  const handleContinueLearning = () => {
    if (nextChapter) {
      const code = nextChapter.uniqueCode || nextChapter._id;
      navigate(`/courses/${courseId}/chapters/${code}/classes`);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {course && (
        <CourseEnquiryModal
          isOpen={enquiryModalOpen}
          onClose={() => setEnquiryModalOpen(false)}
          course={course}
        />
      )}

      {/* ── Breadcrumb Navigation ── */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-medium text-text-muted">
        <Link
          to="/courses"
          className="hover:text-white transition-colors focus-ring rounded"
        >
          Courses
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-text-faint" />
        <span className="text-white truncate max-w-[280px] sm:max-w-md font-semibold">
          {course.name}
        </span>
      </nav>

      {/* ── Course Detail Hero Dashboard ── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        aria-label="Course Overview"
        className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-bg-card via-bg-surface to-bg-card p-5 sm:p-7 lg:p-8"
      >
        <div className="gradient-line-top" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-mint/5 blur-[90px]" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6 lg:gap-8">
          {/* 16:9 Cover Thumbnail (1920x1080) */}
          <div
            className="relative w-full md:w-5/12 aspect-video shrink-0 rounded-xl overflow-hidden border border-white/[0.08] bg-bg-elevated"
            style={{ aspectRatio: "16 / 9" }}
          >
            <img
              src={imageUrl}
              alt={course.name}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
              <CourseTypeBadge type={course.type} size="sm" prominent />
              {isPurchased && (
                <CourseTypeBadge
                  status={completionPercent >= 100 ? "completed" : "enrolled"}
                  size="sm"
                />
              )}
            </div>
          </div>

          {/* Details & CTA Column */}
          <div className="flex-1 min-w-0 flex flex-col justify-between gap-4 w-full">
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  {course.type === "recording" ? "Recorded Course" : "Online Course"}
                </span>
                <span className="w-1 h-1 rounded-full bg-border-default" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-mint">
                  {chapters.length} {chapters.length === 1 ? "Chapter" : "Chapters"}
                </span>
                <span className="w-1 h-1 rounded-full bg-border-default" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                  {totalClasses} Lessons
                </span>
              </div>

              <h1 className="font-heading font-extrabold text-2xl sm:text-3xl lg:text-4xl text-white tracking-tight leading-tight">
                {course.name}
              </h1>

              {course.description && (
                <p className="text-xs sm:text-sm font-medium text-text-muted leading-relaxed line-clamp-3">
                  {course.description}
                </p>
              )}
            </div>

            {/* Progress metrics if enrolled */}
            {isPurchased && (
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-2 max-w-xl">
                <div className="flex items-center justify-between text-xs font-medium text-text-secondary">
                  <span>
                    {completionPercent >= 100 ? "Course Complete" : "Your Progress"}
                  </span>
                  <span className="font-bold text-white">{completionPercent}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      completionPercent >= 100
                        ? "bg-success"
                        : "bg-gradient-to-r from-brand-mint to-brand-yellow"
                    }`}
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-text-muted pt-1">
                  <span>{completedClasses} of {totalClasses} classes completed</span>
                </div>
              </div>
            )}

            {/* Primary Action Button */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              {isPurchased ? (
                <button
                  type="button"
                  onClick={handleContinueLearning}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-mint text-bg-base font-bold text-xs uppercase tracking-wider shadow-md hover:bg-brand-mint/90 transition-all cursor-pointer focus-ring"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>{completionPercent >= 100 ? "Review Course" : "Continue Learning"}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setEnquiryModalOpen(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-yellow text-bg-base font-bold text-xs uppercase tracking-wider shadow-md hover:bg-brand-yellow/90 transition-all cursor-pointer focus-ring"
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>Enquire About Course</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── Unlocked/Locked Guidance Notice ── */}
      {!isPurchased && String(course.type || "").trim().toLowerCase() === "recording" ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-brand-mint/20 bg-brand-mint/5 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <BookOpen className="w-5 h-5 text-brand-mint shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-white">Free Chapters Available</h3>
              <p className="text-xs text-text-muted mt-0.5">
                The first 2 chapters are open for free preview. Explore the lessons below to get started.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEnquiryModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-mint text-bg-base text-xs font-bold uppercase tracking-wider hover:bg-brand-mint/90 transition-all shrink-0 cursor-pointer"
          >
            Full Access Enquiry
          </button>
        </div>
      ) : !isPurchased && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-white">Course Syllabus Preview</h3>
              <p className="text-xs text-text-muted mt-0.5">
                Review the modular roadmap below. Enquire to unlock live streaming sessions and materials.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEnquiryModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-yellow text-bg-base text-xs font-bold uppercase tracking-wider hover:bg-brand-yellow/90 transition-all shrink-0 cursor-pointer"
          >
            Enquire Now
          </button>
        </div>
      )}

      {/* ── Chapter Roadmap Section ── */}
      <section aria-labelledby="chapter-roadmap-title" className="space-y-5">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
          <div>
            <h2 id="chapter-roadmap-title" className="font-heading font-bold text-xl sm:text-2xl text-white tracking-tight">
              Course Syllabus
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Select a chapter to view lessons and exercises
            </p>
          </div>
          <span className="text-xs font-semibold text-text-muted">
            {chapters.length} Modules
          </span>
        </div>

        {chapters.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.06] bg-bg-card p-10 text-center">
            <p className="text-text-muted text-sm font-medium">
              No chapters have been published for this course yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 w-full">
            {chapters.map((chapter, index) => {
              const code = chapter.uniqueCode || chapter._id;
              return (
                <ChapterCard
                  key={code || index}
                  chapter={chapter}
                  index={index}
                  onOpen={() =>
                    navigate(`/courses/${courseId}/chapters/${code}/classes`)
                  }
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default CourseChapters;
