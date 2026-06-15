import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  FiArrowLeft,  
  FiBookOpen,
  FiCheckCircle,
  FiLock,
  FiPlayCircle,
} from "react-icons/fi";

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

    loadChapters();

    return () => {
      mounted = false;
    };
  }, [courseId]);

  const totalClasses = useMemo(
    () =>
      data?.chapters?.reduce(
        (sum, chapter) => sum + (chapter.totalClasses || 0),
        0,
      ) || 0,
    [data],
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07192a] text-white font-body">
        <div className="flex items-center gap-3">
          <svg className="animate-spin h-5 w-5 text-[#9fd5b2]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm font-semibold uppercase tracking-widest text-white/60">Loading Syllabus Modules…</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07192a] px-4 text-center text-white/60 font-body text-sm uppercase tracking-wider">
        Unable to load the course chapters right now.
      </div>
    );
  }

  const {
    course,
    chapters,
    purchased,
  } = data;
  const learningProgress = course.learningProgress;
  const completionPercent = learningProgress?.completionPercent || 0;
  const completedClasses = learningProgress?.completedClasses || 0;

  const imageUrl = getUploadUrl(course.image) || "https://placehold.co/1200x500";

  return (
    <div className="min-h-screen bg-[#07192a] relative overflow-hidden px-4 py-6 sm:py-8 font-body text-white antialiased selection:bg-[#f6ed4a] selection:text-[#07192a]">
      
      {/* Decorative ambient branded visual spot */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[350px] h-[350px] bg-[#9fd5b2] opacity-5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl space-y-6 sm:space-y-8">
        
        {/* BACK TO DASHBOARD ROUTE NAVIGATION TRIGGER */}
        <div className="flex justify-between items-center w-full">
          <button
            type="button"
            onClick={() => navigate("/courses")}
            className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white/70 transition-all hover:border-[rgba(159,213,178,0.3)] hover:text-[#9fd5b2] cursor-pointer"
          >
            <FiArrowLeft className="text-sm shrink-0" />
            Back to courses
          </button>
        </div>

        {/* HERO FEATURE INTERIOR COVER CARD CONTAINER */}
        <section className="glass-card relative overflow-hidden flex flex-col shadow-2xl">
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[rgba(159,213,178,0.25)] to-transparent z-20" />
          
          {/* Cover Art Banner Media Frame */}
          <div className="relative h-[240px] sm:h-[300px] w-full bg-[#0d2035]">
            <img
              src={imageUrl}
              alt={course.name}
              className="h-full w-full object-cover"
            />
            {/* Multi-viewport linear visual shields to protect type layout layers */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#07192a] via-[#07192a]/80 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#07192a] via-transparent to-transparent" />

            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8 flex flex-col justify-end">
              <div className="mb-3.5 flex flex-wrap gap-2">
                <span className="rounded-lg border border-[rgba(159,213,178,0.25)] bg-[rgba(159,213,178,0.06)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#9fd5b2]">
                  {course.type}
                </span>

                <span
                  className={`rounded-lg border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    purchased
                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                      : "border-[#f6ed4a]/20 bg-[#f6ed4a]/5 text-[#f6ed4a]"
                  }`}
                >
                  {purchased ? "Course unlocked" : "Purchase required"}
                </span>
              </div>

              <h1 className="max-w-3xl font-heading font-black text-2xl sm:text-4xl md:text-5xl text-white tracking-tight leading-none truncate">
                {course.name}
              </h1>

              <p className="mt-3 max-w-2xl text-xs sm:text-sm font-medium text-white/50 leading-relaxed line-clamp-2 sm:line-clamp-none">
                {course.description || "Course structural details will appear here once configuration parameters sync."}
              </p>
            </div>
          </div>

          {/* LOWER METRICS REPOSITORY BAR GRID */}
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 border-t border-[rgba(159,213,178,0.12)] bg-[#0d2035]/30 p-5 sm:p-6 w-full">
            <div className="rounded-lg border border-white/[0.04] bg-white/[0.01] p-4 flex flex-col justify-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                Syllabus Chapters
              </p>
              <p className="mt-1 text-2xl font-heading font-black text-white leading-none">
                {chapters.length}
              </p>
            </div>

            <div className="rounded-lg border border-white/[0.04] bg-white/[0.01] p-4 flex flex-col justify-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                Operational Lectures
              </p>
              <p className="mt-1 text-2xl font-heading font-black text-white leading-none">
                {totalClasses}
              </p>
            </div>

            <div className="rounded-lg border border-white/[0.04] bg-white/[0.01] p-4 flex flex-col justify-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                Workstation Access Status
              </p>
              <p className="mt-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-white/80">
                {purchased ? (
                  <FiCheckCircle className="text-emerald-400 text-sm shrink-0" />
                ) : (
                  <FiLock className="text-[#f6ed4a] text-sm shrink-0" />
                )}
                {purchased ? "Ready to stream" : "Locked allocation"}
              </p>
            </div>
          </div>

          {/* INTERNAL ALLOCATION COMPONENT PROGRESS TRACK */}
          {purchased ? (
            <div className="border-t border-[rgba(159,213,178,0.12)] bg-[#0d2035]/20 px-5 sm:px-6 pb-5 sm:pb-6 pt-0 w-full">
              <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-4 flex flex-col w-full">
                <div className="mb-2.5 flex items-center justify-between text-xs font-medium text-white/70">
                  <span className="font-bold">
                    {completionPercent >= 100 ? "Course Complete 🎉" : "Overall Metrics Progress"}
                  </span>
                  <span className="font-bold text-[#9fd5b2]">{completionPercent}%</span>
                </div>

                <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#9fd5b2] to-[#f6ed4a] transition-all duration-500 ease-out"
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>

                <p className="mt-2.5 text-[10px] font-bold uppercase tracking-wider text-white/40">
                  {completedClasses} of {totalClasses} lesson assets completed
                </p>
              </div>
            </div>
          ) : null}
        </section>

        {/* LOCKED ALERT INTERCEPT CALL BANNER */}
        {!purchased && (
          <div className="flex flex-col gap-4 rounded-xl border border-[#f6ed4a]/20 bg-[#f6ed4a]/5 p-5 sm:flex-row sm:items-center sm:justify-between w-full">
            <div className="flex items-start gap-3 min-w-0">
              <FiLock className="text-xl text-[#f6ed4a] shrink-0 mt-0.5" />
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-[#f6ed4a] uppercase tracking-wide">
                  This core allocation track is locked
                </h2>
                <p className="mt-1 text-xs font-medium text-white/60 leading-relaxed">
                  You can map out the technical chapter roadmap architecture now. To stream the individual lessons, unlock the complete profile asset.
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white/70 select-none self-start sm:self-auto shrink-0">
              <FiPlayCircle className="text-sm" />
              Lecture Previews Indexed Below
            </span>
          </div>
        )}

        {/* SYLLABUS LIST HEADER PARAMETERS */}
        <div className="flex items-end justify-between gap-4 border-b border-[rgba(159,213,178,0.12)] pb-4">
          <div className="text-center sm:text-left">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/35">
              Course Roadmap
            </p>
            <h2 className="mt-1 font-heading font-black text-xl sm:text-2xl text-white tracking-tight">
              Explore the chapter flow
            </h2>
          </div>

          <div className="hidden items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white/60 md:inline-flex select-none">
            <FiBookOpen className="text-[#9fd5b2] text-sm" />
            {chapters.length} Modules Indexed
          </div>
        </div>

        {/* DATA SYLLABUS FEED LAYOUT FLOW */}
        {chapters.length === 0 ? (
          <div className="glass-card p-10 text-center flex flex-col items-center justify-center max-w-xl mx-auto shadow-xl">
            <p className="text-white/40 text-xs font-semibold uppercase tracking-wider">
              No structural syllabus chapters have been published to this catalog.
            </p>
          </div>
        ) : (
          /* Responsive Flow Grid for Chapters Layout Matrix */
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 w-full">
            {chapters.map((chapter, index) => (
              <ChapterCard
                key={chapter.uniqueCode}
                chapter={chapter}
                index={index}
                onOpen={() =>
                  navigate(`/courses/${courseId}/chapters/${chapter.uniqueCode}/classes`)
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CourseChapters;
