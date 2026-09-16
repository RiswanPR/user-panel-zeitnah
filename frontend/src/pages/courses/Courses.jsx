import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, GraduationCap, Play, Video } from "lucide-react";
import CourseNavbar from "../../components/courses/CourseNavbar";
import FeaturedRecordingCard from "../../components/courses/FeaturedRecordingCard";
import RecordingCourseCard from "../../components/courses/RecordingCourseCard";
import OnlineCourseCard from "../../components/courses/OnlineCourseCard";
import api from "../../services/api";
import { useImagePreloader } from "../../hooks/useImagePreloader";

/* ── Prioritization helpers ─────────────────────────────────────── */

/**
 * Sort recording courses so enrolled-with-progress comes first,
 * then enrolled-no-progress, then unenrolled.
 */
function sortRecordingCourses(courses) {
  return [...courses].sort((a, b) => {
    const progA = a.learningProgress?.completionPercent ?? -1;
    const progB = b.learningProgress?.completionPercent ?? -1;
    const enrolledA = !!a.learningProgress || !!a.purchased || !!a.isPurchased || !!a.isEnrolled;
    const enrolledB = !!b.learningProgress || !!b.purchased || !!b.isPurchased || !!b.isEnrolled;

    // enrolled with active progress first
    if (enrolledA && progA > 0 && !(enrolledB && progB > 0)) return -1;
    if (enrolledB && progB > 0 && !(enrolledA && progA > 0)) return 1;

    // then enrolled (0% progress)
    if (enrolledA && !enrolledB) return -1;
    if (enrolledB && !enrolledA) return 1;

    return 0;
  });
}

/* ── Loading Skeletons ──────────────────────────────────────────── */

function FeaturedSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border-default bg-bg-card">
      <div className="flex flex-col lg:flex-row lg:min-h-[340px]">
        <div className="w-full lg:w-[42%] aspect-video lg:aspect-auto shimmer" />
        <div className="flex flex-1 flex-col gap-4 p-6 lg:p-8">
          <div className="h-5 w-32 shimmer rounded-lg" />
          <div className="h-8 w-3/4 shimmer rounded-lg" />
          <div className="h-4 w-full shimmer rounded-lg" />
          <div className="h-4 w-2/3 shimmer rounded-lg" />
          <div className="mt-auto h-14 w-full shimmer rounded-xl" />
          <div className="h-12 w-full shimmer rounded-xl" />
        </div>
      </div>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-border-default bg-bg-card overflow-hidden">
      <div className="aspect-video w-full shimmer" />
      <div className="p-5 space-y-3">
        <div className="h-4 w-3/4 shimmer" />
        <div className="h-3 w-full shimmer" />
        <div className="h-3 w-2/3 shimmer" />
        <div className="h-10 w-full shimmer mt-4" />
      </div>
    </div>
  );
}

/* ── Section wrapper ────────────────────────────────────────────── */

function CourseSection({ title, description, icon: Icon, children, delay = 0 }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay }}
      aria-labelledby={`section-${title.replace(/\s+/g, "-").toLowerCase()}`}
    >
      <div className="mb-5 flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-brand-mint/15 bg-brand-mint/8">
          <Icon className="h-4 w-4 text-brand-mint" />
        </div>
        <div>
          <h2
            id={`section-${title.replace(/\s+/g, "-").toLowerCase()}`}
            className="font-heading text-lg font-bold tracking-tight text-white sm:text-xl"
          >
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-xs font-medium text-text-muted">{description}</p>
          )}
        </div>
      </div>
      {children}
    </motion.section>
  );
}

/* ── Main Page ──────────────────────────────────────────────────── */

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
        if (mounted) setLoading(false);
      }
    };
    loadCourses();
    return () => { mounted = false; };
  }, [activeTab]);

  /* ── Filtered + partitioned courses ── */
  const { recordingCourses, onlineCourses, allFiltered } = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = query
      ? courses.filter((c) => c.name?.toLowerCase().includes(query))
      : courses;

    const recordings = sortRecordingCourses(
      filtered.filter((c) => String(c.type || "").trim().toLowerCase() === "recording")
    );
    const online = filtered.filter(
      (c) => String(c.type || "").trim().toLowerCase() !== "recording"
    );

    return { recordingCourses: recordings, onlineCourses: online, allFiltered: filtered };
  }, [courses, search]);

  /* ── Stats ── */
  const stats = useMemo(
    () => ({
      total: courses.length,
      enrolled: courses.filter((c) => !!c.learningProgress).length,
      recordings: courses.filter(
        (c) => String(c.type || "").trim().toLowerCase() === "recording"
      ).length,
    }),
    [courses]
  );

  /* ── Preload images ── */
  const coverImageUrls = useMemo(
    () => allFiltered.map((c) => c.coverImage).filter(Boolean),
    [allFiltered]
  );
  useImagePreloader(coverImageUrls);

  /* ── Featured + secondary recording courses ── */
  const [featuredRecording, ...secondaryRecordings] = recordingCourses;

  return (
    <div className="space-y-8 sm:space-y-10">

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
              { label: "Recordings", value: stats.recordings, icon: Play },
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

      {/* ── Results header ── */}
      <div className="flex items-end justify-between gap-4 border-b border-border-default pb-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
            Course Results
          </p>
          <h2 className="mt-1 font-heading font-bold text-xl sm:text-2xl text-white tracking-tight">
            {loading
              ? "Loading courses..."
              : `${allFiltered.length} ${allFiltered.length === 1 ? "course" : "courses"} available`}
          </h2>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          LOADING STATE
      ═══════════════════════════════════════════════════════════ */}
      {loading && (
        <div className="space-y-8">
          {/* Featured skeleton */}
          <div>
            <div className="mb-5 flex items-start gap-3">
              <div className="h-8 w-8 shimmer rounded-lg" />
              <div className="space-y-2">
                <div className="h-5 w-48 shimmer rounded-lg" />
                <div className="h-3 w-64 shimmer rounded-lg" />
              </div>
            </div>
            <FeaturedSkeleton />
          </div>

          {/* Grid skeletons */}
          <div>
            <div className="mb-5 flex items-start gap-3">
              <div className="h-8 w-8 shimmer rounded-lg" />
              <div className="space-y-2">
                <div className="h-5 w-36 shimmer rounded-lg" />
                <div className="h-3 w-56 shimmer rounded-lg" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          EMPTY STATE
      ═══════════════════════════════════════════════════════════ */}
      {!loading && allFiltered.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl border border-border-default bg-bg-card p-12 text-center flex flex-col items-center justify-center max-w-xl mx-auto"
        >
          <div className="w-16 h-16 rounded-2xl bg-brand-mint/8 border border-brand-mint/15 flex items-center justify-center mb-4">
            <BookOpen className="w-7 h-7 text-brand-mint" />
          </div>
          <h3 className="text-lg font-heading font-bold text-white">
            No matching courses
          </h3>
          <p className="mt-2 text-sm font-medium text-text-muted leading-relaxed">
            Try a different search term or adjust the filter to find what you're looking for.
          </p>
        </motion.div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          RECORDING CLASSES — FEATURED SECTION
      ═══════════════════════════════════════════════════════════ */}
      {!loading && recordingCourses.length > 0 && (
        <CourseSection
          title="Featured Recording Classes"
          description="Access complete recorded sessions and learn at your own pace."
          icon={Play}
          delay={0.05}
        >
          <div className="space-y-4 sm:space-y-5">
            {/* Primary hero card */}
            {featuredRecording && (
              <FeaturedRecordingCard course={featuredRecording} />
            )}

            {/* Secondary recording cards */}
            {secondaryRecordings.length > 0 && (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: {},
                  visible: { transition: { staggerChildren: 0.07 } },
                }}
                className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5"
              >
                {secondaryRecordings.map((course) => (
                  <RecordingCourseCard key={course._id} course={course} />
                ))}
              </motion.div>
            )}
          </div>
        </CourseSection>
      )}

      {/* ═══════════════════════════════════════════════════════════
          ONLINE CLASSES SECTION
      ═══════════════════════════════════════════════════════════ */}
      {!loading && onlineCourses.length > 0 && (
        <CourseSection
          title="Online Classes"
          description="Join scheduled live learning sessions."
          icon={Video}
          delay={recordingCourses.length > 0 ? 0.1 : 0.05}
        >
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.06 } },
            }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 w-full"
          >
            {onlineCourses.map((course) => (
              <OnlineCourseCard key={course._id} course={course} />
            ))}
          </motion.div>
        </CourseSection>
      )}
    </div>
  );
}

export default Courses;
