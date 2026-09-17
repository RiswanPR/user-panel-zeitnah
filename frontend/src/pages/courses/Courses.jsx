import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  GraduationCap,
  Play,
  Video,
} from "lucide-react";
import CourseNavbar from "../../components/courses/CourseNavbar";
import FeaturedRecordingCard from "../../components/courses/FeaturedRecordingCard";
import RecordingCourseCard from "../../components/courses/RecordingCourseCard";
import OnlineCourseCarousel from "../../components/courses/OnlineCourseCarousel";
import ContinueLearning from "../../components/courses/ContinueLearning";
import api from "../../services/api";
import { useImagePreloader } from "../../hooks/useImagePreloader";

/* ══════════════════════════════════════════════════════════════════
   PRIORITIZATION HELPERS
   ══════════════════════════════════════════════════════════════════ */

/**
 * Sort recording courses:
 *   1. enrolled with active progress (in-progress)
 *   2. enrolled at 0%
 *   3. unenrolled
 */
function sortRecordingCourses(courses) {
  return [...courses].sort((a, b) => {
    const progA = a.learningProgress?.completionPercent ?? -1;
    const progB = b.learningProgress?.completionPercent ?? -1;
    const enrolledA =
      !!a.learningProgress || !!a.purchased || !!a.isPurchased || !!a.isEnrolled;
    const enrolledB =
      !!b.learningProgress || !!b.purchased || !!b.isPurchased || !!b.isEnrolled;

    if (enrolledA && progA > 0 && !(enrolledB && progB > 0)) return -1;
    if (enrolledB && progB > 0 && !(enrolledA && progA > 0)) return 1;
    if (enrolledA && !enrolledB) return -1;
    if (enrolledB && !enrolledA) return 1;
    return 0;
  });
}

/** Pick the single most-in-progress enrolled course for the Continue Learning banner */
function pickContinueCourse(courses) {
  return (
    courses
      .filter(
        (c) =>
          c.learningProgress &&
          c.learningProgress.completionPercent > 0 &&
          c.learningProgress.completionPercent < 100
      )
      .sort(
        (a, b) =>
          (b.learningProgress?.completionPercent ?? 0) -
          (a.learningProgress?.completionPercent ?? 0)
      )[0] || null
  );
}

/* ══════════════════════════════════════════════════════════════════
   LOADING SKELETONS
   ══════════════════════════════════════════════════════════════════ */

function ContinueSkeleton() {
  return (
    <div className="rounded-2xl border border-border-default bg-bg-card overflow-hidden p-5 sm:p-6 flex flex-col sm:flex-row gap-5">
      <div className="w-full sm:w-48 aspect-video sm:aspect-auto sm:h-28 shimmer rounded-xl shrink-0" />
      <div className="flex-1 space-y-3">
        <div className="h-4 w-40 shimmer rounded-md" />
        <div className="h-6 w-3/4 shimmer rounded-lg" />
        <div className="h-2 w-full shimmer rounded-full" />
      </div>
      <div className="w-full sm:w-40 h-11 shimmer rounded-xl shrink-0" />
    </div>
  );
}

function FeaturedSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border-default bg-bg-card">
      <div className="flex flex-col lg:flex-row lg:min-h-[420px]">
        <div className="w-full lg:w-[45%] aspect-[4/3] lg:aspect-auto shimmer" />
        <div className="flex flex-1 flex-col gap-5 p-6 lg:p-10">
          <div className="h-5 w-36 shimmer rounded-lg" />
          <div className="h-10 w-3/4 shimmer rounded-xl" />
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

function CarouselSkeletons() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex-none w-[calc(85vw-1rem)] sm:w-[300px] rounded-2xl border border-border-default bg-bg-card overflow-hidden">
          <div className="aspect-video shimmer" />
          <div className="p-4 space-y-3">
            <div className="h-4 w-3/4 shimmer rounded" />
            <div className="h-3 w-1/2 shimmer rounded" />
            <div className="h-10 w-full shimmer mt-2 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SECTION WRAPPER — editorial heading with vertical accent bar
   ══════════════════════════════════════════════════════════════════ */

function CourseSection({
  title,
  description,
  children,
  delay = 0,
  accentClass = "section-accent-recording",
  headerRight = null,
}) {
  const sectionId = `section-${title.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay }}
      aria-labelledby={sectionId}
    >
      <div className="mb-6 flex items-center gap-4 justify-between">
        <div className="flex items-start gap-3 min-w-0">
          {/* Vertical accent bar */}
          <div className={`section-accent-bar self-stretch min-h-[2.5rem] ${accentClass}`} />
          <div className="min-w-0">
            <h2
              id={sectionId}
              className="font-heading text-xl sm:text-2xl font-extrabold tracking-tight text-white leading-tight"
            >
              {title}
            </h2>
            {description && (
              <p className="mt-0.5 text-xs font-medium text-text-muted">{description}</p>
            )}
          </div>
        </div>
        {/* Slot for carousel controls, etc. */}
        {headerRight && (
          <div className="shrink-0">{headerRight}</div>
        )}
      </div>
      {children}
    </motion.section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   EMPTY STATE
   ══════════════════════════════════════════════════════════════════ */

function EmptyState({ search }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-2xl border border-border-default bg-bg-card p-14 text-center flex flex-col items-center justify-center max-w-lg mx-auto"
    >
      <div className="w-16 h-16 rounded-2xl bg-brand-mint/8 border border-brand-mint/15 flex items-center justify-center mb-5">
        <BookOpen className="w-7 h-7 text-brand-mint" />
      </div>
      <h3 className="text-lg font-heading font-bold text-white">
        {search ? "No matching courses" : "No courses available"}
      </h3>
      <p className="mt-2 text-sm font-medium text-text-muted leading-relaxed max-w-sm">
        {search
          ? "Try a different search term or clear the filter to see all courses."
          : "Your course library will appear here once courses are added."}
      </p>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════════════════ */

function Courses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  /* ── Data loading ── */
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
    return () => {
      mounted = false;
    };
  }, [activeTab]);

  /* ── Filtered + partitioned courses ── */
  const { recordingCourses, onlineCourses, allFiltered } = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = query
      ? courses.filter((c) => c.name?.toLowerCase().includes(query))
      : courses;

    const recordings = sortRecordingCourses(
      filtered.filter(
        (c) => String(c.type || "").trim().toLowerCase() === "recording"
      )
    );
    const online = filtered.filter(
      (c) => String(c.type || "").trim().toLowerCase() !== "recording"
    );

    return { recordingCourses: recordings, onlineCourses: online, allFiltered: filtered };
  }, [courses, search]);

  /* ── Stats (computed from unfiltered courses to always show full library counts) ── */
  const stats = useMemo(
    () => ({
      total: courses.length,
      enrolled: courses.filter((c) => !!c.learningProgress || !!c.purchased || !!c.isPurchased || !!c.isEnrolled).length,
      recordings: courses.filter(
        (c) => String(c.type || "").trim().toLowerCase() === "recording"
      ).length,
    }),
    [courses]
  );

  /* ── Continue Learning course (most in-progress) ── */
  const continueCourse = useMemo(() => pickContinueCourse(courses), [courses]);

  /* ── Featured + secondary recording courses ── */
  const [featuredRecording, ...secondaryRecordings] = recordingCourses;

  /* ── Preload images ── */
  const coverImageUrls = useMemo(
    () => allFiltered.map((c) => c.coverImage).filter(Boolean),
    [allFiltered]
  );
  useImagePreloader(coverImageUrls);

  /* ══════════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-10 sm:space-y-14">

      {/* ── Navigation / Filters ── */}
      <CourseNavbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        search={search}
        setSearch={setSearch}
      />

      {/* ══════════════════════════════════════════════════════════
          HERO — "YOUR LEARNING SPACE"
          ══════════════════════════════════════════════════════════ */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        aria-label="Course Hub hero"
        className="hero-noise relative overflow-hidden rounded-2xl border border-border-default bg-gradient-to-br from-bg-card via-bg-surface to-bg-card"
      >
        {/* Gradient accent line */}
        <div className="gradient-line-top" />

        {/* Ambient mint glow — top right */}
        <div className="hero-ambient-glow pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-brand-mint/8 blur-[100px]" />
        {/* Ambient blue glow — bottom left */}
        <div className="pointer-events-none absolute -left-10 bottom-0 h-56 w-56 rounded-full bg-info/4 blur-[80px]" />

        <div className="relative z-10 p-6 sm:p-8 md:p-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">

          {/* Left: heading group */}
          <div className="space-y-4 max-w-xl">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 rounded-lg bg-brand-mint/8 border border-brand-mint/15 px-3 py-1.5 text-[10px] font-bold text-brand-mint uppercase tracking-[0.18em]">
              <GraduationCap className="w-3 h-3" />
              Your Learning Space
            </div>

            {/* Headline */}
            <h1 className="font-heading font-extrabold text-3xl sm:text-4xl md:text-5xl text-white tracking-tight leading-[1.05]">
              Continue your{" "}
              <span className="text-gradient">learning.</span>
            </h1>

            {/* Sub-text */}
            <p className="text-sm font-medium text-text-muted leading-relaxed">
              Pick up where you left off or explore your next learning experience.
            </p>
          </div>

          {/* Right: stats */}
          {!loading && (
            <div className="grid gap-3 grid-cols-3 w-full lg:w-auto lg:max-w-xs shrink-0">
              {[
                { label: "Library", value: stats.total, icon: BookOpen },
                { label: "Enrolled", value: stats.enrolled, icon: GraduationCap },
                { label: "Recordings", value: stats.recordings, icon: Play },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3 sm:p-4 text-center"
                >
                  <stat.icon className="w-4 h-4 text-brand-mint mx-auto mb-1.5" />
                  <p className="text-[9px] font-bold uppercase tracking-widest text-text-muted">
                    {stat.label}
                  </p>
                  <p className="mt-0.5 text-xl sm:text-2xl font-heading font-extrabold text-white">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Stats skeleton while loading */}
          {loading && (
            <div className="grid gap-3 grid-cols-3 w-full lg:w-auto lg:max-w-xs shrink-0">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="rounded-xl border border-border-default bg-bg-elevated p-4">
                  <div className="h-4 w-4 shimmer rounded-full mx-auto mb-2" />
                  <div className="h-2 w-full shimmer rounded mb-1.5" />
                  <div className="h-7 w-2/3 shimmer rounded mx-auto" />
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.section>

      {/* ══════════════════════════════════════════════════════════
          LOADING STATE — Skeleton placeholders
          ══════════════════════════════════════════════════════════ */}
      {loading && (
        <div className="space-y-12">
          {/* Continue skeleton */}
          <ContinueSkeleton />

          {/* Featured skeleton */}
          <div>
            <div className="mb-6 flex items-center gap-3">
              <div className="h-10 w-0.5 shimmer rounded-full" />
              <div className="space-y-1.5">
                <div className="h-6 w-52 shimmer rounded-lg" />
                <div className="h-3 w-64 shimmer rounded" />
              </div>
            </div>
            <FeaturedSkeleton />
          </div>

          {/* Grid skeletons */}
          <div>
            <div className="mb-6 flex items-center gap-3">
              <div className="h-8 w-0.5 shimmer rounded-full" />
              <div className="space-y-1.5">
                <div className="h-5 w-40 shimmer rounded-lg" />
                <div className="h-3 w-56 shimmer rounded" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
              {[...Array(3)].map((_, i) => <CardSkeleton key={i} />)}
            </div>
          </div>

          {/* Carousel skeletons */}
          <div>
            <div className="mb-6 flex items-center gap-3">
              <div className="h-8 w-0.5 shimmer rounded-full" />
              <div className="space-y-1.5">
                <div className="h-5 w-36 shimmer rounded-lg" />
                <div className="h-3 w-52 shimmer rounded" />
              </div>
            </div>
            <CarouselSkeletons />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          EMPTY STATE
          ══════════════════════════════════════════════════════════ */}
      {!loading && allFiltered.length === 0 && (
        <EmptyState search={search} />
      )}

      {/* ══════════════════════════════════════════════════════════
          CONTINUE LEARNING — personalized banner
          ══════════════════════════════════════════════════════════ */}
      {!loading && continueCourse && (
        <ContinueLearning course={continueCourse} />
      )}

      {/* ══════════════════════════════════════════════════════════
          FEATURED RECORDING CLASS
          ══════════════════════════════════════════════════════════ */}
      {!loading && recordingCourses.length > 0 && (
        <CourseSection
          title="Featured Recording Class"
          description="Learn at your own pace with complete recorded sessions."
          icon={Play}
          delay={0.05}
          accentClass="section-accent-recording"
        >
          <div className="space-y-5">
            {/* Primary hero card */}
            {featuredRecording && (
              <FeaturedRecordingCard course={featuredRecording} />
            )}

            {/* ── More Recording Classes ── */}
            {secondaryRecordings.length > 0 && (
              <div className="pt-6">
                {/* Sub-section heading */}
                <div className="mb-5 flex items-center gap-3">
                  <div className="section-accent-bar self-stretch min-h-[1.75rem] section-accent-recording opacity-50" />
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-text-muted">
                    More Recording Classes
                  </p>
                </div>

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
              </div>
            )}
          </div>
        </CourseSection>
      )}

      {/* ══════════════════════════════════════════════════════════
          ONLINE CLASSES — HORIZONTAL CAROUSEL
          ══════════════════════════════════════════════════════════ */}
      {!loading && onlineCourses.length > 0 && (
        <CourseSection
          title="Online Classes"
          description="Join scheduled and live learning sessions."
          icon={Video}
          delay={recordingCourses.length > 0 ? 0.1 : 0.05}
          accentClass="section-accent-online"
        >
          <OnlineCourseCarousel courses={onlineCourses} />
        </CourseSection>
      )}

    </div>
  );
}

export default Courses;
