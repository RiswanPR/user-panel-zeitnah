import { motion } from "framer-motion";
import { Award, CheckCircle2, Star, Sparkles, Lock } from "lucide-react";

const ACHIEVEMENT_METADATA = {
  first_class: {
    title: "First Step",
    desc: "Streamed and completed your first lecture video.",
    icon: Star,
  },
  five_classes: {
    title: "Dedicated Learner",
    desc: "Successfully completed 5 video classes.",
    icon: CheckCircle2,
  },
  ten_classes: {
    title: "Knowledge Seeker",
    desc: "Completed 10 interactive classes.",
    icon: Award,
  },
  course_completed: {
    title: "Course Graduate",
    desc: "Fully completed an entire curriculum course.",
    icon: Award,
  },
  profile_100: {
    title: "Identity Master",
    desc: "Reached 100% profile completeness.",
    icon: Sparkles,
  },
};

/**
 * Premium Achievements Grid Component.
 * Displays unlocked achievements from gamification telemetry with luxury metallic accents.
 */
export default function AchievementsGrid({ profile, className = "" }) {
  const achievements = profile?.gamification?.achievements || [];

  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <h2 className="text-lg sm:text-xl font-heading font-bold text-white tracking-tight">
          Unlocked Achievements
        </h2>
        <p className="text-xs text-text-muted mt-0.5">
          Milestones and accomplishments earned throughout your learning journey
        </p>
      </div>

      {achievements.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-default bg-bg-card/40 p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-text-muted mx-auto mb-3">
            <Award className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-heading font-bold text-white mb-1">
            No achievements unlocked yet
          </h3>
          <p className="text-xs text-text-muted max-w-sm mx-auto">
            Complete video classes, finish courses, and strengthen your profile to earn achievements.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {achievements.map((key, i) => {
            const meta = ACHIEVEMENT_METADATA[key] || {
              title: String(key)
                .replaceAll("_", " ")
                .replace(/\b\w/g, (l) => l.toUpperCase()),
              desc: "Platform achievement unlocked.",
              icon: Award,
            };
            const Icon = meta.icon;

            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.05 }}
                className="relative overflow-hidden rounded-2xl border border-brand-mint/20 bg-bg-card p-4 sm:p-5 flex items-start gap-3.5 group hover:border-brand-mint/40 transition-all shadow-[0_0_20px_rgba(159,213,178,0.03)]"
              >
                <div className="gradient-line-top" />

                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-mint/15 to-brand-yellow/10 border border-brand-mint/25 flex items-center justify-center text-brand-mint shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                  <Icon className="w-5 h-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-sm font-heading font-bold text-white truncate">
                      {meta.title}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-mint shrink-0" />
                  </div>
                  <p className="text-xs text-text-muted leading-relaxed line-clamp-2">
                    {meta.desc}
                  </p>
                  <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wider text-brand-mint font-mono">
                    Unlocked
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
