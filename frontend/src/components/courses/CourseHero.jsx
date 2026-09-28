import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import { BookOpen, GraduationCap, Play, Activity } from "lucide-react";
import ZeitnahZMotif from "./ZeitnahZMotif";

/**
 * CourseHero
 *
 * Cinematic dark editorial learning hero for Zeitnah Courses.
 * Features:
 * - Structural navy #12314C / deep charcoal #0A0F14 canvas with technical grid
 * - Ambient mint & yellow glow
 * - Large-scale asymmetrical organic "Z" motif watermark
 * - Massive editorial typography: "BUILD WHAT'S NEXT."
 * - Instrument-panel "Learning Signal" telemetry (real progress only, zero fabrication)
 * - Premium Framer Motion entry with ease [0.16, 1, 0.3, 1]
 */
const CourseHero = memo(function CourseHero({
  stats,
  user,
  enrolledCourses = [],
  loading = false,
}) {
  const firstName = user?.name ? user.name.trim().split(/\s+/)[0] : null;

  // Compute real average progress for enrolled courses
  const learningSignal = useMemo(() => {
    if (!enrolledCourses || enrolledCourses.length === 0) return null;
    const progressValues = enrolledCourses
      .map((c) => c.learningProgress?.completionPercent)
      .filter((p) => typeof p === "number" && !isNaN(p));

    if (progressValues.length === 0) return null;
    const avg = Math.round(
      progressValues.reduce((sum, val) => sum + val, 0) / progressValues.length
    );
    return {
      averageProgress: Math.min(100, Math.max(0, avg)),
      activeCount: progressValues.filter((p) => p > 0 && p < 100).length,
      completedCount: progressValues.filter((p) => p >= 100).length,
    };
  }, [enrolledCourses]);

  const easePremium = [0.16, 1, 0.3, 1];

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: easePremium }}
      aria-label="Zeitnah Courses Hero"
      className="relative overflow-hidden rounded-3xl zn-hero-panel bg-technical-grid p-6 sm:p-10 lg:p-14"
    >
      {/* ── AMBIENT GLOWS ── */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full bg-brand-mint/10 blur-[120px] mix-blend-screen" />
      <div className="pointer-events-none absolute -bottom-32 -right-20 w-96 h-96 rounded-full bg-brand-yellow/8 blur-[130px] mix-blend-screen" />
      <div className="pointer-events-none absolute top-1/2 left-1/3 -translate-y-1/2 w-[500px] h-[300px] bg-brand-navy/60 blur-[100px]" />

      {/* ── SPATIAL ORGANIC Z MOTIF (Large-scale, low opacity, asymmetrical bleed) ── */}
      <div className="pointer-events-none absolute -right-16 sm:-right-8 -bottom-20 sm:-bottom-16 w-80 sm:w-96 md:w-[480px] h-80 sm:h-96 md:h-[480px] select-none">
        <ZeitnahZMotif
          variant="gradient"
          opacity={0.065}
          className="w-full h-full rotate-6 transform-gpu"
        />
      </div>

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 lg:gap-12">
        {/* ── LEFT: Editorial Typography & Statement ── */}
        <div className="space-y-6 max-w-2xl">
          {/* Eyebrow / Learning Status Indicator */}
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: easePremium }}
            className="inline-flex items-center gap-2.5 rounded-full bg-[#12314C]/70 border border-brand-mint/25 px-3.5 py-1.5 backdrop-blur-md shadow-sm"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-mint opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-mint" />
            </span>
            <span className="text-[10px] sm:text-[11px] font-mono font-bold tracking-[0.2em] uppercase text-brand-mint">
              {firstName ? `LEARNER TELEMETRY // ${firstName}` : "ZEITNAH // ACADEMY MASTERCLASSES"}
            </span>
          </motion.div>

          {/* Massive Display Heading */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.18, ease: easePremium }}
            className="space-y-1"
          >
            <h1 className="display-headline text-4xl sm:text-6xl md:text-7xl lg:text-8xl tracking-tight text-white leading-[0.92]">
              BUILD
              <br />
              <span className="text-white/40">WHAT’S</span>
              <br />
              <span className="bg-gradient-to-r from-white via-white to-brand-mint bg-clip-text text-transparent">
                NEXT.
              </span>
            </h1>
          </motion.div>

          {/* Confident Editorial Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.28, ease: easePremium }}
            className="text-sm sm:text-base text-text-secondary leading-relaxed font-normal max-w-xl"
          >
            Rigorous modular engineering curriculum, live cohort workshops, and production masterclasses engineered for technical momentum.
          </motion.p>
        </div>

        {/* ── RIGHT: Real Metrics & Instrument Panel ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35, ease: easePremium }}
          className="flex flex-col sm:flex-row lg:flex-col gap-4 shrink-0 lg:min-w-[320px]"
        >
          {/* Real Metrics Telemetry Blocks */}
          {!loading && (
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3 w-full">
              {[
                {
                  label: "COURSES",
                  value: String(stats.total).padStart(2, "0"),
                  icon: BookOpen,
                  accent: "text-white",
                },
                {
                  label: "ENROLLED",
                  value: String(stats.enrolled).padStart(2, "0"),
                  icon: GraduationCap,
                  accent: "text-brand-mint",
                },
                {
                  label: "RECORDED",
                  value: String(stats.recordings).padStart(2, "0"),
                  icon: Play,
                  accent: "text-brand-yellow",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/[0.08] bg-[#0A0F14]/80 backdrop-blur-xl p-3 sm:p-4 flex flex-col justify-between transition-all hover:border-brand-mint/25 group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] sm:text-[10px] font-mono font-bold tracking-[0.18em] text-text-muted">
                      {item.label}
                    </span>
                    <item.icon className={`w-3.5 h-3.5 ${item.accent} opacity-80 group-hover:opacity-100 transition-opacity`} />
                  </div>
                  <p className="font-heading font-extrabold text-2xl sm:text-3xl text-white tracking-tight font-mono">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Real Learning Signal Instrument (Zero fabricated numbers) */}
          {learningSignal && (
            <div className="rounded-2xl border border-brand-mint/20 bg-[#12314C]/40 backdrop-blur-xl p-4 space-y-2.5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-brand-mint" />
                  <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-brand-mint">
                    LEARNING SIGNAL
                  </span>
                </div>
                <span className="text-xs font-mono font-extrabold text-white">
                  {learningSignal.averageProgress}% AVG
                </span>
              </div>

              {/* Progress Line */}
              <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-mint to-brand-yellow transition-all duration-1000 ease-out"
                  style={{ width: `${learningSignal.averageProgress}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono text-text-muted">
                <span>{learningSignal.activeCount} in progress</span>
                <span>{learningSignal.completedCount} completed</span>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </motion.section>
  );
});

export default CourseHero;
