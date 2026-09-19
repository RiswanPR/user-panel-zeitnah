import { useState, useEffect, useContext } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, RefreshCw } from "lucide-react";
import { AuthContext } from "../../context/AuthContext";
import ProfileNav from "../../components/profile/ProfileNav";
import leaderboardService from "../../services/leaderboardService";
import LeaderboardHero from "./LeaderboardHero";
import PersonalPositionCard from "./PersonalPositionCard";
import Podium from "./Podium";
import LeaderboardTable from "./LeaderboardTable";
import CourseLeaderboardView from "./CourseLeaderboardView";
import LeaderboardSkeleton from "./LeaderboardSkeleton";

export default function LeaderboardPage() {
  const { user } = useContext(AuthContext);
  const currentUserId = user?._id || user?.userId;
  const { courseId: routeCourseId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Mode state: 'global' | 'courses'
  const initialMode = routeCourseId || searchParams.get("tab") === "courses" ? "courses" : "global";
  const [activeMode, setActiveMode] = useState(initialMode);

  // Selected course state for course leaderboard mode
  const [selectedCourseId, setSelectedCourseId] = useState(routeCourseId || "");

  // Pagination, search, and filter state
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState(undefined);
  const [rankFilter, setRankFilter] = useState(undefined);

  // Update mode if route changes
  useEffect(() => {
    if (routeCourseId) {
      setActiveMode("courses");
      setSelectedCourseId(routeCourseId);
    }
  }, [routeCourseId]);

  // Handle mode toggle
  const handleModeChange = (mode) => {
    setActiveMode(mode);
    setPage(1);
    setSearchQuery("");
    setLevelFilter(undefined);
    setRankFilter(undefined);

    if (mode === "courses") {
      setSearchParams({ tab: "courses" });
    } else {
      setSearchParams({});
      if (routeCourseId) {
        navigate("/leaderboard");
      }
    }
  };

  // 1. Fetch authenticated student's personal position
  const {
    data: personalPosition,
    isLoading: isLoadingPosition,
  } = useQuery({
    queryKey: ["leaderboard", "position"],
    queryFn: () => leaderboardService.getMyLeaderboardPosition(),
    staleTime: 1000 * 60, // 1 minute
    enabled: Boolean(currentUserId),
  });

  // 2. Fetch enrolled courses summary for courses mode
  const {
    data: myCoursesData,
    isLoading: isLoadingCourses,
  } = useQuery({
    queryKey: ["leaderboard", "courses"],
    queryFn: () => leaderboardService.getMyCoursesLeaderboard(),
    staleTime: 1000 * 60 * 3, // 3 minutes
    enabled: Boolean(currentUserId),
  });

  const enrolledCourses = myCoursesData?.courses || [];

  // Default to first enrolled course if none selected yet
  useEffect(() => {
    if (!selectedCourseId && enrolledCourses.length > 0) {
      setSelectedCourseId(enrolledCourses[0].courseId);
    }
  }, [selectedCourseId, enrolledCourses]);

  // 3. Fetch Global Leaderboard
  const {
    data: globalData,
    isLoading: isLoadingGlobal,
    isError: isErrorGlobal,
    error: errorGlobal,
    refetch: refetchGlobal,
  } = useQuery({
    queryKey: [
      "leaderboard",
      "global",
      { page, q: searchQuery, level: levelFilter, rank: rankFilter },
    ],
    queryFn: () =>
      leaderboardService.getGlobalLeaderboard({
        page,
        limit: 25,
        q: searchQuery,
        level: levelFilter,
        rank: rankFilter,
      }),
    staleTime: 1000 * 60 * 2, // 2 minutes
    enabled: activeMode === "global",
  });

  // 4. Fetch Course Leaderboard (when in course mode and course is selected)
  const {
    data: courseData,
    isLoading: isLoadingCourseData,
    isError: isErrorCourse,
    error: errorCourse,
    refetch: refetchCourse,
  } = useQuery({
    queryKey: [
      "leaderboard",
      "course",
      selectedCourseId,
      { page, q: searchQuery, level: levelFilter },
    ],
    queryFn: () =>
      leaderboardService.getCourseLeaderboard(selectedCourseId, {
        page,
        limit: 25,
        q: searchQuery,
        level: levelFilter,
      }),
    staleTime: 1000 * 60 * 2, // 2 minutes
    enabled: activeMode === "courses" && Boolean(selectedCourseId),
  });

  // Initial loading state
  const isInitialLoading =
    (activeMode === "global" && isLoadingGlobal && !globalData) ||
    (activeMode === "courses" && isLoadingCourses && !myCoursesData);

  if (isInitialLoading) {
    return <LeaderboardSkeleton />;
  }

  // Active course metadata and student telemetry
  const activeCourse = enrolledCourses.find((c) => c.courseId === selectedCourseId);
  const activeCourseTelemetry = courseData?.currentStudent || activeCourse?.currentStudent;

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      {/* ── Sub-Navigation (8 Core Profile destinations) ── */}
      <ProfileNav />

      {/* ── Hero Section ── */}
      <LeaderboardHero
        activeMode={activeMode}
        onModeChange={handleModeChange}
        enrolledCourseCount={enrolledCourses.length}
      />

      {/* ── Personal Position Card ── */}
      <PersonalPositionCard
        telemetry={personalPosition || globalData?.currentStudent}
        courseTelemetry={activeCourseTelemetry}
        isCourseMode={activeMode === "courses"}
        courseName={activeCourse?.courseName}
      />

      {/* ── Global Mode Content ── */}
      {activeMode === "global" && (
        <>
          {isErrorGlobal ? (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-8 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
              <h3 className="text-base font-bold text-white">Unable to load leaderboard</h3>
              <p className="text-xs text-text-muted max-w-sm mx-auto">
                Something went wrong while loading the latest global rankings.
              </p>
              <button
                type="button"
                onClick={() => refetchGlobal()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs font-semibold text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Flagship Top 3 Global Podium */}
              <section aria-label="Top 3 Global Podium">
                <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted text-center mb-1">
                  Global Podium — Top Learners
                </h2>
                <Podium topStudents={globalData?.topPodium || []} isCourseMode={false} />
              </section>

              {/* Global Leaderboard Table & Mobile Cards */}
              <section aria-label="Global Student Rankings">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <h2 className="text-base sm:text-lg font-heading font-bold text-white">
                      All Registered Learners
                    </h2>
                    <p className="text-xs text-text-muted">
                      Deterministic ranking by accumulated XP, tier level, and learning consistency.
                    </p>
                  </div>
                  {globalData?.totalLearners !== undefined && (
                    <span className="rounded-full bg-white/[0.04] border border-white/[0.06] px-3 py-1 text-xs font-mono text-text-muted">
                      {globalData.totalLearners.toLocaleString()} learners
                    </span>
                  )}
                </div>

                <LeaderboardTable
                  learners={globalData?.learners || []}
                  totalLearners={globalData?.totalLearners || 0}
                  page={page}
                  totalPages={globalData?.totalPages || 1}
                  onPageChange={(newPage) => setPage(newPage)}
                  searchQuery={searchQuery}
                  onSearchChange={(q) => {
                    setSearchQuery(q);
                    setPage(1);
                  }}
                  levelFilter={levelFilter}
                  onLevelFilterChange={(lvl) => {
                    setLevelFilter(lvl);
                    setPage(1);
                  }}
                  rankFilter={rankFilter}
                  onRankFilterChange={(r) => {
                    setRankFilter(r);
                    setPage(1);
                  }}
                  isCourseMode={false}
                  isLoading={isLoadingGlobal}
                  currentUserId={currentUserId}
                />
              </section>
            </div>
          )}
        </>
      )}

      {/* ── Courses Mode Content ── */}
      {activeMode === "courses" && (
        <>
          {isErrorCourse ? (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-8 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
              <h3 className="text-base font-bold text-white">Unable to load course leaderboard</h3>
              <p className="text-xs text-text-muted max-w-sm mx-auto">
                Something went wrong while loading this course's leaderboard.
              </p>
              <button
                type="button"
                onClick={() => refetchCourse()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs font-semibold text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>
            </div>
          ) : (
            <CourseLeaderboardView
              courses={enrolledCourses}
              selectedCourseId={selectedCourseId}
              onSelectCourse={(id) => {
                setSelectedCourseId(id);
                setPage(1);
                setSearchQuery("");
                setLevelFilter(undefined);
              }}
              courseLeaderboardData={courseData}
              isLoadingCourseData={isLoadingCourseData}
              page={page}
              onPageChange={(newPage) => setPage(newPage)}
              searchQuery={searchQuery}
              onSearchChange={(q) => {
                setSearchQuery(q);
                setPage(1);
              }}
              levelFilter={levelFilter}
              onLevelFilterChange={(lvl) => {
                setLevelFilter(lvl);
                setPage(1);
              }}
              currentUserId={currentUserId}
            />
          )}
        </>
      )}
    </div>
  );
}
