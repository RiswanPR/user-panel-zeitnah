import { useEffect, useMemo, useState, useContext, useCallback } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import CourseNavbar from "../../components/courses/CourseNavbar";
import CourseHero from "../../components/courses/CourseHero";
import ContinueLearning from "../../components/courses/ContinueLearning";
import LearningProgressStrip from "../../components/courses/LearningProgressStrip";

import FeaturedRecordingCard from "../../components/courses/FeaturedRecordingCard";
import RecordingCourseCard from "../../components/courses/RecordingCourseCard";
import OnlineCourseCarousel from "../../components/courses/OnlineCourseCarousel";
import CourseStandingStrip from "../../components/courses/CourseStandingStrip";
import CourseClosingCTA from "../../components/courses/CourseClosingCTA";
import ZeitnahZMotif from "../../components/courses/ZeitnahZMotif";
import api from "../../services/api";
import { useImagePreloader } from "../../hooks/useImagePreloader";
import { AuthContext } from "../../context/AuthContext";

/* ══════════════════════════════════════════════════════════════════
   PRIORITIZATION & SORTING HELPERS
   ══════════════════════════════════════════════════════════════════ */

/**
 * Sort recording courses:
 *   1. enrolled with active progress (> 0%)
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

/** Pick the single most in-progress enrolled course for the Continue Learning banner */
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
   EDITORIAL SECTION WRAPPER
   ══════════════════════════════════════════════════════════════════ */

function CourseSection({
  title,
  subtitle,
  children,
  delay = 0,
  accentColor = "mint",
  headerRight = null,
}) {
  const sectionId = `section-${title.replace(/\s+/g, "-").toLowerCase()}`;
  const easePremium = [0.16, 1, 0.3, 1];

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: easePremium, delay }}
      aria-labelledby={sectionId}
      className="space-y-6 pt-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-white/[0.08] pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                accentColor === "yellow" ? "bg-brand-yellow" : "bg-brand-mint"
              }`}
            />
            <span
              className={`text-[10px] font-mono font-bold tracking-[0.2em] uppercase ${
                accentColor === "yellow" ? "text-brand-yellow" : "text-brand-mint"
              }`}
            >
              {accentColor === "yellow" ? "LIVE SYLLABUS" : "CURRICULUM MODULES"}
            </span>
          </div>
          <h2
            id={sectionId}
            className="display-headline text-2xl sm:text-3xl md:text-4xl text-white tracking-tight leading-none"
          >
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-text-secondary leading-relaxed pt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        {headerRight && <div className="shrink-0">{headerRight}</div>}
      </div>
      {children}
    </motion.section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   LOADING SKELETONS (Exact dimensions to eliminate CLS)
   ══════════════════════════════════════════════════════════════ */

function HeroSkeleton() {
  return (
    <div className="rounded-3xl border border-white/[0.08] bg-[#0A0F14] p-8 sm:p-12 space-y-6 animate-pulse">
      <div className="h-5 w-48 shimmer rounded-full" />
      <div className="space-y-2">
        <div className="h-12 sm:h-16 w-3/4 shimmer rounded-2xl" />
        <div className="h-12 sm:h-16 w-1/2 shimmer rounded-2xl" />
      </div>
      <div className="h-4 w-2/3 shimmer rounded-lg" />
      <div className="grid grid-cols-3 gap-3 max-w-sm pt-4">
        <div className="h-20 shimmer rounded-2xl" />
        <div className="h-20 shimmer rounded-2xl" />
        <div className="h-20 shimmer rounded-2xl" />
      </div>
    </div>
  );
}

function ContinueSkeleton() {
  return (
    <div className="rounded-3xl border border-white/[0.08] bg-[#0A0F14] p-6 sm:p-7 flex flex-col md:flex-row gap-6 items-start md:items-center animate-pulse">
      <div
        className="w-full md:w-64 lg:w-72 aspect-video shimmer rounded-2xl shrink-0"
        style={{ aspectRatio: "16 / 9" }}
      />
      <div className="flex-1 space-y-3 w-full">
        <div className="h-4 w-32 shimmer rounded" />
        <div className="h-7 w-3/4 shimmer rounded-xl" />
        <div className="h-2.5 w-full shimmer rounded-full mt-3" />
      </div>
      <div className="w-full md:w-44 h-12 shimmer rounded-2xl shrink-0" />
    </div>
  );
}

function FeaturedSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0A0F14] animate-pulse">
      <div className="flex flex-col lg:flex-row items-stretch">
        <div
          className="w-full lg:w-1/2 aspect-video shrink-0 shimmer"
          style={{ aspectRatio: "16 / 9" }}
        />
        <div className="flex flex-1 flex-col justify-between p-7 lg:p-10 space-y-5">
          <div className="space-y-3">
            <div className="h-4 w-32 shimmer rounded" />
            <div className="h-8 w-3/4 shimmer rounded-xl" />
            <div className="h-4 w-full shimmer rounded" />
            <div className="h-4 w-2/3 shimmer rounded" />
          </div>
          <div className="h-12 w-full shimmer rounded-2xl mt-6" />
        </div>
      </div>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0A0F14] overflow-hidden animate-pulse">
      <div
        className="aspect-video w-full shimmer"
        style={{ aspectRatio: "16 / 9" }}
      />
      <div className="p-5 space-y-3">
        <div className="h-4 w-3/4 shimmer rounded" />
        <div className="h-3 w-full shimmer rounded" />
        <div className="h-10 w-full shimmer rounded-xl mt-4" />
      </div>
    </div>
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
  const { recordingCourses, onlineCourses, allFiltered, enrolledCourses } = useMemo(() => {
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
    const enrolled = courses.filter(
      (c) =>
        !!c.learningProgress ||
        !!c.purchased ||
        !!c.isPurchased ||
        !!c.isEnrolled
    );

    return {
      recordingCourses: recordings,
      onlineCourses: online,
      allFiltered: filtered,
      enrolledCourses: enrolled,
    };
  }, [courses, search]);

  /* ── Stats computed from unfiltered courses ── */
  const stats = useMemo(
    () => ({
      total: courses.length,
      enrolled: enrolledCourses.length,
      recordings: courses.filter(
        (c) => String(c.type || "").trim().toLowerCase() === "recording"
      ).length,
    }),
    [courses, enrolledCourses]
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


  const handleBrowseCatalog = useCallback(() => {
    setActiveTab("all");
    setSearch("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="space-y-10 sm:space-y-14 max-w-7xl mx-auto pb-12">

      {/* ══════════════════════════════════════════════════════════
          1. CINEMATIC LEARNING HERO
          ══════════════════════════════════════════════════════════ */}
      {loading && courses.length === 0 ? (
        <HeroSkeleton />
      ) : (
        <CourseHero
          stats={stats}
          user={user}
          enrolledCourses={enrolledCourses}
          loading={loading}
        />
      )}

      {/* ══════════════════════════════════════════════════════════
          2. FLAGSHIP CONTINUE LEARNING
          ══════════════════════════════════════════════════════════ */}
      {!loading && !error && continueCourse && (
        <ContinueLearning course={continueCourse} />
      )}

      {/* ══════════════════════════════════════════════════════════
          3. COURSE NAVIGATION & COMMAND SEARCH
          ══════════════════════════════════════════════════════════ */}
      <CourseNavbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        search={search}
        setSearch={setSearch}
      />

      {/* ══════════════════════════════════════════════════════════
          4. LEARNING PROGRESS INTELLIGENCE STRIP
          ══════════════════════════════════════════════════════════ */}
      {!loading && !error && enrolledCourses.length > 0 && (
        <LearningProgressStrip courses={courses} />
      )}


      {/* ══════════════════════════════════════════════════════════
          ERROR STATE WITH CALM RETRY
          ══════════════════════════════════════════════════════════ */}
      {error && !loading && (
        <div className="rounded-3xl border border-brand-yellow/20 bg-[#0A0F14] p-8 sm:p-12 text-center space-y-5 max-w-lg mx-auto shadow-2xl relative overflow-hidden">
          <div className="w-12 h-12 rounded-2xl bg-brand-yellow/10 border border-brand-yellow/25 flex items-center justify-center mx-auto text-brand-yellow">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-heading font-extrabold text-lg text-white uppercase tracking-tight">
              Connection Disrupted
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed max-w-sm mx-auto">
              {error}
            </p>
          </div>
          <button
            type="button"
            onClick={loadCourses}
            className="inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-brand-yellow text-black font-heading font-extrabold text-xs uppercase tracking-wider hover:bg-brand-yellow/90 transition-all cursor-pointer shadow-md active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry Connection</span>
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          LOADING SKELETONS (CLS Protected)
          ══════════════════════════════════════════════════════════ */}
      {loading && courses.length === 0 && (
        <div className="space-y-10">
          <ContinueSkeleton />
          <FeaturedSkeleton />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0A0F14] p-10 sm:p-16 text-center max-w-lg mx-auto space-y-6 shadow-2xl">
          {/* Spatial Z motif */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.03]">
            <ZeitnahZMotif variant="white" className="w-72 h-72" />
          </div>

          <div className="relative z-10 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#12314C] border border-brand-mint/30 flex items-center justify-center mx-auto text-brand-mint shadow-md">
              {search ? <Search className="w-6 h-6" /> : <BookOpen className="w-6 h-6" />}
            </div>

            <div className="space-y-2">
              <h3 className="display-headline text-2xl sm:text-3xl text-white tracking-tight leading-none">
                {search ? "NOTHING MATCHED." : "YOUR LIBRARY IS WAITING."}
              </h3>
              <p className="text-xs sm:text-sm text-text-secondary max-w-md mx-auto leading-relaxed">
                {search
                  ? `No course titles match the query "${search}". Check your keywords or clear your filter to browse the full curriculum.`
                  : "You do not have any courses in this partition yet. Explore the course catalog to begin your learning trajectory."}
              </p>
            </div>

            <div className="pt-2">
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-brand-yellow text-black font-heading font-extrabold text-xs uppercase tracking-wider hover:bg-brand-yellow/90 transition-all cursor-pointer shadow-md active:scale-95"
                >
                  <span>Clear Search Filter</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleBrowseCatalog}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-brand-yellow text-black font-heading font-extrabold text-xs uppercase tracking-wider hover:bg-brand-yellow/90 transition-all cursor-pointer shadow-md active:scale-95"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Browse Entire Catalog</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          6. & 7. RECORDED MASTERCLASSES SECTION
          ══════════════════════════════════════════════════════════ */}
      {!loading && !error && recordingCourses.length > 0 && (
        <CourseSection
          title="RECORDED MASTERCLASSES"
          subtitle="Modular, self-paced engineering curricula with structured chapters."
          accentColor="mint"
        >
          <div className="space-y-8">
            {/* 6. Flagship Featured Recorded Masterclass */}
            {featuredRecording && (
              <FeaturedRecordingCard course={featuredRecording} />
            )}

            {/* 7. Secondary Recorded Masterclasses Grid */}
            {secondaryRecordings.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
                {secondaryRecordings.map((course) => (
                  <RecordingCourseCard key={course._id} course={course} />
                ))}
              </div>
            )}
          </div>
        </CourseSection>
      )}

      {/* ══════════════════════════════════════════════════════════
          8. ONLINE & COHORT WORKSHOPS CAROUSEL
          ══════════════════════════════════════════════════════════ */}
      {!loading && !error && onlineCourses.length > 0 && (
        <CourseSection
          title="HAPPENING AT ZEITNAH."
          subtitle="Live engineering cohorts, interactive workshops, and scheduled sessions."
          accentColor="yellow"
        >
          <OnlineCourseCarousel courses={onlineCourses} />
        </CourseSection>
      )}

      {/* ══════════════════════════════════════════════════════════
          9. LEARNING STANDING & ACHIEVEMENT STRIP
          ══════════════════════════════════════════════════════════ */}
      {!loading && !error && <CourseStandingStrip />}

      {/* ══════════════════════════════════════════════════════════
          10. PREMIUM CLOSING CALL TO ACTION
          ══════════════════════════════════════════════════════════ */}
      {!loading && !error && courses.length > 0 && (
        <CourseClosingCTA onBrowseCatalog={handleBrowseCatalog} />
      )}

    </div>
  );
}

export default Courses;
