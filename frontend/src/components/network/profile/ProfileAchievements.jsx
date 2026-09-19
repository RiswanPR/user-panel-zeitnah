import { Award, Star, CheckCircle2, Sparkles, ShieldCheck, Flame } from "lucide-react";

const ICON_MAP = {
  Star,
  Award,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Flame,
};

/**
 * ProfileAchievements Component
 * Displays unlocked achievements earned through the student's learning milestones.
 *
 * @param {Object} props
 * @param {Array} [props.achievements] - Array of PublicAchievementItem
 */
export default function ProfileAchievements({ achievements = [] }) {
  const hasAchievements = achievements && achievements.length > 0;

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-bg-surface/90 p-5 sm:p-6 shadow-lg backdrop-blur-xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-text-muted flex items-center gap-2">
          <Award className="h-3.5 w-3.5 text-brand-yellow" />
          <span>Achievements</span>
        </h2>
        {hasAchievements && (
          <span className="text-xs font-mono text-text-muted">
            {achievements.length} Unlocked
          </span>
        )}
      </div>

      {!hasAchievements ? (
        <p className="text-xs italic text-text-muted py-2">
          Achievements earned through learning milestones will appear here.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {achievements.map((item) => {
            const Icon = ICON_MAP[item.icon] || Award;

            return (
              <div
                key={item.id || item.title}
                className="group flex items-start gap-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 hover:border-brand-yellow/30 hover:bg-white/[0.04] transition-all"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-yellow/20 bg-brand-yellow/10 text-brand-yellow shadow-[0_0_12px_rgba(234,179,8,0.1)] group-hover:scale-105 transition-transform">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <h3 className="truncate text-xs font-bold text-white group-hover:text-brand-yellow transition-colors">
                      {item.title}
                    </h3>
                    {item.category && (
                      <span className="text-[9px] font-mono uppercase tracking-wider text-text-muted shrink-0">
                        {item.category}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-[11px] font-medium text-text-secondary leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
