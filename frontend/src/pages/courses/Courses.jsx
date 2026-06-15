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
    <div className="min-h-screen bg-[#07192a] relative overflow-hidden px-4 py-6 sm:py-8 font-body text-white antialiased selection:bg-[#f6ed4a] selection:text-[#07192a]">
      
      {/* Subtle brand ambient color spot */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] bg-[#9fd5b2] opacity-5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl space-y-6 sm:space-y-8">
        
        {/* HERO INSIGHT MODULE BANNER */}
        <section className="glass-card relative overflow-hidden flex flex-col shadow-2xl">
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[rgba(159,213,178,0.25)] to-transparent" />
          
          <div className="p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2 text-center lg:text-left">
              <p className="text-xs font-bold uppercase tracking-widest text-[#9fd5b2]">
                Learning Portal
              </p>
              <h1 className="font-heading font-black text-3xl sm:text-4xl md:text-5xl text-white tracking-tight leading-none mt-2">
                Course Hub
              </h1>
              <p className="max-w-xl text-xs sm:text-sm font-medium text-white/50 leading-relaxed pt-2">
                Browse your specialized technical library, jump directly back into active surveying lessons, and keep your next core class within reach.
              </p>
            </div>

            {/* Quick Metrics Columns */}
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 w-full lg:w-auto shrink-0">
              <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-4 text-center sm:text-left min-w-[120px]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                  Library
                </p>
                <p className="mt-1 text-2xl font-heading font-black text-white">
                  {stats.total}
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-4 text-center sm:text-left min-w-[120px]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                  Enrolled
                </p>
                <p className="mt-1 text-2xl font-heading font-black text-white">
                  {stats.enrolled}
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-4 text-center sm:text-left min-w-[120px]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                  Recordings
                </p>
                <p className="mt-1 text-2xl font-heading font-black text-white">
                  {stats.recordings}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* INTERACTIVE NAVIGATION CAPSULE BAR */}
        <div className="w-full">
          <CourseNavbar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            search={search}
            setSearch={setSearch}
          />
        </div>

        {/* FEED PARAMETER HEADINGS */}
        <div className="w-full flex items-end justify-between gap-4 border-b border-[rgba(159,213,178,0.12)] pb-4">
          <div className="text-center sm:text-left">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/35">
              Course Results
            </p>
            <h2 className="mt-1 font-heading font-black text-xl sm:text-2xl text-white tracking-tight">
              {loading ? "Loading library catalog..." : `${filtered.length} courses ready`}
            </h2>
          </div>
        </div>

        {/* DATA RENDERING FEED FLOW PIPELINE */}
        {loading ? (
          <div className="glass-card p-10 text-center flex items-center justify-center gap-3 shadow-xl">
            <svg className="animate-spin h-5 w-5 text-[#9fd5b2]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-xs font-bold uppercase tracking-widest text-white/40">Querying repository indexes...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card p-10 text-center flex flex-col items-center justify-center max-w-xl mx-auto shadow-xl">
            <h3 className="text-lg font-heading font-black text-white tracking-tight">
              No matching courses found
            </h3>
            <p className="mt-2 text-xs font-medium text-white/50 leading-relaxed">
              Try a different search term parameters or modify the category filter tab settings to widen the workspace results.
            </p>
          </div>
        ) : (
          /* Main Responsive Responsive Layout Catalog Feed Layout Grid */
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 w-full">
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
