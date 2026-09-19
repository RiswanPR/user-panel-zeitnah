import { motion } from "framer-motion";
import { Star, Award, BookOpen, CheckCircle2, Clock, ShieldCheck, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * Premium Personal Gamification Summary Component.
 * STRICT COMPLIANCE: Displays personal learning stats and XP progression only.
 * DOES NOT include leaderboard rankings, global positions, or course rank tables.
 */
export default function GamificationSummary({ profile, className = "" }) {
  const gamification = profile?.gamification || {};
  const totalPoints = gamification.totalPoints || 0;
  const level = gamification.level || 1;
  const rank = gamification.rank || "Beginner";
  const watchedClasses = gamification.watchedClasses || 0;
  const completedClasses = gamification.completedClasses || 0;
  const achievementsCount = gamification.achievements?.length || 0;

  // Derive points threshold for current vs next level
  const pointsForCurrentLevel = (level - 1) * 200;
  const pointsForNextLevel = level * 200;
  const pointsInLevel = Math.max(0, totalPoints - pointsForCurrentLevel);
  const pointsNeeded = 200;
  const levelProgress = Math.min(100, Math.round((pointsInLevel / pointsNeeded) * 100));

  const stats = [
    {
      label: "Classes Watched",
      value: watchedClasses,
      icon: BookOpen,
      desc: "Video lessons viewed",
    },
    {
      label: "Classes Completed",
      value: completedClasses,
      icon: CheckCircle2,
      desc: "Full completions",
    },
    {
      label: "Earned Badges",
      value: achievementsCount,
      icon: Award,
      desc: "Platform achievements",
    },
    {
      label: "Account Standing",
      value: profile?.isVerified ? "Verified" : "Standard",
      icon: ShieldCheck,
      desc: "Student status",
    },
  ];

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg sm:text-xl font-heading font-bold text-white tracking-tight">
            Learning Telemetry & XP
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            Your personal learning milestones and progression points
          </p>
        </div>

        <Link
          to="/my-points"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-brand-mint hover:text-brand-mint/80 transition-colors"
        >
          <span>View Rewards</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Primary XP Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="lg:col-span-1 rounded-2xl border border-border-default bg-bg-card p-6 relative overflow-hidden flex flex-col justify-between"
        >
          <div className="gradient-line-top" />
          <div className="absolute top-0 right-0 w-48 h-48 bg-brand-yellow/5 rounded-full blur-[80px] pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-yellow/10 border border-brand-yellow/20 text-brand-yellow text-xs font-bold uppercase tracking-wider">
                <Star className="w-3.5 h-3.5" />
                Total Score
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-brand-mint font-mono px-2 py-0.5 rounded-md bg-brand-mint/10 border border-brand-mint/20">
                {rank}
              </span>
            </div>

            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-1">
              Accumulated XP
            </p>
            <p className="text-4xl sm:text-5xl font-heading font-black text-white tracking-tight leading-none font-mono">
              {totalPoints.toLocaleString()}
            </p>
          </div>

          {/* Level Progress */}
          <div className="mt-6 pt-5 border-t border-white/[0.06]">
            <div className="flex justify-between text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
              <span className="text-white">Level {level}</span>
              <span className="text-brand-yellow">Level {level + 1}</span>
            </div>

            <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${levelProgress}%` }}
                transition={{ duration: 0.9, ease: "easeOut" }}
                className="h-full rounded-full bg-gradient-to-r from-brand-mint to-brand-yellow"
              />
            </div>

            <p className="text-[11px] text-text-muted mt-2 font-medium">
              {Math.max(0, pointsForNextLevel - totalPoints)} XP remaining to reach Level {level + 1}
            </p>
          </div>
        </motion.div>

        {/* Secondary Metrics Cluster */}
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-2 gap-3 sm:gap-4">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="rounded-2xl border border-border-default bg-bg-card p-5 sm:p-6 relative overflow-hidden flex flex-col justify-between group hover:border-brand-mint/20 transition-all"
              >
                <div className="gradient-line-top" />

                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-mint/8 border border-brand-mint/15 flex items-center justify-center text-brand-mint shrink-0 group-hover:scale-105 group-hover:bg-brand-mint/12 transition-all">
                    <Icon className="w-5 h-5" />
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-1">
                    {stat.label}
                  </p>
                  <p className="text-2xl sm:text-3xl font-heading font-extrabold text-white tracking-tight">
                    {stat.value}
                  </p>
                  <p className="text-[11px] font-medium text-text-faint mt-1">
                    {stat.desc}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
