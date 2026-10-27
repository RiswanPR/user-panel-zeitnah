import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, TrendingUp, Layers, BookOpen } from "lucide-react";

/**
 * LearningProgressStrip
 *
 * Information strip computing real learning intelligence from enrolled courses.
 * Displays only authentic data from the API:
 * - Enrolled courses count
 * - Real calculated average progress
 * - Completed courses count (completionPercent >= 100)
 * - In-progress courses count
 *
 * @param {Array} courses - Full courses list from API
 */
const LearningProgressStrip = memo(function LearningProgressStrip({ courses = [] }) {
  const telemetry = useMemo(() => {
    const enrolled = courses.filter(
      (c) =>
        !!c.learningProgress ||
        !!c.purchased ||
        !!c.isPurchased ||
        !!c.isEnrolled
    );

    if (enrolled.length === 0) return null;

    const progressValues = enrolled
      .map((c) => c.learningProgress?.completionPercent)
      .filter((p) => typeof p === "number" && !isNaN(p));

    const avg =
      progressValues.length > 0
        ? Math.round(
            progressValues.reduce((sum, v) => sum + v, 0) / progressValues.length
          )
        : 0;

    const completed = enrolled.filter(
      (c) => (c.learningProgress?.completionPercent ?? 0) >= 100
    ).length;

    const inProgress = enrolled.filter((c) => {
      const p = c.learningProgress?.completionPercent ?? 0;
      return p > 0 && p < 100;
    }).length;

    return {
      enrolledCount: enrolled.length,
      averageProgress: Math.min(100, Math.max(0, avg)),
      completedCount: completed,
      inProgressCount: inProgress,
    };
  }, [courses]);

  if (!telemetry || telemetry.enrolledCount === 0) {
    return null;
  }

  const easePremium = [0.16, 1, 0.3, 1];

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: easePremium }}
      aria-label="Student Learning Progress Intelligence"
      className="w-full"
    >
      <div className="relative overflow-hidden rounded-2xl border border-border bg-surface-card p-4 sm:p-5 shadow-lg">
        {/* Subtle accent hairline */}
        <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-brand-mint/30 to-transparent pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* ── Left Indicator Label ── */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-surface-subtle dark:bg-brand-mint/10 border border-emerald-600/20 dark:border-brand-mint/25 flex items-center justify-center text-brand-primary dark:text-brand-mint shrink-0 shadow-sm">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted">
                LEARNING TELEMETRY
              </span>
              <h3 className="text-sm font-heading font-extrabold text-text-primary tracking-tight uppercase">
                Active Learning Progress
              </h3>
            </div>
          </div>

          {/* ── Metric Grid ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 items-center">
            {/* 1. Enrolled */}
            <div className="border-l border-border pl-3">
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-text-muted uppercase">
                <BookOpen className="w-3 h-3 text-text-faint" />
                <span>Enrolled</span>
              </div>
              <p className="font-heading font-extrabold text-lg sm:text-xl text-text-primary font-mono mt-0.5">
                {String(telemetry.enrolledCount).padStart(2, "0")}
              </p>
            </div>

            {/* 2. In Progress */}
            <div className="border-l border-border pl-3">
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-text-muted uppercase">
                <Layers className="w-3 h-3 text-amber-600 dark:text-brand-yellow" />
                <span>Active Tracks</span>
              </div>
              <p className="font-heading font-extrabold text-lg sm:text-xl text-text-primary font-mono mt-0.5">
                {String(telemetry.inProgressCount).padStart(2, "0")}
              </p>
            </div>

            {/* 3. Completed */}
            <div className="border-l border-border pl-3">
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-text-muted uppercase">
                <CheckCircle2 className="w-3 h-3 text-emerald-700 dark:text-brand-mint" />
                <span>Completed</span>
              </div>
              <p className="font-heading font-extrabold text-lg sm:text-xl text-text-primary font-mono mt-0.5">
                {String(telemetry.completedCount).padStart(2, "0")}
              </p>
            </div>

            {/* 4. Average Progress */}
            <div className="border-l border-border pl-3">
              <div className="text-[10px] font-mono text-text-muted uppercase">
                Average Completion
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-heading font-extrabold text-lg sm:text-xl text-brand-primary dark:text-brand-mint font-mono">
                  {telemetry.averageProgress}%
                </span>
                <div className="w-16 h-1.5 rounded-full bg-surface-elevated border border-border/40 overflow-hidden hidden sm:block">
                  <div
                    className="h-full rounded-full bg-brand-mint"
                    style={{ width: `${telemetry.averageProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
});

export default LearningProgressStrip;
