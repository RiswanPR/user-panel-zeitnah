import {
  useEffect,
  useMemo,
  useState,
} from "react";

import CourseCard from "../../components/courses/CourseCard";
import CourseNavbar from "../../components/courses/CourseNavbar";
import api from "../../services/api";

function Courses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    let mounted = true;

    const loadCourses = async () => {
      try {
        setLoading(true);

        let endpoint = "/courses";

        if (activeTab === "my") {
          endpoint = "/courses/my";
        } else if (activeTab !== "all") {
          endpoint = `/courses?type=${activeTab}`;
        }

        const res = await api.get(endpoint);

        if (mounted) {
          setCourses(res.data.courses || []);
        }
      } catch (error) {
        console.log(error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadCourses();

    return () => {
      mounted = false;
    };
  }, [activeTab]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return courses;
    }

    return courses.filter((course) =>
      course.name?.toLowerCase().includes(query),
    );
  }, [courses, search]);

  const stats = useMemo(
    () => ({
      total: courses.length,
      enrolled: courses.filter((course) => !!course.learningProgress).length,
      recordings: courses.filter((course) => course.type === "Recording").length,
    }),
    [courses],
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a0a] px-4 py-8">
      <div className="absolute left-[-100px] top-[-120px] h-[420px] w-[420px] rounded-full bg-cyan-500/10 blur-[120px]" />
      <div className="absolute bottom-[-100px] right-[-80px] h-[360px] w-[360px] rounded-full bg-violet-600/10 blur-[100px]" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <section className="overflow-hidden rounded-[34px] border border-white/[0.08] bg-[#111111]/92 shadow-[0_24px_90px_rgba(0,0,0,0.28)]">
          <div className="p-6 sm:p-8">
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/60">
              Learning Portal
            </p>

            <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="font-['Sora'] text-3xl font-semibold text-white sm:text-5xl">
                  Course Hub
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/60 sm:text-base">
                  Browse your library, jump back into active lessons, and keep the next class within reach.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.03] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/40">
                    Library
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {stats.total}
                  </p>
                </div>

                <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.03] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/40">
                    Enrolled
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {stats.enrolled}
                  </p>
                </div>

                <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.03] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/40">
                    Recordings
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {stats.recordings}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-8">
          <CourseNavbar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            search={search}
            setSearch={setSearch}
          />
        </div>

        <div className="mt-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-white/35">
              Course Results
            </p>
            <h2 className="mt-2 font-['Sora'] text-2xl font-semibold text-white">
              {loading ? "Loading your library" : `${filtered.length} courses ready`}
            </h2>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 rounded-[30px] border border-white/[0.08] bg-[#111111]/90 p-10 text-center text-white/50">
            Loading courses...
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-6 rounded-[30px] border border-white/[0.08] bg-[#111111]/90 p-10 text-center">
            <h3 className="text-xl font-semibold text-white">
              No courses found
            </h3>
            <p className="mt-3 text-sm leading-7 text-white/55">
              Try a different search term or switch the course filter to widen the results.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filtered.map((course) => (
              <CourseCard
                key={course._id}
                course={course}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Courses;
