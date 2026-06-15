import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiBookOpen,
  FiFileText,
  FiLock,
} from "react-icons/fi";
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

        if (mounted) {
          setData(res.data);
        }
      } catch (error) {
        console.log(error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadClasses();

    return () => {
      mounted = false;
    };
  }, [chapterCode, courseId]);

  const stats = useMemo(() => {
    if (!data) {
      return {
        totalClasses: 0,
        totalExercises: 0,
        unlockedClasses: 0,
      };
    }

    return {
      totalClasses: data.classes.length,
      totalExercises: data.classes.reduce(
        (sum, cls) => sum + (cls.exerciseCount || 0),
        0,
      ),
      unlockedClasses: data.classes.filter((cls) => !cls.locked).length,
    };
  }, [data]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07192a] text-white font-body">
        <div className="flex items-center gap-3">
          <svg className="animate-spin h-5 w-5 text-[#9fd5b2]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm font-semibold uppercase tracking-widest text-white/60">Loading Class Syllabus…</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07192a] px-4 text-center text-white/60 font-body text-sm uppercase tracking-wider">
        Unable to load the chapter classes right now.
      </div>
    );
  }

  const { chapter, classes, course, purchased } = data;

  return (
    <div className="min-h-screen bg-[#07192a] relative overflow-hidden px-4 py-6 sm:py-8 font-body text-white antialiased selection:bg-[#f6ed4a] selection:text-[#07192a]">
      
      {/* Decorative ambient branded visual spot */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] bg-[#9fd5b2] opacity-5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl space-y-6 sm:space-y-8">
        
        {/* NAVIGATION BACK ROW */}
        <div className="flex justify-between items-center w-full">
          <button
            type="button"
            onClick={() => navigate(`/courses/${courseId}/chapters`)}
            className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white/70 transition-all hover:border-[rgba(159,213,178,0.3)] hover:text-[#9fd5b2] cursor-pointer"
          >
            <FiArrowLeft className="text-sm shrink-0" />
            Back to chapters
          </button>
        </div>

        {/* HERO SYLLABUS INSIGHT HEADER */}
        <section className="glass-card relative overflow-hidden flex flex-col shadow-2xl">
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[rgba(159,213,178,0.25)] to-transparent z-20" />
          
          <div className="p-6 sm:p-8 flex flex-col w-full space-y-4">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="rounded-lg border border-[rgba(159,213,178,0.25)] bg-[rgba(159,213,178,0.06)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#9fd5b2]">
                {course.name}
              </span>

              <span
                className={`rounded-lg border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  purchased
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                    : "border-[#f6ed4a]/20 bg-[#f6ed4a]/5 text-[#f6ed4a]"
                }`}
              >
                {purchased ? "Access unlocked" : "Locked chapter"}
              </span>
            </div>

            <h1 className="font-heading font-black text-2xl sm:text-4xl lg:text-5xl text-white tracking-tight leading-none pt-1">
              {chapter.title}
            </h1>

            <p className="max-w-3xl text-xs sm:text-sm font-medium text-white/50 leading-relaxed">
              {chapter.description || "Chapter operational specifications will load here once configured."}
            </p>
          </div>

          {/* LOWER REPOSITORY METRICS COHORT BAR */}
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 border-t border-[rgba(159,213,178,0.12)] bg-[#0d2035]/30 p-5 sm:p-6 w-full">
            <div className="rounded-lg border border-white/[0.04] bg-white/[0.01] p-4 flex flex-col justify-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                Chapter Lectures
              </p>
              <p className="mt-1 text-2xl font-heading font-black text-white leading-none">
                {stats.totalClasses}
              </p>
            </div>

            <div className="rounded-lg border border-white/[0.04] bg-white/[0.01] p-4 flex flex-col justify-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                Resource Files
              </p>
              <p className="mt-1 text-2xl font-heading font-black text-white leading-none">
                {stats.totalExercises}
              </p>
            </div>

            <div className="rounded-lg border border-white/[0.04] bg-white/[0.01] p-4 flex flex-col justify-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                Workstation Clearance
              </p>
              <p className="mt-1 text-xs font-bold text-white/80 leading-normal">
                {purchased
                  ? `${stats.unlockedClasses} modules ready to stream`
                  : "Unlock course to authorize links"}
              </p>
            </div>
          </div>
        </section>

        {/* LOCKED INTERCEPT ACCESS ALERT BANNER */}
        {!purchased && (
          <div className="flex flex-col gap-4 rounded-xl border border-[#f6ed4a]/20 bg-[#f6ed4a]/5 p-5 sm:flex-row sm:items-center sm:justify-between w-full">
            <div className="flex items-start gap-3 min-w-0">
              <FiLock className="text-xl text-[#f6ed4a] shrink-0 mt-0.5" />
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-[#f6ed4a] uppercase tracking-wide">
                  Classes are locked for this chapter
                </h2>
                <p className="mt-1 text-xs font-medium text-white/60 leading-relaxed">
                  You can review the lecture sequence outline mappings now. Complete the checkout verification to authorize your stream keys.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate(`/courses/${courseId}/chapters`)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-white/70 hover:bg-white/[0.05] cursor-pointer transition-colors shrink-0 self-start sm:self-auto"
            >
              <FiBookOpen className="text-xs" />
              View course overview
            </button>
          </div>
        )}

        {/* FEED SEQUENCE LABEL HEADERS */}
        <div className="flex items-end justify-between gap-4 border-b border-[rgba(159,213,178,0.12)] pb-4">
          <div className="text-center sm:text-left">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/35">
              Chapter Lessons
            </p>
            <h2 className="mt-1 font-heading font-black text-xl sm:text-2xl text-white tracking-tight">
              Watch the class sequence
            </h2>
          </div>

          <div className="hidden items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white/60 md:inline-flex select-none">
            <FiFileText className="text-[#9fd5b2] text-sm" />
            {stats.totalExercises} Resource Items Allocated
          </div>
        </div>

        {/* INTERACTIVE CLASSES MAP RENDER LOOP */}
        {classes.length === 0 ? (
          <div className="glass-card p-10 text-center flex flex-col items-center justify-center max-w-xl mx-auto shadow-xl">
            <p className="text-white/40 text-xs font-semibold uppercase tracking-wider">
              No operational lecture structures have been linked to this chapter yet.
            </p>
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
      </div>

      {/* RE-ARCHITECTED BRANDED WORKSPACE LIMIT POPUP MODAL */}
      {showPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-[#0d2035] border border-[rgba(159,213,178,0.15)] rounded-2xl p-6 sm:p-7 shadow-2xl flex flex-col relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#f6ed4a]/20 to-transparent" />
            
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[#f6ed4a]/10 border border-[#f6ed4a]/20 text-xl text-[#f6ed4a]">
              <FiLock />
            </div>

            <h2 className="text-center font-heading font-black text-xl sm:text-2xl text-white tracking-tight">
              Allocation Locked
            </h2>

            <p className="mt-3 text-center text-xs font-medium leading-relaxed text-white/50">
              Authorize this specific structural discipline stream from the main overview catalogue page to activate resources and source files.
            </p>

            <div className="mt-6 flex gap-3 w-full">
              <button
                type="button"
                onClick={() => setShowPopup(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider text-white/60 border border-white/[0.08] hover:border-white/20 hover:text-white transition-all duration-200 cursor-pointer"
              >
                Later
              </button>

              <button
                type="button"
                onClick={() => navigate(`/courses/${courseId}/chapters`)}
                className="flex-1 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider text-[#07192a] bg-[#f6ed4a] hover:shadow-[0_0_15px_rgba(246,237,74,0.2)] transition-all duration-200 cursor-pointer"
              >
                Go to overview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CourseClasses;
