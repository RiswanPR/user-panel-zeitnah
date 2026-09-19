import { motion } from "framer-motion";
import { Trophy, BookOpen, Sparkles } from "lucide-react";

export default function LeaderboardHero({ activeMode, onModeChange, enrolledCourseCount = 0 }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="relative overflow-hidden rounded-2xl bg-bg-card border border-border-default shadow-sm p-6 sm:p-8"
    >
      <div className="gradient-line-top" />
      <div className="absolute top-0 right-0 w-[380px] h-[380px] bg-brand-yellow/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 w-[260px] h-[260px] bg-brand-mint/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-lg bg-brand-yellow/8 border border-brand-yellow/15 px-3 py-1.5 text-xs font-bold text-brand-yellow uppercase tracking-wider">
            <Trophy className="w-3.5 h-3.5" />
            Learning Arena & Recognition
          </div>

          <div>
            <h1 className="font-heading font-black text-3xl sm:text-4xl md:text-5xl text-white tracking-tight leading-none">
              Learn. Progress. Rise.
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-text-muted leading-relaxed max-w-xl">
              See how your learning journey compares across the Zeitnah global community and within your enrolled curricula.
            </p>
          </div>
        </div>

        {/* Mode Switcher: Zeitnah (Global) vs My Courses */}
        <div className="inline-flex items-center p-1.5 rounded-2xl bg-bg-base/80 border border-border-subtle backdrop-blur-xl shrink-0 self-start md:self-auto shadow-inner">
          <button
            type="button"
            onClick={() => onModeChange("global")}
            className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold tracking-wide transition-all duration-200 cursor-pointer ${
              activeMode === "global"
                ? "text-white font-bold"
                : "text-text-muted hover:text-text-secondary hover:bg-white/[0.03]"
            }`}
          >
            {activeMode === "global" && (
              <motion.div
                layoutId="leaderboard-mode-pill"
                className="absolute inset-0 rounded-xl bg-gradient-to-r from-brand-mint/15 to-brand-navy/30 border border-brand-mint/25 shadow-sm"
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
              />
            )}
            <Sparkles
              className={`relative z-10 w-4 h-4 ${
                activeMode === "global" ? "text-brand-mint" : "text-text-faint"
              }`}
            />
            <span className="relative z-10">Zeitnah Global</span>
          </button>

          <button
            type="button"
            onClick={() => onModeChange("courses")}
            className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold tracking-wide transition-all duration-200 cursor-pointer ${
              activeMode === "courses"
                ? "text-white font-bold"
                : "text-text-muted hover:text-text-secondary hover:bg-white/[0.03]"
            }`}
          >
            {activeMode === "courses" && (
              <motion.div
                layoutId="leaderboard-mode-pill"
                className="absolute inset-0 rounded-xl bg-gradient-to-r from-brand-mint/15 to-brand-navy/30 border border-brand-mint/25 shadow-sm"
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
              />
            )}
            <BookOpen
              className={`relative z-10 w-4 h-4 ${
                activeMode === "courses" ? "text-brand-mint" : "text-text-faint"
              }`}
            />
            <span className="relative z-10">My Courses</span>
            {enrolledCourseCount > 0 && (
              <span className="relative z-10 ml-1 rounded-md bg-white/[0.08] px-1.5 py-0.5 text-[10px] font-mono text-text-muted">
                {enrolledCourseCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </motion.section>
  );
}
