import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, BookOpen, FileText, Lock } from "lucide-react";
import ClassCard from "../../components/courses/ClassCard";
import api from "../../services/api";

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
        const res = await api.get(`/courses/${courseId}/chapters/${chapterCode}/classes`);
        if (mounted) setData(res.data);
      } catch (error) {
        console.log(error);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadClasses();
    return () => { mounted = false; };
  }, [chapterCode, courseId]);

  const stats = useMemo(() => {
    if (!data) return { totalClasses: 0, totalExercises: 0, unlockedClasses: 0 };
    return {
      totalClasses: data.classes.length,
      totalExercises: data.classes.reduce((sum, cls) => sum + (cls.exerciseCount || 0), 0),
      unlockedClasses: data.classes.filter((cls) => !cls.locked).length,
    };
  }, [data]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-40 shimmer rounded-xl" />
        <div className="h-48 shimmer rounded-2xl" />
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-36 shimmer rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-text-muted text-sm">
        Unable to load chapter classes right now.
      </div>
    );
  }

  const { chapter, classes, course, purchased } = data;

  return (
    <div className="space-y-6 sm:space-y-8">

      {/* ── Back Button ── */}
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        type="button"
        onClick={() => navigate(`/courses/${courseId}/chapters`)}
        className="btn-secondary text-xs uppercase tracking-wider"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to chapters
      </motion.button>

      {/* ── Chapter Hero ── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl bg-bg-card border border-border-default"
      >
        <div className="gradient-line-top" />

        <div className="p-6 sm:p-8 space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="rounded-lg border border-brand-mint/20 bg-brand-mint/8 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-mint">
              {course.name}
            </span>
            <span className={`rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
              purchased
                ? "border-success/20 bg-success/10 text-success"
                : "border-warning/20 bg-warning/8 text-warning"
            }`}>
              {purchased ? "Access unlocked" : "Locked chapter"}
            </span>
          </div>

          <h1 className="font-heading font-extrabold text-2xl sm:text-4xl lg:text-5xl text-white tracking-tight leading-none">
            {chapter.title}
          </h1>

          <p className="max-w-3xl text-sm font-medium text-text-muted leading-relaxed">
            {chapter.description || "Chapter content and learning objectives."}
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 border-t border-border-default bg-bg-surface/30 p-5 sm:p-6">
          {[
            { label: "Chapter Lessons", value: stats.totalClasses },
            { label: "Resources", value: stats.totalExercises },
            {
              label: "Access Status",
              custom: (
                <p className="mt-1 text-xs font-semibold text-text-secondary">
                  {purchased ? `${stats.unlockedClasses} modules ready` : "Unlock to access"}
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
      </motion.section>

      {!purchased && stats.unlockedClasses === 0 && (
        <div className="flex flex-col gap-4 rounded-2xl border border-warning/20 bg-warning/5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <Lock className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-bold text-warning">Classes are locked</h2>
              <p className="mt-1 text-xs font-medium text-text-muted leading-relaxed">
                You can preview the lesson sequence. Unlock the course to start watching.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/courses/${courseId}/chapters`)}
            className="btn-secondary text-[10px] uppercase tracking-wider shrink-0"
          >
            <BookOpen className="w-3.5 h-3.5" />
            View course overview
          </button>
        </div>
      )}
      {!purchased && stats.unlockedClasses > 0 && (
        <div className="flex flex-col gap-4 rounded-2xl border border-success/20 bg-success/5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <BookOpen className="w-5 h-5 text-success shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-bold text-success">Chapter unlocked</h2>
              <p className="mt-1 text-xs font-medium text-text-muted leading-relaxed">
                This chapter is defaultly unlocked for all students. Enjoy watching the lessons!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Section Header ── */}
      <div className="flex items-end justify-between gap-4 border-b border-border-default pb-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Chapter Lessons</p>
          <h2 className="mt-1 font-heading font-bold text-xl sm:text-2xl text-white tracking-tight">
            Watch the class sequence
          </h2>
        </div>
        <div className="hidden md:inline-flex items-center gap-2 rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-1.5 text-xs font-semibold text-text-muted">
          <FileText className="w-3.5 h-3.5 text-brand-mint" />
          {stats.totalExercises} Resources
        </div>
      </div>

      {/* ── Classes List ── */}
      {classes.length === 0 ? (
        <div className="rounded-2xl border border-border-default bg-bg-card p-10 text-center">
          <p className="text-text-muted text-sm font-medium">No lessons have been added to this chapter yet.</p>
        </div>
      ) : (
        <div className="space-y-4 w-full flex flex-col">
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

      {/* ── Locked Modal ── */}
      <AnimatePresence>
        {showPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="w-full max-w-md bg-bg-surface border border-border-accent rounded-2xl p-6 sm:p-8 shadow-[0_32px_64px_rgba(0,0,0,0.5)] relative overflow-hidden"
            >
              <div className="gradient-line-top" />

              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-warning/10 border border-warning/20 text-warning">
                <Lock className="w-6 h-6" />
              </div>

              <h2 className="text-center font-heading font-bold text-xl sm:text-2xl text-white tracking-tight">
                Content Locked
              </h2>
              <p className="mt-3 text-center text-sm font-medium text-text-muted leading-relaxed">
                Unlock this course from the overview page to access all lessons and resources.
              </p>

              <div className="mt-6 flex gap-3 w-full">
                <button
                  type="button"
                  onClick={() => setShowPopup(false)}
                  className="btn-secondary flex-1 py-2.5 text-xs uppercase tracking-wider"
                >
                  Later
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/courses/${courseId}/chapters`)}
                  className="btn-primary flex-1 py-2.5 text-xs uppercase tracking-wider"
                >
                  Go to overview
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default CourseClasses;
