import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  Layers,
  ChevronDown,
  Award,
} from "lucide-react";
import Podium from "./Podium";
import LeaderboardTable from "./LeaderboardTable";

export default function CourseLeaderboardView({
  courses = [],
  selectedCourseId,
  onSelectCourse,
  courseLeaderboardData,
  isLoadingCourseData = false,
  page = 1,
  onPageChange,
  searchQuery = "",
  onSearchChange,
  levelFilter,
  onLevelFilterChange,
  currentUserId,
}) {
  if (!courses || courses.length === 0) {
    return (
      <div className="rounded-2xl border border-border-default bg-bg-card p-10 text-center shadow-sm">
        <BookOpen className="w-10 h-10 text-text-muted mx-auto mb-3 opacity-60" />
        <h2 className="text-lg font-heading font-bold text-white mb-1">
          No Course Enrollments Found
        </h2>
        <p className="text-xs sm:text-sm text-text-muted max-w-md mx-auto mb-6">
          Enroll in a Zeitnah course curriculum to join course-specific leaderboards and track your progress alongside cohort peers.
        </p>
        <Link
          to="/courses"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-mint/20 to-brand-navy/40 border border-brand-mint/30 text-xs font-bold text-brand-mint hover:bg-brand-mint/25 transition-all shadow-sm cursor-pointer"
        >
          <span>Explore Course Catalog</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const activeCourse =
    courses.find((c) => c.courseId === selectedCourseId) || courses[0];

  const courseMeta = courseLeaderboardData?.course || activeCourse;
  const currentStudent = courseLeaderboardData?.currentStudent || activeCourse?.currentStudent;
  const topPodium = courseLeaderboardData?.topPodium || [];
  const learners = courseLeaderboardData?.learners || [];
  const totalLearners = courseLeaderboardData?.totalLearners || 0;
  const totalPages = courseLeaderboardData?.totalPages || 1;

  return (
    <div className="space-y-6">
      {/* ── Enrolled Course Selector Pills / Dropdown ── */}
      <div className="p-4 sm:p-5 rounded-2xl bg-bg-card border border-border-default shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
            Select Enrolled Curriculum ({courses.length})
          </span>
          <span className="text-[11px] text-brand-mint font-mono font-semibold">
            Cohort Leaderboards
          </span>
        </div>

        {/* Scrollable Course Cards on Mobile / Grid on Desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {courses.map((course) => {
            const isSelected = course.courseId === activeCourse?.courseId;
            const cs = course.currentStudent || {};

            return (
              <button
                key={course.courseId}
                type="button"
                onClick={() => onSelectCourse(course.courseId)}
                className={`relative flex flex-col text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? "bg-brand-mint/[0.06] border-brand-mint/30 shadow-sm"
                    : "bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04]"
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="selected-course-pill"
                    className="absolute inset-0 rounded-xl border-2 border-brand-mint/40 pointer-events-none"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  />
                )}

                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-semibold text-white text-sm tracking-tight line-clamp-1">
                    {course.courseName}
                  </h3>
                  {cs.rank && (
                    <span className="shrink-0 rounded-md bg-brand-yellow/15 border border-brand-yellow/30 px-1.5 py-0.5 text-[10px] font-mono font-bold text-brand-yellow">
                      #{cs.rank}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-text-muted mt-auto pt-2 border-t border-white/[0.04]">
                  <span>{course.learnerCount || 1} learners</span>
                  <span className="font-mono text-brand-mint font-semibold">
                    {(cs.courseXp || 0).toLocaleString()} XP
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Active Course Header & Summary ── */}
      {activeCourse && (
        <motion.div
          key={activeCourse.courseId}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="rounded-2xl bg-bg-card border border-border-default p-6 sm:p-7 relative overflow-hidden shadow-sm"
        >
          <div className="gradient-line-top" />
          <div className="absolute top-0 right-0 w-[260px] h-[260px] bg-brand-mint/5 rounded-full blur-[90px] pointer-events-none" />

          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-brand-mint/8 border border-brand-mint/15 px-2.5 py-1 text-[11px] font-bold text-brand-mint uppercase tracking-wider">
                <BookOpen className="w-3.5 h-3.5" />
                Course Curriculum Leaderboard
              </div>

              <h2 className="text-xl sm:text-2xl font-heading font-black text-white tracking-tight">
                {courseMeta?.name || activeCourse.courseName}
              </h2>

              <p className="text-xs text-text-muted">
                Cohort ranking is determined by Course XP earned from lecture watch time and completed modules within this specific curriculum.
              </p>

              {/* Course-Specific Metrics Row */}
              <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-mono">
                <span className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-1 text-text-secondary">
                  Learners: <strong className="text-white">{totalLearners || activeCourse.learnerCount || 1}</strong>
                </span>

                {currentStudent?.rank && (
                  <span className="rounded-lg bg-brand-yellow/8 border border-brand-yellow/20 px-3 py-1 text-brand-yellow">
                    Your Rank: <strong>#{currentStudent.rank}</strong>
                  </span>
                )}

                {currentStudent?.courseXp !== undefined && (
                  <span className="rounded-lg bg-brand-mint/8 border border-brand-mint/20 px-3 py-1 text-brand-mint">
                    Your Course XP: <strong>{currentStudent.courseXp.toLocaleString()}</strong>
                  </span>
                )}

                {currentStudent?.completionPercent !== undefined && (
                  <span className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-1 text-text-secondary">
                    Completion: <strong className="text-white">{currentStudent.completionPercent}%</strong>
                  </span>
                )}
              </div>
            </div>

            {/* Direct CTA: Continue Learning */}
            <div className="shrink-0">
              <Link
                to={`/courses/${activeCourse.courseId}`}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-brand-mint to-brand-yellow text-bg-base text-xs sm:text-sm font-heading font-extrabold tracking-wide hover:opacity-90 transition-all shadow-md cursor-pointer"
              >
                <span>Continue Learning</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Course Podium (Top 3 in Course) ── */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted text-center">
          Course Podium — Top Learners
        </h3>
        <Podium topStudents={topPodium} isCourseMode={true} />
      </div>

      {/* ── Course Leaderboard Table / Cards ── */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
          All Enrolled Cohort Learners ({totalLearners})
        </h3>

        <LeaderboardTable
          learners={learners}
          totalLearners={totalLearners}
          page={page}
          totalPages={totalPages}
          onPageChange={onPageChange}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          levelFilter={levelFilter}
          onLevelFilterChange={onLevelFilterChange}
          isCourseMode={true}
          isLoading={isLoadingCourseData}
          currentUserId={currentUserId}
        />
      </div>
    </div>
  );
}
