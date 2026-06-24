import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, GraduationCap, Video } from "lucide-react";
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
    return () => { mounted = false; };
  }, [activeTab]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return courses;
    return courses.filter((course) => course.name?.toLowerCase().includes(query));
  }, [courses, search]);

  const stats = useMemo(
    () => ({
      total: courses.length,
      enrolled: courses.filter((c) => !!c.learningProgress).length,
      recordings: courses.filter((c) => c.type === "Recording").length,
    }),
    [courses],
  );

  return (
    <div className="space-y-6 sm:space-y-8">

    

      {/* ── Navigation / Filters ── */}
      <CourseNavbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        search={search}
        setSearch={setSearch}
      />
        {/* ── Hero Header ── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-bg-card via-bg-surface to-bg-card border border-border-default"
      >
        <div className="gradient-line-top" />

        {/* Ambient glow */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-brand-mint/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-lg bg-brand-mint/8 border border-brand-mint/15 px-3 py-1.5 text-xs font-semibold text-brand-mint uppercase tracking-wider">
              <GraduationCap className="w-3.5 h-3.5" />
              Learning Portal
            </div>
            <h1 className="font-heading font-extrabold text-3xl sm:text-4xl md:text-5xl text-white tracking-tight leading-none">
              Course Hub
            </h1>
            <p className="max-w-xl text-sm font-medium text-text-muted leading-relaxed">
              Browse your specialized library, continue active lessons, and discover new learning paths.
            </p>
          </div>

          {/* Quick stats */}
          <div className="grid gap-3 grid-cols-3 w-full lg:w-auto shrink-0 lg:max-w-xs">
            {[
              { label: "Library", value: stats.total, icon: BookOpen },
              { label: "Enrolled", value: stats.enrolled, icon: GraduationCap },
              { label: "Recordings", value: stats.recordings, icon: Video },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3 sm:p-4 text-center"
              >
                <stat.icon className="w-4 h-4 text-brand-mint mx-auto mb-1.5" />
                <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                  {stat.label}
                </p>
                <p className="mt-0.5 text-xl sm:text-2xl font-heading font-extrabold text-white">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>
      {/* ── Results Header ── */}
      <div className="flex items-end justify-between gap-4 border-b border-border-default pb-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
            Course Results
          </p>
          <h2 className="mt-1 font-heading font-bold text-xl sm:text-2xl text-white tracking-tight">
            {loading ? "Loading courses..." : `${filtered.length} courses available`}
          </h2>
        </div>
      </div>

      {/* ── Content Grid ── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-border-default bg-bg-card overflow-hidden">
              <div className="aspect-video w-full shimmer" />
              <div className="p-5 space-y-3">
                <div className="h-4 w-3/4 shimmer" />
                <div className="h-3 w-full shimmer" />
                <div className="h-3 w-2/3 shimmer" />
                <div className="h-10 w-full shimmer mt-4" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl border border-border-default bg-bg-card p-12 text-center flex flex-col items-center justify-center max-w-xl mx-auto"
        >
          <div className="w-16 h-16 rounded-2xl bg-brand-mint/8 border border-brand-mint/15 flex items-center justify-center mb-4">
            <BookOpen className="w-7 h-7 text-brand-mint" />
          </div>
          <h3 className="text-lg font-heading font-bold text-white">No matching courses</h3>
          <p className="mt-2 text-sm font-medium text-text-muted leading-relaxed">
            Try a different search term or adjust the filter to find what you're looking for.
          </p>
        </motion.div>
      ) : (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.06 } },
          }}
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 w-full"
        >
          {filtered.map((course) => (
            <CourseCard key={course._id} course={course} />
          ))}
        </motion.div>
      )}
    </div>
  );
}

export default Courses;
