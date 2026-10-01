import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  Clock,
  FileText,
  Lock,
  Play,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import ClassCard from "../../components/courses/ClassCard";
import api from "../../services/api";
import { formatDuration, parseDurationToSeconds } from "../../utils/courseUi";

function CourseClasses() {
  const { chapterCode, courseId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadClasses = async () => {
      try {
        setLoading(true);
        const res = await api.get(
          `/courses/${courseId}/chapters/${chapterCode}/classes`
        );
        if (mounted) setData(res.data);
      } catch (error) {
        console.error("Failed to load chapter classes:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadClasses();
    return () => {
      mounted = false;
    };
  }, [chapterCode, courseId]);

  // Close popup on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && showPopup) {
        setShowPopup(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showPopup]);

  const stats = useMemo(() => {
    if (!data || !Array.isArray(data.classes)) {
      return {
        totalClasses: 0,
        completedClasses: 0,
        unlockedClasses: 0,
        totalExercises: 0,
        progressPercent: 0,
        formattedDuration: null,
        resumeClass: null,
      };
    }
    const totalClasses = data.classes.length;
    const completedClasses = data.classes.filter((cls) => cls.completed).length;
    const unlockedClasses = data.classes.filter((cls) => !cls.locked).length;
    const totalExercises = data.classes.reduce(
      (sum, cls) => sum + (cls.exerciseCount || 0),
      0
    );
    const progressPercent =
      totalClasses > 0
        ? Math.min(100, Math.round((completedClasses / totalClasses) * 100))
        : 0;

    const totalSeconds = data.classes.reduce(
      (sum, cls) => sum + parseDurationToSeconds(cls.duration),
      0
    );
    const formattedDuration =
      totalSeconds > 0 ? formatDuration(totalSeconds) : null;

    // Find first actionable lesson to resume/play
    const resumeClass =
      data.classes.find((c) => !c.completed && !c.locked) ||
      data.classes.find((c) => !c.locked) ||
      data.classes[0] ||
      null;

    return {
      totalClasses,
      completedClasses,
      unlockedClasses,
      totalExercises,
      progressPercent,
      formattedDuration,
      resumeClass,
    };
  }, [data]);

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="h-4 w-48 shimmer rounded" />
        <div className="h-44 shimmer rounded-2xl" />
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 shimmer rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || !data.chapter) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
        <p className="text-text-muted text-sm font-medium">
          Unable to load chapter lessons right now.
        </p>
        <button
          type="button"
          onClick={() => navigate(`/courses/${courseId}/chapters`)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-xs font-semibold text-white hover:bg-white/[0.1] transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Chapters
        </button>
      </div>
    );
  }

  const { chapter = {}, classes = [], course = {}, purchased } = data;

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      {/* ── Breadcrumbs ── */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-medium text-text-muted">
        <Link
          to="/courses"
          className="hover:text-white transition-colors focus-ring rounded"
        >
          Courses
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-text-faint" />
        <Link
          to={`/courses/${courseId}/chapters`}
          className="hover:text-white transition-colors focus-ring rounded truncate max-w-[160px] sm:max-w-[220px]"
        >
          {course?.name || "Course"}
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-text-faint" />
        <span className="text-white truncate max-w-[200px] sm:max-w-xs font-semibold">
          {chapter?.title || "Chapter"}
        </span>
      </nav>

      {/* ── Chapter Header ── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-bg-card via-bg-surface to-bg-card border border-white/[0.08] p-5 sm:p-7 lg:p-8"
      >
        <div className="gradient-line-top" />

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="rounded-md border border-brand-mint/20 bg-brand-mint/10 px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-brand-mint">
              MODULE {String(chapter?.order || chapterCode || "01").replace(/\D/g, "") || "01"}
            </span>
            <span
              className={`rounded-md border px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider ${
                purchased
                  ? "border-success/20 bg-success/10 text-success"
                  : "border-warning/20 bg-warning/8 text-warning"
              }`}
            >
              {purchased ? "Enrolled Access" : "Preview Mode"}
            </span>
          </div>

          <h1 className="font-heading font-extrabold text-2xl sm:text-3xl lg:text-4xl text-white tracking-tight leading-tight">
            {chapter.title}
          </h1>

          {chapter.description && (
            <p className="max-w-3xl text-xs sm:text-sm font-medium text-text-muted leading-relaxed">
              {chapter.description}
            </p>
          )}

          {/* Quick stats pills */}
          <div className="flex flex-wrap items-center gap-3 pt-1 text-xs font-semibold text-text-secondary">
            <span className="inline-flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-brand-mint" />
              {stats.totalClasses} {stats.totalClasses === 1 ? "Lesson" : "Lessons"}
            </span>
            {stats.formattedDuration && (
              <>
                <span className="w-1 h-1 rounded-full bg-border-default" />
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-brand-mint" />
                  {stats.formattedDuration}
                </span>
              </>
            )}
            {stats.totalExercises > 0 && (
              <>
                <span className="w-1 h-1 rounded-full bg-border-default" />
                <span className="inline-flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-brand-mint" />
                  {stats.totalExercises} Resources
                </span>
              </>
            )}
          </div>

          {/* Progress bar if enrolled */}
          {purchased && stats.totalClasses > 0 && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-2 max-w-xl">
              <div className="flex items-center justify-between text-xs font-mono font-medium text-text-secondary">
                <span>
                  {stats.progressPercent >= 100 ? "Module Completed" : "Module Progress"}
                </span>
                <span className="font-bold text-white">{stats.progressPercent}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    stats.progressPercent >= 100
                      ? "bg-success"
                      : "bg-gradient-to-r from-brand-mint to-brand-yellow"
                  }`}
                  style={{ width: `${stats.progressPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-text-muted pt-1">
                <span>{stats.completedClasses} of {stats.totalClasses} lessons completed</span>
              </div>
            </div>
          )}

          {/* Primary Action Button (Direct Lesson Launch) */}
          {stats.resumeClass && !stats.resumeClass.locked && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => navigate(`/courses/class/${stats.resumeClass._id}`)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-mint text-bg-base font-bold text-xs uppercase tracking-wider shadow-md hover:bg-brand-mint/90 transition-all cursor-pointer focus-ring"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>
                  {stats.completedClasses >= stats.totalClasses
                    ? "Review First Lesson"
                    : stats.completedClasses > 0
                    ? `Continue: ${stats.resumeClass.title}`
                    : "Start Chapter"}
                </span>
              </button>
            </div>
          )}
        </div>
      </motion.section>

      {/* ── Lesson Directory ── */}
      <section aria-labelledby="lesson-directory-title" className="space-y-4">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <h2 id="lesson-directory-title" className="font-heading font-bold text-lg sm:text-xl text-white tracking-tight">
            Lessons in this Chapter
          </h2>
          <span className="text-xs font-semibold text-text-muted">
            {stats.totalClasses} Total
          </span>
        </div>

        {classes.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.06] bg-bg-card p-10 text-center">
            <p className="text-text-muted text-sm font-medium">
              No lessons have been published in this chapter yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3.5 w-full flex flex-col">
            {classes.map((cls, index) => (
              <ClassCard
                key={cls._id}
                cls={cls}
                courseType={course.type}
                index={index}
                onLockedClick={() => setShowPopup(true)}
                onOpen={() => navigate(`/courses/class/${cls._id}`)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Locked Content Modal ── */}
      <AnimatePresence>
        {showPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPopup(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="relative w-full max-w-md bg-bg-surface border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl z-10 text-center space-y-4"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-warning/10 border border-warning/20 text-warning">
                <Lock className="w-6 h-6" />
              </div>

              <h3 className="font-heading font-bold text-lg text-white">
                Content Locked
              </h3>
              <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
                This lesson requires course enrollment. Please visit the course overview to enquire about access.
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPopup(false)}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 bg-white/[0.04] text-xs font-semibold text-white hover:bg-white/[0.08] transition-all cursor-pointer"
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/courses/${courseId}/chapters`)}
                  className="flex-1 py-2.5 rounded-xl bg-brand-yellow text-bg-base text-xs font-bold uppercase tracking-wider hover:bg-brand-yellow/90 transition-all cursor-pointer"
                >
                  Course Overview
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default CourseClasses;
