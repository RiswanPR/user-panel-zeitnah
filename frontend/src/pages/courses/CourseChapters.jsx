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
        <div className="rounded-[2rem] border border-border-default bg-[#0A0D14] overflow-hidden flex flex-col md:flex-row w-full p-2 sm:p-3">
          <div className="w-full md:w-5/12 aspect-video shimmer rounded-2xl shrink-0" />
          <div className="p-6 md:p-10 space-y-4 flex-1 flex flex-col justify-center">
            <div className="flex gap-2 mb-2">
              <div className="h-6 w-20 shimmer rounded-lg" />
              <div className="h-6 w-32 shimmer rounded-lg" />
            </div>
            <div className="h-10 w-3/4 shimmer rounded-lg" />
            <div className="h-4 w-full shimmer rounded" />
            <div className="h-4 w-5/6 shimmer rounded" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-white/[0.04] backdrop-blur-xl border border-white/[0.06] rounded-[2rem] overflow-hidden">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-[#0A0D14]/60 p-8 h-32 shimmer" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
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
  const imageUrl = course.coverImage || "https://placehold.co/1280x720/0A0D14/FFFFFF?text=Course+Cover";

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

      {/* ── Ultra-Premium Hero Cover Card ── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-[2rem] bg-[#0A0D14] border border-white/[0.06] shadow-[0_20px_80px_-20px_rgba(0,0,0,0.5)] group transition-colors duration-500 hover:border-white/[0.12]"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-brand-mint/[0.03] via-transparent to-brand-yellow/[0.02] opacity-50 z-0" />
        <div className="gradient-line-top z-20" />

        <div className="flex flex-col md:flex-row w-full relative z-10 p-2 sm:p-3">
          {/* Framed Cover Image - strictly 16:9 */}
          <div className="relative w-full md:w-5/12 aspect-video shrink-0 rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl bg-bg-elevated isolate">
            <img 
              src={imageUrl} 
              alt={course.name} 
              className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-[1.03]" 
            />
            {/* Subtle inner shadow overlay */}
            <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-2xl pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
          </div>

          {/* Content Side */}
          <div className="flex flex-col justify-center flex-1 p-5 sm:p-8 md:p-10 -mt-6 md:mt-0">
            <div className="mb-4 flex flex-wrap gap-2.5">
              <span className="rounded-lg border border-brand-mint/30 bg-brand-mint/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-brand-mint shadow-[0_0_15px_rgba(159,213,178,0.15)] backdrop-blur-md">
                {course.type}
              </span>
              <span
                className={`rounded-lg border px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest backdrop-blur-md shadow-sm ${
                  purchased
                    ? "border-success/30 bg-success/10 text-success shadow-success/10"
                    : "border-warning/30 bg-warning/10 text-warning shadow-warning/10"
                }`}
              >
                {purchased ? "Course unlocked" : "Purchase required"}
              </span>
            </div>

            <h1 className="max-w-3xl font-heading font-extrabold text-3xl sm:text-4xl md:text-5xl tracking-tight leading-[1.1] bg-clip-text text-transparent bg-gradient-to-br from-white via-white/95 to-white/60 drop-shadow-sm">
              {course.name}
            </h1>
            <p className="mt-4 max-w-2xl text-sm sm:text-base font-medium text-white/60 leading-relaxed line-clamp-3">
              {course.description || "Explore the course structure and chapters below."}
            </p>
          </div>
        </div>

        {/* Premium Frosted Stats Row */}
        <div className="grid gap-px grid-cols-1 sm:grid-cols-3 bg-white/[0.04] backdrop-blur-xl border-t border-white/[0.06] relative z-10 overflow-hidden">
          {[
            { label: "Total Chapters", value: chapters.length },
            { label: "Total Lessons", value: totalClasses },
            {
              label: "Access Status",
              custom: (
                <div className="mt-1.5 flex items-center gap-2.5 text-sm font-semibold">
                  {purchased ? (
                    <>
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-success/20 border border-success/30">
                        <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                      </div>
                      <span className="text-white/90">Ready to stream</span>
                    </>
                  ) : (
                    <>
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-warning/20 border border-warning/30">
                        <Lock className="w-3.5 h-3.5 text-warning" />
                      </div>
                      <span className="text-white/90">Locked</span>
                    </>
                  )}
                </div>
              ),
            },
          ].map((stat, i) => (
            <div key={stat.label} className="bg-[#0A0D14]/60 p-6 sm:p-8 transition-colors duration-300 hover:bg-[#0A0D14]/40">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">{stat.label}</p>
              {stat.custom || (
                <p className="text-3xl font-heading font-extrabold text-white/95 tracking-tight">{stat.value}</p>
              )}
            </div>
          ))}
        </div>

        {/* Floating Progress bar (if purchased) */}
        {purchased && (
          <div className="bg-[#0A0D14] px-6 sm:px-8 pb-6 sm:pb-8 pt-0 relative z-10">
            <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-r from-white/[0.03] to-transparent p-5 sm:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-white/50">
                    {completionPercent >= 100 ? "Course Complete 🎉" : "Your Journey"}
                  </span>
                  <p className="mt-1 text-sm font-medium text-white/70">
                    {completedClasses} out of {totalClasses} lessons finished
                  </p>
                </div>
                <span className="text-2xl font-heading font-extrabold text-brand-mint tracking-tight drop-shadow-[0_0_12px_rgba(159,213,178,0.3)]">
                  {completionPercent}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.04] ring-1 ring-inset ring-white/[0.05]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${completionPercent}%` }}
                  transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                  className="h-full rounded-full bg-gradient-to-r from-brand-mint to-brand-yellow shadow-[0_0_10px_rgba(246,237,74,0.4)]"
                />
              </div>
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
