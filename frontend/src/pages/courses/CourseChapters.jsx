import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, CheckCircle2, Lock, PlayCircle } from "lucide-react";
import ChapterCard from "../../components/courses/ChapterCard";
import api from "../../services/api";
import { getUploadUrl } from "../../utils/courseUi";

function CourseChapters() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    let mounted = true;
    const loadChapters = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/courses/${courseId}/chapters`);
        if (mounted) setData(res.data);
      } catch (error) {
        console.log(error);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadChapters();
    return () => { mounted = false; };
  }, [courseId]);

  const totalClasses = useMemo(
    () => data?.chapters?.reduce((sum, ch) => sum + (ch.totalClasses || 0), 0) || 0,
    [data],
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-40 shimmer rounded-xl" />
        <div className="rounded-2xl border border-border-default bg-bg-card overflow-hidden">
          <div className="h-[280px] shimmer" />
          <div className="p-6 space-y-3">
            <div className="h-5 w-1/2 shimmer" />
            <div className="h-4 w-3/4 shimmer" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-52 shimmer rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-text-muted text-sm">
        Unable to load course chapters right now.
      </div>
    );
  }

  const { course, chapters, purchased } = data;
  const learningProgress = course.learningProgress;
  const completionPercent = learningProgress?.completionPercent || 0;
  const completedClasses = learningProgress?.completedClasses || 0;
  const imageUrl = getUploadUrl(course.image) || "https://placehold.co/1200x500";

  return (
    <div className="space-y-6 sm:space-y-8">

      {/* ── Back Button ── */}
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        type="button"
        onClick={() => navigate("/courses")}
        className="btn-secondary text-xs uppercase tracking-wider"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to courses
      </motion.button>

      {/* ── Hero Cover Card ── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl bg-bg-card border border-border-default"
      >
        <div className="gradient-line-top" />

        {/* Cover Image */}
        <div className="relative h-[220px] sm:h-[300px] w-full bg-bg-elevated">
          <img src={imageUrl} alt={course.name} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-bg-card via-bg-card/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-bg-card via-transparent to-transparent" />

          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8 flex flex-col justify-end">
            <div className="mb-3 flex flex-wrap gap-2">
              <span className="rounded-lg border border-brand-mint/20 bg-brand-mint/8 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-mint backdrop-blur-md">
                {course.type}
              </span>
              <span
                className={`rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${
                  purchased
                    ? "border-success/20 bg-success/10 text-success"
                    : "border-warning/20 bg-warning/8 text-warning"
                }`}
              >
                {purchased ? "Course unlocked" : "Purchase required"}
              </span>
            </div>

            <h1 className="max-w-3xl font-heading font-extrabold text-2xl sm:text-4xl md:text-5xl text-white tracking-tight leading-none">
              {course.name}
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-medium text-text-muted leading-relaxed line-clamp-2">
              {course.description || "Explore the course structure and chapters below."}
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 border-t border-border-default bg-bg-surface/30 p-5 sm:p-6">
          {[
            { label: "Chapters", value: chapters.length },
            { label: "Total Classes", value: totalClasses },
            {
              label: "Access",
              custom: (
                <p className="mt-1 flex items-center gap-2 text-xs font-semibold text-text-secondary">
                  {purchased ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Lock className="w-4 h-4 text-warning" />}
                  {purchased ? "Ready to stream" : "Locked"}
                </p>
              ),
            },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">{stat.label}</p>
              {stat.custom || (
                <p className="mt-1 text-2xl font-heading font-extrabold text-white">{stat.value}</p>
              )}
            </div>
          ))}
        </div>

        {/* Progress bar (if purchased) */}
        {purchased && (
          <div className="border-t border-border-default bg-bg-surface/20 px-5 sm:px-6 pb-5 sm:pb-6 pt-4">
            <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-4">
              <div className="mb-2.5 flex items-center justify-between text-xs font-medium text-text-secondary">
                <span className="font-semibold">
                  {completionPercent >= 100 ? "Course Complete 🎉" : "Overall Progress"}
                </span>
                <span className="font-bold text-brand-mint">{completionPercent}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${completionPercent}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-brand-mint to-brand-yellow"
                />
              </div>
              <p className="mt-2.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                {completedClasses} of {totalClasses} lessons completed
              </p>
            </div>
          </div>
        )}
      </motion.section>

      {/* ── Locked Alert ── */}
      {!purchased && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 rounded-2xl border border-warning/20 bg-warning/5 p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3 min-w-0">
            <Lock className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-bold text-warning">This course is locked</h2>
              <p className="mt-1 text-xs font-medium text-text-muted leading-relaxed">
                You can browse the chapter roadmap. To access lessons, unlock the course.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-2 rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted shrink-0">
            <PlayCircle className="w-3.5 h-3.5" />
            Preview Available Below
          </span>
        </motion.div>
      )}

      {/* ── Section Header ── */}
      <div className="flex items-end justify-between gap-4 border-b border-border-default pb-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
            Course Roadmap
          </p>
          <h2 className="mt-1 font-heading font-bold text-xl sm:text-2xl text-white tracking-tight">
            Explore the chapter flow
          </h2>
        </div>
        <div className="hidden md:inline-flex items-center gap-2 rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-1.5 text-xs font-semibold text-text-muted">
          <BookOpen className="w-3.5 h-3.5 text-brand-mint" />
          {chapters.length} Modules
        </div>
      </div>

      {/* ── Chapters Grid ── */}
      {chapters.length === 0 ? (
        <div className="rounded-2xl border border-border-default bg-bg-card p-10 text-center">
          <p className="text-text-muted text-sm font-medium">No chapters have been published yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 w-full">
          {chapters.map((chapter, index) => (
            <ChapterCard
              key={chapter.uniqueCode}
              chapter={chapter}
              index={index}
              onOpen={() => navigate(`/courses/${courseId}/chapters/${chapter.uniqueCode}/classes`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default CourseChapters;
