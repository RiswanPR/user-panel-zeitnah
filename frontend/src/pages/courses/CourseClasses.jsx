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
  FiFileText,
  FiLock,
} from "react-icons/fi";

import ClassCard from "../../components/courses/ClassCard";
import api from "../../services/api";

function CourseClasses() {
  const {
    chapterCode,
    courseId,
  } = useParams();

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
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] text-white">
        Loading...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4 text-center text-white/70">
        Unable to load the chapter classes right now.
      </div>
    );
  }

  const {
    chapter,
    classes,
    course,
    purchased,
  } = data;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a0a] px-4 py-8">
      <div className="absolute left-[-120px] top-[-120px] h-[420px] w-[420px] rounded-full bg-cyan-500/10 blur-[120px]" />
      <div className="absolute bottom-[-80px] right-[-80px] h-[360px] w-[360px] rounded-full bg-violet-500/10 blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <button
          type="button"
          onClick={() => navigate(`/courses/${courseId}/chapters`)}
          className="mb-6 inline-flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-[#111111]/85 px-4 py-2 text-sm text-white/70 transition-all hover:border-cyan-400/20 hover:text-cyan-200"
        >
          <FiArrowLeft />
          Back to chapters
        </button>

        <section className="overflow-hidden rounded-[34px] border border-white/[0.08] bg-[#111111]/92 shadow-[0_24px_90px_rgba(0,0,0,0.28)]">
          <div className="relative p-6 sm:p-8">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent opacity-70" />

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-200">
                {course.name}
              </span>

              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  purchased
                    ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                    : "border-yellow-400/20 bg-yellow-500/10 text-yellow-200"
                }`}
              >
                {purchased ? "Access unlocked" : "Locked chapter"}
              </span>
            </div>

            <h1 className="mt-5 max-w-3xl font-['Sora'] text-3xl font-semibold text-white sm:text-5xl">
              {chapter.title}
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/60 sm:text-base">
              {chapter.description || "Chapter details will appear here once they are added."}
            </p>
          </div>

          <div className="grid gap-4 border-t border-white/[0.08] bg-black/20 p-6 md:grid-cols-3">
            <div className="rounded-[26px] border border-white/[0.08] bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-white/40">
                Classes
              </p>
              <p className="mt-3 text-2xl font-semibold text-white">
                {stats.totalClasses}
              </p>
            </div>

            <div className="rounded-[26px] border border-white/[0.08] bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-white/40">
                Exercises
              </p>
              <p className="mt-3 text-2xl font-semibold text-white">
                {stats.totalExercises}
              </p>
            </div>

            <div className="rounded-[26px] border border-white/[0.08] bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-white/40">
                Access
              </p>
              <p className="mt-3 text-sm font-medium text-white/80">
                {purchased
                  ? `${stats.unlockedClasses} classes ready to watch`
                  : "Unlock the course to watch every lesson"}
              </p>
            </div>
          </div>
        </section>

        {!purchased && (
          <div className="mt-6 flex flex-col gap-3 rounded-[28px] border border-yellow-400/20 bg-yellow-500/10 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <FiLock className="mt-1 text-xl text-yellow-300" />

              <div>
                <h2 className="text-base font-semibold text-yellow-100">
                  Classes are locked for this chapter
                </h2>
                <p className="mt-1 text-sm leading-6 text-yellow-100/75">
                  You can review the lesson outline now and unlock the course when you are ready to continue.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate(`/courses/${courseId}/chapters`)}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-yellow-400/20 bg-black/20 px-4 py-2 text-sm font-medium text-yellow-100/85"
            >
              <FiBookOpen />
              View course overview
            </button>
          </div>
        )}

        <div className="mt-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-white/35">
              Chapter Lessons
            </p>
            <h2 className="mt-2 font-['Sora'] text-2xl font-semibold text-white">
              Watch the class sequence
            </h2>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-white/60 md:inline-flex">
            <FiFileText className="text-cyan-300" />
            {stats.totalExercises} resource items
          </div>
        </div>

        {classes.length === 0 ? (
          <div className="mt-6 rounded-[30px] border border-white/[0.08] bg-[#111111]/90 p-8 text-center text-white/60">
            No classes have been added to this chapter yet.
          </div>
        ) : (
          <div className="mt-6 space-y-5">
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

      {showPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[32px] border border-white/[0.08] bg-[#111111] p-7 shadow-[0_30px_100px_rgba(0,0,0,0.45)]">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-yellow-400/20 bg-yellow-500/10 text-2xl text-yellow-300">
              <FiLock />
            </div>

            <h2 className="text-center text-2xl font-semibold text-white">
              Course Locked
            </h2>

            <p className="mt-3 text-center text-sm leading-7 text-white/55">
              Unlock this course from the overview page to watch the lessons and access the chapter resources.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowPopup(false)}
                className="flex-1 rounded-2xl border border-white/[0.08] px-4 py-3 text-sm font-medium text-white/75 transition-all hover:border-white/[0.14]"
              >
                Later
              </button>

              <button
                type="button"
                onClick={() => navigate(`/courses/${courseId}/chapters`)}
                className="flex-1 rounded-2xl border border-cyan-400/20 bg-gradient-to-r from-cyan-500/12 to-violet-500/12 px-4 py-3 text-sm font-medium text-cyan-200 transition-all hover:shadow-[0_18px_45px_rgba(34,211,238,0.14)]"
              >
                Back to overview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CourseClasses;
