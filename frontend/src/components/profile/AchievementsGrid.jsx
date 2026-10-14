import { motion } from "framer-motion";
import {
  Award,
  CheckCircle2,
  Star,
  Sparkles,
  ShieldCheck,
  Flame,
  Lock,
} from "lucide-react";
import {
  resolveAchievementMeta,
  ACHIEVEMENT_METADATA,
} from "../../utils/achievementMetadata.js";

export { resolveAchievementMeta, ACHIEVEMENT_METADATA };

export const ICON_MAP = {
  Star,
  Award,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Flame,
};

/**
 * Premium Achievements Grid Component.
 * Displays unlocked achievements in a readable, full-width vertical layout
 * tailored for sidebar contexts, preventing narrow-column text truncation.
 */
export default function AchievementsGrid({ profile, className = "" }) {
  const achievements = profile?.gamification?.achievements || [];

  return (
    <div
      className={`rounded-3xl border border-white/[0.08] bg-[#0A0F18]/90 backdrop-blur-xl p-5 sm:p-6 shadow-sm space-y-5 ${className}`}
    >
      {/* ── Section Header ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-400 shrink-0" aria-hidden="true" />
            <h2 className="text-base sm:text-lg font-heading font-bold text-white tracking-tight">
              Unlocked Achievements
            </h2>
          </div>
          <p className="text-xs text-text-muted leading-relaxed">
            Milestones and accomplishments earned throughout your learning journey
          </p>
        </div>

        {achievements.length > 0 && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-mono text-[11px] font-semibold shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
            <span>{achievements.length} Unlocked</span>
          </span>
        )}
      </div>

      {/* ── Content: Empty State vs Full-Width Achievement List ── */}
      {achievements.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.01] p-6 sm:p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-text-muted mx-auto">
            <Award className="w-6 h-6 text-text-muted" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-heading font-bold text-white mb-1">
              No achievements unlocked yet
            </h3>
            <p className="text-xs text-text-muted max-w-xs mx-auto leading-relaxed">
              Complete video lectures, finish course tracks, and build your professional identity to earn verified milestone badges.
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] text-[10px] font-mono text-text-muted">
            <Lock className="w-3 h-3 text-text-muted" aria-hidden="true" />
            <span>Earn by completing lectures & verifying profile</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {achievements.map((item, i) => {
            const meta = resolveAchievementMeta(item);
            const Icon =
              meta.iconComponent ||
              ICON_MAP[meta.iconName] ||
              ICON_MAP[meta.icon] ||
              Award;
            const itemKey = meta.id || (typeof item === "string" ? item : i);

            return (
              <motion.div
                key={`${itemKey}-${i}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.04 }}
                className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.035] hover:border-emerald-500/30 p-3.5 sm:p-4 transition-all duration-200"
              >
                {/* Subtle top ambient accent highlight */}
                <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/25 to-transparent group-hover:via-emerald-500/50 transition-colors" />

                <div className="flex items-start gap-3.5">
                  {/* Icon container */}
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                    <Icon className="w-5 h-5" aria-hidden="true" />
                  </div>

                  {/* Body content */}
                  <div className="min-w-0 flex-1">
                    {/* 1. Title */}
                    <h3 className="text-sm font-heading font-bold text-white leading-snug break-words">
                      {meta.title}
                    </h3>

                    {/* 2. Description */}
                    <p className="text-xs text-text-muted leading-relaxed mt-1 break-words">
                      {meta.desc}
                    </p>

                    {/* 3. Unlocked status and optional metadata */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2.5 border-t border-white/[0.04]">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[10px] sm:text-[11px] font-mono font-semibold text-emerald-400 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
                        <span>Unlocked</span>
                      </span>

                      <div className="flex items-center gap-2 text-[11px] font-mono text-text-muted">
                        {meta.category && (
                          <span className="text-[10px] uppercase tracking-wider text-text-secondary">
                            {meta.category}
                          </span>
                        )}
                        {meta.xp && (
                          <span className="text-brand-yellow font-semibold">
                            +{meta.xp} XP
                          </span>
                        )}
                        {meta.date && (
                          <span className="text-text-muted">
                            {meta.date}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
