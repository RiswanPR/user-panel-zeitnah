import { BookOpen, CheckCircle2 } from "lucide-react";

/**
 * ProfileCourses Component
 * Displays the courses the student is participating in or has completed.
 *
 * @param {Object} props
 * @param {Array} [props.courses] - Array of PublicCourseItem
 */
export default function ProfileCourses({ courses = [] }) {
  const hasCourses = courses && courses.length > 0;

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-bg-surface/90 p-5 sm:p-6 shadow-lg backdrop-blur-xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-text-muted flex items-center gap-2">
          <BookOpen className="h-3.5 w-3.5 text-brand-mint" />
          <span>Course Participation</span>
        </h2>
        {hasCourses && (
          <span className="text-xs font-mono text-text-muted">
            {courses.length} {courses.length === 1 ? "Course" : "Courses"}
          </span>
        )}
      </div>

      {!hasCourses ? (
        <p className="text-xs italic text-text-muted py-2">
          No public course information available.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {courses.map((course) => {
            const isCompleted = course.completed || course.progressPercent >= 100;

            return (
              <div
                key={course.courseId || course.name}
                className="group flex flex-col justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 hover:border-brand-mint/30 hover:bg-white/[0.04] transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-bold text-white group-hover:text-brand-mint transition-colors">
                        {course.name}
                      </h3>
                      {course.totalClasses ? (
                        <p className="text-[11px] font-mono text-text-muted mt-0.5">
                          {course.completedClasses || 0} / {course.totalClasses} classes completed
                        </p>
                      ) : null}
                    </div>

                    {/* Completion Status Badge */}
                    {isCompleted ? (
                      <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 shrink-0">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Completed</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-lg border border-brand-mint/30 bg-brand-mint/10 px-2 py-0.5 text-[10px] font-bold text-brand-mint shrink-0">
                        <span>{course.progressPercent}%</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCompleted
                          ? "bg-gradient-to-r from-emerald-500 to-brand-mint"
                          : "bg-gradient-to-r from-brand-mint to-brand-yellow"
                      }`}
                      style={{ width: `${Math.max(4, course.progressPercent || 0)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
