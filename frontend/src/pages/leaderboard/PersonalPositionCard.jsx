import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Star, Award, ArrowUpRight, TrendingUp, CheckCircle2 } from "lucide-react";

export default function PersonalPositionCard({
  telemetry,
  courseTelemetry,
  isCourseMode = false,
  courseName = "",
}) {
  if (!telemetry && !courseTelemetry) return null;

  const currentRank = isCourseMode && courseTelemetry?.rank
    ? courseTelemetry.rank
    : telemetry?.rank || "—";

  const xpValue = isCourseMode && courseTelemetry
    ? courseTelemetry.courseXp || 0
    : telemetry?.points || 0;

  const xpLabel = isCourseMode ? "Course XP" : "Global XP";

  const level = telemetry?.level || 1;
  const rankTitle = telemetry?.rankTitle || "Beginner";
  const levelProgress = telemetry?.levelProgress || {};
  const progressPercent = levelProgress.progressPercent || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 }}
      className="relative overflow-hidden rounded-2xl bg-bg-card border border-border-default p-6 sm:p-7 shadow-sm"
    >
      <div className="gradient-line-top" />
      <div className="absolute top-0 right-0 w-[240px] h-[240px] bg-brand-mint/5 rounded-full blur-[90px] pointer-events-none" />

      <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        {/* Left Side: Position & Identity */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          {/* Prominent Rank Badge */}
          <div className="relative flex items-center justify-center h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-gradient-to-br from-brand-mint/15 to-brand-navy/30 border border-brand-mint/25 shadow-inner shrink-0">
            <div className="text-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-brand-mint block">
                Rank
              </span>
              <span className="font-heading font-black text-3xl sm:text-4xl text-white font-mono leading-none">
                #{currentRank}
              </span>
            </div>
            <span className="absolute -top-1.5 -right-1.5 rounded-md bg-brand-yellow px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-bg-base shadow-sm">
              YOU
            </span>
          </div>

          {/* Stats details */}
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                {isCourseMode ? `Your Course Standing (${courseName || "Curriculum"})` : "Your Global Standing"}
              </span>
              {telemetry?.totalLearners && !isCourseMode && (
                <span className="rounded-full bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 text-[10px] text-text-muted font-mono">
                  of {telemetry.totalLearners.toLocaleString()} learners
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-3">
              <span className="font-heading font-black text-3xl sm:text-4xl text-white font-mono tracking-tight leading-none">
                {xpValue.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-brand-mint uppercase tracking-wider">
                {xpLabel}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1 rounded-lg border border-brand-mint/20 bg-brand-mint/8 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-brand-mint">
                <Star className="w-3 h-3 text-brand-yellow" />
                Level {level}
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-0.5 text-xs font-semibold text-text-secondary">
                <Award className="w-3 h-3 text-brand-mint" />
                {rankTitle}
              </span>

              {isCourseMode && courseTelemetry?.completionPercent !== undefined && (
                <span className="inline-flex items-center gap-1 rounded-lg border border-brand-yellow/20 bg-brand-yellow/8 px-2.5 py-0.5 text-xs font-bold font-mono text-brand-yellow">
                  <CheckCircle2 className="w-3 h-3" />
                  {courseTelemetry.completionPercent}% Completed
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Level Progression & Link to My Points */}
        <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-4 pt-4 lg:pt-0 border-t lg:border-t-0 border-white/[0.06] min-w-[280px]">
          {/* Level Progress */}
          <div className="w-full sm:max-w-xs lg:max-w-none space-y-1.5">
            <div className="flex justify-between items-center text-[11px] font-semibold text-text-muted uppercase tracking-wider">
              <span>Level {level}</span>
              <span className="text-brand-mint font-mono">
                {levelProgress.nextLevel
                  ? `${(levelProgress.pointsToNextLevel || 0).toLocaleString()} XP to L${levelProgress.nextLevel}`
                  : "Max Level"}
              </span>
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

          {/* Complementary Link to My Points */}
          <Link
            to="/my-points"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-text-muted hover:text-brand-mint transition-colors group cursor-pointer"
          >
            <span>View Points & Milestone History</span>
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
