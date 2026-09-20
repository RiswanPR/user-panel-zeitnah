import { useMemo } from "react";
import { Users, ArrowRight } from "lucide-react";
import StudentCard from "./StudentCard";
import { SkeletonCard } from "../ui/Skeleton";
import NetworkEmptyState from "./NetworkEmptyState";

const CATEGORIES = [
  "All",
  "Web Development",
  "Physics",
  "Full Stack Mastery",
  "Python for Data Science",
  "UI/UX & Product Design",
];

/**
 * SuggestedStudents Component
 * Renders the suggested student grid with category chips and empty state handling.
 *
 * @param {Object} props
 * @param {import('../../services/networkService').NetworkUser[]} [props.students=[]] - List of students
 * @param {boolean} [props.loading=false] - Loading state
 * @param {string} [props.activeFilter='All'] - Current active category filter
 * @param {function(string): void} [props.onFilterChange] - Filter change handler
 * @param {string} [props.searchQuery=''] - Current search term
 * @param {function(Object): void} [props.onPreview] - Student profile preview modal callback
 * @param {function(): void} [props.onExplore] - Callback to explore all students
 * @param {string[]} [props.courses] - Real available courses from directory
 * @param {string} [props.title='Suggested for you'] - Section title
 * @param {string} [props.description='People you may want to connect with.'] - Section description
 * @param {boolean} [props.showFilterChips=true] - Whether to show category filter chips
 */
export default function SuggestedStudents({
  students = [],
  loading = false,
  activeFilter = "All",
  onFilterChange,
  searchQuery = "",
  onClearSearch,
  onPreview,
  onExplore,
  courses = [],
  title = "Suggested for you",
  description = "People you may want to connect with.",
  showFilterChips = true,
}) {
  const categoryList = useMemo(() => {
    if (courses && courses.length > 0) {
      return ["All", ...courses];
    }
    return CATEGORIES;
  }, [courses]);

  const filteredStudents = useMemo(() => {
    if (!activeFilter || activeFilter.toLowerCase() === "all") {
      return students;
    }
    const filterLower = activeFilter.toLowerCase();
    return students.filter(
      (s) =>
        s.course?.toLowerCase().includes(filterLower) ||
        s.headline?.toLowerCase().includes(filterLower) ||
        s.interests?.some((i) => i.toLowerCase().includes(filterLower))
    );
  }, [students, activeFilter]);

  return (
    <section aria-labelledby="suggested-students-heading" className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2
              id="suggested-students-heading"
              className="text-lg sm:text-xl font-heading font-extrabold text-white tracking-tight"
            >
              {title}
            </h2>
            <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-xs font-mono font-semibold text-text-muted">
              {loading ? "..." : filteredStudents.length}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
            {description}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {onExplore && (
            <button
              type="button"
              onClick={onExplore}
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-mint hover:underline focus-ring rounded"
            >
              <span>Discover All</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Category Filter Chips */}
          {showFilterChips && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar" role="group" aria-label="Filter students by learning track">
              {categoryList.map((category) => {
                const isActive = activeFilter.toLowerCase() === category.toLowerCase();
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => onFilterChange?.(category)}
                    className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all focus-ring ${
                      isActive
                        ? "bg-brand-mint text-bg-base font-bold shadow-[0_0_12px_rgba(159,213,178,0.25)]"
                        : "bg-white/[0.04] text-text-muted border border-white/[0.06] hover:bg-white/[0.08] hover:text-white"
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Grid / Horizontal Track Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} className="min-h-[220px]" />
          ))}
        </div>
      ) : filteredStudents.length > 0 ? (
        <div className="flex sm:grid overflow-x-auto sm:overflow-visible no-scrollbar snap-x snap-mandatory sm:snap-none gap-4 pb-2 sm:pb-0">
          {filteredStudents.map((student) => (
            <div key={student.id} className="min-w-[280px] sm:min-w-0 flex-1 snap-start">
              <StudentCard
                student={student}
                onPreview={onPreview}
              />
            </div>
          ))}
        </div>
      ) : (
        <NetworkEmptyState
          icon={Users}
          title={searchQuery ? "No matching students found" : "No students suggested"}
          description={
            searchQuery
              ? `We couldn't find any students matching "${searchQuery}". Try searching for another subject, name, or interest.`
              : "Check back soon as new students join the learning network."
          }
          action={searchQuery ? onClearSearch : undefined}
          actionLabel="Clear Search"
        />
      )}
    </section>
  );
}
