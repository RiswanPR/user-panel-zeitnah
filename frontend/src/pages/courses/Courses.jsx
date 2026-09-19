import { useEffect, useMemo, useState, useContext, useCallback } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  GraduationCap,
  Play,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import CourseNavbar from "../../components/courses/CourseNavbar";
import FeaturedRecordingCard from "../../components/courses/FeaturedRecordingCard";
import RecordingCourseCard from "../../components/courses/RecordingCourseCard";
import OnlineCourseCarousel from "../../components/courses/OnlineCourseCarousel";
import ContinueLearning from "../../components/courses/ContinueLearning";
import LeaderboardPreview from "../../components/courses/LeaderboardPreview";
import api from "../../services/api";
import { useImagePreloader } from "../../hooks/useImagePreloader";
import { AuthContext } from "../../context/AuthContext";

/* ══════════════════════════════════════════════════════════════════
   PRIORITIZATION & SORTING HELPERS
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
   LOADING SKELETONS (Exact dimensions to eliminate CLS)
   ══════════════════════════════════════════════════════════════ */

function ContinueSkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-bg-card p-5 sm:p-6 flex flex-col sm:flex-row gap-5 items-start sm:items-center">
      <div className="w-full sm:w-44 md:w-52 aspect-video shimmer rounded-xl shrink-0" />
      <div className="flex-1 space-y-3 w-full">
        <div className="h-3 w-28 shimmer rounded" />
        <div className="h-6 w-3/4 shimmer rounded-lg" />
        <div className="h-2 w-full shimmer rounded-full mt-2" />
      </div>
      <div className="w-full sm:w-36 h-11 shimmer rounded-xl shrink-0" />
    </div>
  );
}

function FeaturedSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-bg-card">
      <div className="flex flex-col lg:flex-row items-stretch">
        <div
          className="w-full lg:w-1/2 aspect-video shrink-0 shimmer"
          style={{ aspectRatio: "16 / 9" }}
        />
        <div className="flex flex-1 flex-col justify-between p-6 lg:p-8 space-y-5">
          <div className="space-y-3">
            <div className="h-4 w-32 shimmer rounded" />
            <div className="h-8 w-3/4 shimmer rounded-xl" />
            <div className="h-4 w-full shimmer rounded" />
            <div className="h-4 w-2/3 shimmer rounded" />
          </div>
          <div className="h-12 w-full shimmer rounded-xl mt-6" />
        </div>
      </div>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-bg-card overflow-hidden">
      <div
        className="aspect-video w-full shimmer"
        style={{ aspectRatio: "16 / 9" }}
      />
      <div className="p-4 sm:p-5 space-y-3">
        <div className="h-4 w-3/4 shimmer rounded" />
        <div className="h-3 w-full shimmer rounded" />
        <div className="h-9 w-full shimmer rounded-xl mt-4" />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SECTION WRAPPER
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
      className="space-y-5"
    >
      <div className="flex items-center gap-4 justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`section-accent-bar self-stretch min-h-[2.25rem] ${accentClass}`} />
          <div className="min-w-0">
            <h2
              id={sectionId}
              className="font-heading text-lg sm:text-xl md:text-2xl font-extrabold tracking-tight text-white leading-tight"
            >
              {title}
            </h2>
            {description && (
              <p className="mt-0.5 text-xs font-medium text-text-muted">{description}</p>
            )}
          </div>
        </div>
        {headerRight && <div className="shrink-0">{headerRight}</div>}
      </div>
      {children}
    </motion.section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT — COURSES HUB
   ══════════════════════════════════════════════════════════════════ */

function Courses() {
  const { user } = useContext(AuthContext);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  /* ── Load Course Library ── */
  const loadCourses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let endpoint = "/courses";
      if (activeTab === "my") {
        endpoint = "/courses/my";
      } else if (activeTab !== "all") {
        endpoint = `/courses?type=${activeTab}`;
      }
      const res = await api.get(endpoint);
      setCourses(res.data.courses || []);
    } catch (err) {
      console.error("Failed to load courses:", err);
      setError("Unable to load course library. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    let mounted = true;
    const fetchOnTabChange = async () => {
      try {
        let endpoint = "/courses";
        if (activeTab === "my") {
          endpoint = "/courses/my";
        } else if (activeTab !== "all") {
          endpoint = `/courses?type=${activeTab}`;
        }
        const res = await api.get(endpoint);
        if (mounted) {
          setCourses(res.data.courses || []);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          console.error("Failed to load courses:", err);
          setError("Unable to load course library. Please check your connection.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void fetchOnTabChange();
    return () => {
      mounted = false;
    };
  }, [activeTab]);

  /* ── Filtered & partitioned courses ── */
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

  /* ── Stats computed from unfiltered courses ── */
  const stats = useMemo(
    () => ({
      total: courses.length,
      enrolled: courses.filter(
        (c) => !!c.learningProgress || !!c.purchased || !!c.isPurchased || !!c.isEnrolled
      ).length,
      recordings: courses.filter(
        (c) => String(c.type || "").trim().toLowerCase() === "recording"
      ).length,
    }),
    [courses]
  );

  /* ── Active Continue Course ── */
  const continueCourse = useMemo(() => pickContinueCourse(courses), [courses]);
  const [featuredRecording, ...secondaryRecordings] = recordingCourses;

  /* ── Preload images to eliminate CLS ── */
  const coverImageUrls = useMemo(
    () => allFiltered.map((c) => c.coverImage).filter(Boolean),
    [allFiltered]
  );
  useImagePreloader(coverImageUrls);

  /* ── Time-based greeting helper ── */
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const firstName = user?.name ? user.name.split(" ")[0] : null;

  return (
    <div className="space-y-8 sm:space-y-12 max-w-7xl mx-auto">

      {/* ══════════════════════════════════════════════════════════
          HERO / GREETING & METRICS AREA
          ══════════════════════════════════════════════════════════ */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        aria-label="Student Learning Overview"
        className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-bg-card via-bg-surface to-bg-card p-6 sm:p-8"
      >
        <div className="gradient-line-top" />
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-brand-mint/6 blur-[90px]" />
        <div className="pointer-events-none absolute -left-10 bottom-0 h-56 w-56 rounded-full bg-info/4 blur-[80px]" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Greeting Column */}
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-lg bg-brand-mint/10 border border-brand-mint/20 px-2.5 py-1 text-[10px] font-bold text-brand-mint uppercase tracking-[0.16em]">
              <Sparkles className="w-3 h-3" />
              {firstName ? `${greeting}, ${firstName}` : "Welcome to Zeitnah"}
            </div>
            <h1 className="font-heading font-extrabold text-2xl sm:text-3xl lg:text-4xl text-white tracking-tight leading-tight">
              Continue your <span className="text-gradient">learning journey.</span>
            </h1>
            <p className="text-xs sm:text-sm font-medium text-text-muted leading-relaxed">
              Pick up where you left off, explore new courses, and track your progress.
            </p>
          </div>

          {/* Real Metrics Strip */}
          {!loading && (
            <div className="grid grid-cols-3 gap-3 w-full lg:w-auto shrink-0">
              {[
                { label: "Library", value: stats.total, icon: BookOpen },
                { label: "Enrolled", value: stats.enrolled, icon: GraduationCap },
                { label: "Recorded", value: stats.recordings, icon: Play },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 sm:p-4 text-center"
                >
                  <stat.icon className="w-4 h-4 text-brand-mint mx-auto mb-1.5" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                    {stat.label}
                  </p>
                  <p className="mt-0.5 text-lg sm:text-xl font-heading font-extrabold text-white">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.section>

      {/* ── Navigation Tabs & Live Search ── */}
      <CourseNavbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        search={search}
        setSearch={setSearch}
      />

      {/* ── Premium Leaderboard Preview ── */}
      <LeaderboardPreview />

      {/* ══════════════════════════════════════════════════════════
          ERROR STATE WITH RETRY
          ══════════════════════════════════════════════════════════ */}
      {error && !loading && (
        <div className="rounded-2xl border border-danger/20 bg-danger/5 p-8 text-center space-y-4 max-w-md mx-auto">
          <p className="text-sm font-medium text-text-secondary">{error}</p>
          <button
            type="button"
            onClick={loadCourses}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-mint text-bg-base font-bold text-xs uppercase tracking-wider hover:bg-brand-mint/90 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry Loading
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          LOADING SKELETONS
          ══════════════════════════════════════════════════════════ */}
      {loading && (
        <div className="space-y-10">
          <ContinueSkeleton />
          <FeaturedSkeleton />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(3)].map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          EMPTY STATE
          ══════════════════════════════════════════════════════════ */}
      {!loading && !error && allFiltered.length === 0 && (
        <div className="rounded-2xl border border-white/[0.06] bg-bg-card p-12 text-center max-w-md mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-mint/10 border border-brand-mint/20 flex items-center justify-center mx-auto text-brand-mint">
            <BookOpen className="w-7 h-7" />
          </div>
          <h3 className="font-heading font-bold text-lg text-white">
            {search ? "No matching courses" : "No courses available"}
          </h3>
          <p className="text-xs sm:text-sm font-medium text-text-muted leading-relaxed">
            {search
              ? "Try adjusting your search keywords or clear the filter to view all courses."
              : "Courses will appear here once they are added to your academy."}
          </p>
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="inline-flex items-center px-4 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-xs font-semibold text-white hover:bg-white/[0.1] transition-all cursor-pointer"
            >
              Clear Search Filter
            </button>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          ACTIVE CONTINUE LEARNING BANNER
          ══════════════════════════════════════════════════════════ */}
      {!loading && !error && continueCourse && (
        <ContinueLearning course={continueCourse} />
      )}

      {/* ══════════════════════════════════════════════════════════
          FEATURED RECORDED CLASS
          ══════════════════════════════════════════════════════════ */}
      {!loading && !error && recordingCourses.length > 0 && (
        <CourseSection
          title="Recorded Classes"
          description="Learn at your own pace with comprehensive modular lessons."
          accentClass="section-accent-recording"
        >
          <div className="space-y-6">
            {featuredRecording && (
              <FeaturedRecordingCard course={featuredRecording} />
            )}

            {secondaryRecordings.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pt-2">
                {secondaryRecordings.map((course) => (
                  <RecordingCourseCard key={course._id} course={course} />
                ))}
              </div>
            )}
          </div>
        </CourseSection>
      )}

      {/* ══════════════════════════════════════════════════════════
          ONLINE / SCHEDULED CLASSES CAROUSEL
          ══════════════════════════════════════════════════════════ */}
      {!loading && !error && onlineCourses.length > 0 && (
        <CourseSection
          title="Online Classes"
          description="Interactive and scheduled learning sessions."
          accentClass="section-accent-online"
        >
          <OnlineCourseCarousel courses={onlineCourses} />
        </CourseSection>
      )}

    </div>
  );
}

export default Courses;
