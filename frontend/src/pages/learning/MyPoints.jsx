import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Award, CheckCircle2, Clock, Star, Target, TrendingUp } from "lucide-react";
import api from "../../services/api";

const activityIconMap = {
  class_completed: CheckCircle2,
  course_completed: Award,
  watch_minutes: Clock,
  profile_completion: Target,
};

function MyPoints() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/courses/my-points");
        setData(res.data);
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 shimmer rounded-lg" />
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="h-72 shimmer rounded-2xl" />
          <div className="h-52 shimmer rounded-2xl" />
        </div>
        <div className="h-64 shimmer rounded-2xl" />
      </div>
    );
  }

  const gamification = data?.gamification || {};
  const levelProgress = data?.levelProgress || {};
  const activities = data?.recentActivities || [];
  const progressPercent = levelProgress.progressPercent || 0;

  return (
    <div className="space-y-6 sm:space-y-8">

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <div className="inline-flex items-center gap-2 rounded-lg bg-brand-yellow/8 border border-brand-yellow/15 px-3 py-1.5 text-xs font-semibold text-brand-yellow uppercase tracking-wider">
          <Star className="w-3.5 h-3.5" />
          Gamification
        </div>
        <h1 className="font-heading font-extrabold text-3xl sm:text-4xl md:text-5xl text-white tracking-tight leading-none">
          Level & Rewards
        </h1>
      </motion.div>

      {/* ── Two-Column Layout ── */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] items-start">

        {/* Scoreboard Hero Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border-default bg-bg-card p-6 sm:p-8 relative overflow-hidden"
        >
          <div className="gradient-line-top" />
          <div className="absolute top-0 right-0 w-[250px] h-[250px] bg-brand-mint/4 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative flex flex-col sm:flex-row items-center gap-8 w-full">

            {/* Circular level indicator */}
            <div className="relative h-40 w-40 sm:h-44 sm:w-44 shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
                <circle cx="80" cy="80" r="68" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="10" />
                <motion.circle
                  cx="80" cy="80" r="68" fill="none" stroke="url(#levelGrad)" strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 68}`}
                  initial={{ strokeDashoffset: 2 * Math.PI * 68 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 68 * (1 - progressPercent / 100) }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                />
                <defs>
                  <linearGradient id="levelGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#9FD5B2" />
                    <stop offset="100%" stopColor="#F6ED4A" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Star className="w-5 h-5 text-brand-mint mb-1" />
                <span className="text-3xl sm:text-4xl font-heading font-extrabold text-white">{gamification.level || 1}</span>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mt-0.5">Level</span>
              </div>
            </div>

            {/* Stats */}
            <div className="flex-1 text-center sm:text-left min-w-0 w-full">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-1">Total Points</p>
              <p className="font-heading font-extrabold text-4xl sm:text-5xl text-white tracking-tight truncate leading-none">
                {gamification.totalPoints || 0}
              </p>

              <div className="mt-4 flex flex-wrap gap-2 justify-center sm:justify-start">
                <span className="rounded-lg border border-brand-mint/20 bg-brand-mint/8 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-mint">
                  {gamification.rank || "Beginner"}
                </span>
                <span className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1 text-xs font-semibold text-text-muted">
                  {levelProgress.pointsToNextLevel || 0} pts to next
                </span>
              </div>

              {/* Level progress bar */}
              <div className="mt-6 w-full">
                <div className="mb-2 flex justify-between text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                  <span>Level {gamification.level || 1}</span>
                  <span>{levelProgress.nextLevel ? `Level ${levelProgress.nextLevel}` : "Max"}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="h-full rounded-full bg-gradient-to-r from-brand-mint to-brand-yellow"
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Achievements Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-border-default bg-bg-card p-6 relative overflow-hidden"
        >
          <div className="gradient-line-top" />

          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-mint/8 border border-brand-mint/15 text-brand-mint">
              <Award className="w-4 h-4" />
            </span>
            <h2 className="text-lg font-heading font-bold text-white">Achievements</h2>
          </div>

          <div className="flex flex-wrap gap-2 w-full">
            {gamification.achievements?.length ? (
              gamification.achievements.map((achievement) => (
                <span
                  key={achievement}
                  className="rounded-lg border border-brand-mint/12 bg-brand-mint/5 px-3 py-1.5 text-xs font-medium text-text-secondary tracking-wide"
                >
                  🏆 {achievement}
                </span>
              ))
            ) : (
              <p className="text-text-muted text-sm font-medium py-2">No achievements unlocked yet. Keep learning!</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* ── Recent Activity ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl border border-border-default bg-bg-card p-6 relative overflow-hidden"
      >
        <div className="gradient-line-top" />

        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-mint/8 border border-brand-mint/15 text-brand-mint">
            <TrendingUp className="w-4 h-4" />
          </span>
          <h2 className="text-lg font-heading font-bold text-white">Recent Activity</h2>
        </div>

        <div className="space-y-3 w-full">
          {activities.length ? (
            activities.map((activity, index) => {
              const Icon = activityIconMap[activity.type] || Star;
              return (
                <motion.div
                  key={`${activity.type}-${activity.createdAt}-${index}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                  className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.04] bg-white/[0.02] p-4 hover:border-brand-mint/15 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-bg-elevated border border-white/[0.05] text-brand-mint shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-white text-sm truncate">{activity.label}</p>
                      <p className="text-xs font-medium text-text-muted mt-0.5">
                        {activity.createdAt ? new Date(activity.createdAt).toLocaleDateString() : ""}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-lg border border-success/20 bg-success/8 px-2.5 py-1 text-xs font-bold text-success tracking-wide shrink-0">
                    +{activity.points} PTS
                  </span>
                </motion.div>
              );
            })
          ) : (
            <p className="text-text-muted text-sm font-medium py-4 text-center">No recent activity yet.</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default MyPoints;