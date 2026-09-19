import { BookOpen, CheckCircle2, Flame, Sparkles } from "lucide-react";

/**
 * ProfileStats Component
 * Renders verified learning telemetry cards.
 *
 * @param {Object} props
 * @param {Object} [props.stats]
 * @param {number} [props.stats.enrolledCoursesCount]
 * @param {number} [props.stats.completedCoursesCount]
 * @param {number} [props.stats.streak]
 * @param {number} [props.stats.totalPoints]
 */
export default function ProfileStats({ stats }) {
  if (!stats) return null;

  const items = [
    {
      label: "Enrolled Courses",
      value: stats.enrolledCoursesCount ?? 0,
      icon: BookOpen,
      color: "text-brand-mint",
      bg: "bg-brand-mint/10",
      border: "border-brand-mint/20",
    },
    {
      label: "Completed",
      value: stats.completedCoursesCount ?? 0,
      icon: CheckCircle2,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
    {
      label: "Learning Streak",
      value: `${stats.streak ?? 0}d`,
      icon: Flame,
      color: "text-orange-400",
      bg: "bg-orange-500/10",
      border: "border-orange-500/20",
    },
    {
      label: "Learning XP",
      value: (stats.totalPoints ?? 0).toLocaleString(),
      icon: Sparkles,
      color: "text-brand-yellow",
      bg: "bg-brand-yellow/10",
      border: "border-brand-yellow/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className="rounded-2xl border border-white/[0.08] bg-bg-surface/90 p-4 shadow-lg backdrop-blur-xl"
          >
            <div className="flex items-center justify-between">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-xl border ${item.border} ${item.bg} ${item.color}`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </div>
            </div>
            <p className="mt-3 text-xl sm:text-2xl font-heading font-black text-white">
              {item.value}
            </p>
            <p className="mt-0.5 text-[11px] font-medium text-text-muted">
              {item.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}
