import {
  Activity,
  BookOpen,
  CheckCircle2,
  Trophy,
  Flame,
  Sparkles,
  Clock,
} from "lucide-react";

/**
 * Formats ISO date into relative time.
 * @param {string} dateStr
 * @returns {string}
 */
function formatRelativeTime(dateStr) {
  if (!dateStr) return "Recently";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "Recently";

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function getVisuals(type) {
  const normalized = (type || "").toLowerCase();
  switch (normalized) {
    case "course_completed":
      return {
        icon: Trophy,
        badge: "Course Completed",
        color: "text-brand-mint",
        bg: "bg-brand-mint/10 border-brand-mint/20",
      };
    case "lesson_completed":
      return {
        icon: CheckCircle2,
        badge: "Lesson Completed",
        color: "text-sky-400",
        bg: "bg-sky-500/10 border-sky-500/20",
      };
    case "achievement_earned":
      return {
        icon: Sparkles,
        badge: "Achievement",
        color: "text-brand-yellow",
        bg: "bg-brand-yellow/10 border-brand-yellow/20",
      };
    case "streak_milestone":
      return {
        icon: Flame,
        badge: "Streak Milestone",
        color: "text-amber-400",
        bg: "bg-amber-500/10 border-amber-500/20",
      };
    case "course_enrolled":
    case "course_joined":
    default:
      return {
        icon: BookOpen,
        badge: "Course Joined",
        color: "text-indigo-400",
        bg: "bg-indigo-500/10 border-indigo-500/20",
      };
  }
}

/**
 * ProfileActivity Component
 * Displays recent public learning activity events on a student's public profile.
 *
 * @param {Object} props
 * @param {Array} [props.activity] - Array of PublicActivityItem
 */
export default function ProfileActivity({ activity = [] }) {
  const hasActivity = activity && activity.length > 0;

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-bg-surface/90 p-5 sm:p-6 shadow-lg backdrop-blur-xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-text-muted flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-brand-mint" />
          <span>Recent Learning Activity</span>
        </h2>
        {hasActivity && (
          <span className="text-[11px] font-mono text-text-muted">
            {activity.length} event{activity.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {!hasActivity ? (
        <p className="text-xs italic text-text-muted py-2">
          No recent public learning activity recorded yet.
        </p>
      ) : (
        <div className="space-y-2.5">
          {activity.map((item) => {
            const visuals = getVisuals(item.type);
            const Icon = visuals.icon;

            return (
              <div
                key={item.id}
                className="flex items-start gap-3 rounded-xl border border-white/[0.04] bg-white/[0.01] p-3 hover:border-white/[0.08] transition-colors"
              >
                <div
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${visuals.bg} ${visuals.color}`}
                  title={visuals.badge}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-white truncate">
                    {item.title}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-text-muted">
                    <span className="font-mono text-text-secondary">{visuals.badge}</span>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-text-faint" />
                      <span>{formatRelativeTime(item.timestamp)}</span>
                    </div>
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
