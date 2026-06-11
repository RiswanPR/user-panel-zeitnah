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
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] text-white">
        Loading...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4 text-center text-white/70">
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

  const imageUrl =
    getUploadUrl(course.image) || "https://placehold.co/1200x500";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a0a] px-4 py-8">
      <div className="absolute left-[-100px] top-[-120px] h-[420px] w-[420px] rounded-full bg-cyan-500/10 blur-[120px]" />
      <div className="absolute bottom-[-80px] right-[-80px] h-[360px] w-[360px] rounded-full bg-violet-500/10 blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <button
          type="button"
          onClick={() => navigate("/courses")}
          className="mb-6 inline-flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-[#111111]/85 px-4 py-2 text-sm text-white/70 transition-all hover:border-cyan-400/20 hover:text-cyan-200"
        >
          <FiArrowLeft />
          Back to courses
        </button>

        <div className="overflow-hidden rounded-[34px] border border-white/[0.08] bg-[#111111]/90 shadow-[0_24px_90px_rgba(0,0,0,0.28)]">
          <div className="relative h-[300px]">
            <img
              src={imageUrl}
              alt={course.name}
              className="h-full w-full object-cover"
            />

            <div className="absolute inset-0 bg-gradient-to-r from-[#080808] via-[#080808]/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-transparent to-transparent" />

            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
              <div className="mb-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-200">
                  {course.type}
                </span>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    purchased
                      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                      : "border-yellow-400/20 bg-yellow-500/10 text-yellow-200"
                  }`}
                >
                  {purchased ? "Course unlocked" : "Purchase required"}
                </span>
              </div>

              <h1 className="max-w-3xl font-['Sora'] text-3xl font-semibold text-white sm:text-5xl">
                {course.name}
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/60 sm:text-base">
                {course.description || "Course details will appear here once they are added."}
              </p>
            </div>
          </div>

          <div className="grid gap-4 border-t border-white/[0.08] bg-black/20 p-6 sm:grid-cols-3">
            <div className="rounded-[26px] border border-white/[0.08] bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-white/40">
                Chapters
              </p>
              <p className="mt-3 text-2xl font-semibold text-white">
                {chapters.length}
              </p>
            </div>

            <div className="rounded-[26px] border border-white/[0.08] bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-white/40">
                Lessons
              </p>
              <p className="mt-3 text-2xl font-semibold text-white">
                {totalClasses}
              </p>
            </div>

            <div className="rounded-[26px] border border-white/[0.08] bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-white/40">
                Access
              </p>
              <p className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-white/80">
                {purchased ? (
                  <FiCheckCircle className="text-emerald-300" />
                ) : (
                  <FiLock className="text-yellow-300" />
                )}
                {purchased ? "Ready to learn" : "Locked until purchase"}
              </p>
            </div>
          </div>

          {purchased ? (
            <div className="border-t border-white/[0.08] bg-black/20 px-6 pb-6">
              <div className="rounded-[26px] border border-white/[0.08] bg-white/[0.03] p-4">
                <div className="mb-3 flex items-center justify-between text-sm text-white/65">
                  <span>
                    {completionPercent >= 100
                      ? "Course Completed 🎉"
                      : "Course progress"}
                  </span>
                  <span>{completionPercent}%</span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-300 transition-all duration-500"
                    style={{
                      width: `${completionPercent}%`,
                    }}
                  />
                </div>

                <p className="mt-3 text-xs text-white/50">
                  {completedClasses}/{totalClasses} lessons completed
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {!purchased && (
          <div className="mt-6 flex flex-col gap-3 rounded-[28px] border border-yellow-400/20 bg-yellow-500/10 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <FiLock className="mt-1 text-xl text-yellow-300" />

              <div>
                <h2 className="text-base font-semibold text-yellow-100">
                  This course is still locked
                </h2>
                <p className="mt-1 text-sm leading-6 text-yellow-100/75">
                  You can browse the chapter structure now, then unlock the course to watch each lesson.
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-2 rounded-full border border-yellow-400/20 bg-black/20 px-4 py-2 text-sm text-yellow-100/85">
              <FiPlayCircle />
              Lesson previews shown below
            </span>
          </div>
        )}

        <div className="mt-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-white/35">
              Course Roadmap
            </p>
            <h2 className="mt-2 font-['Sora'] text-2xl font-semibold text-white">
              Explore the chapter flow
            </h2>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-white/60 md:inline-flex">
            <FiBookOpen className="text-cyan-300" />
            {chapters.length} modules
          </div>
        </div>

        {chapters.length === 0 ? (
          <div className="mt-6 rounded-[30px] border border-white/[0.08] bg-[#111111]/90 p-8 text-center text-white/60">
            No chapters have been added to this course yet.
          </div>
        ) : (
          <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
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
