import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Users, Sparkles, Activity } from "lucide-react";

/**
 * Computes contextual greeting according to student's local time.
 */
function getContextualGreeting(userName) {
  const hour = new Date().getHours();
  let timeGreeting = "Good evening";

  if (hour >= 5 && hour < 12) {
    timeGreeting = "Good morning";
  } else if (hour >= 12 && hour < 17) {
    timeGreeting = "Good afternoon";
  }

  const cleanName = userName ? userName.trim().split(" ")[0] : "Student";
  return `${timeGreeting}, ${cleanName} 👋`;
}

/**
 * NetworkHero Component
 * Premium hero section for the Zeitnah Network.
 *
 * @param {Object} props
 * @param {Object} [props.user] - Authenticated user object
 * @param {Object} [props.stats] - Dynamic network metrics
 * @param {boolean} [props.loading] - Whether data is loading
 */
export default function NetworkHero({ user, stats, loading = false }) {
  const shouldReduceMotion = useReducedMotion();

  const greeting = useMemo(() => {
    return getContextualGreeting(user?.name);
  }, [user?.name]);

  const activeStudents = stats?.activeStudentsCount ?? 284;

  return (
    <section
      aria-labelledby="network-hero-heading"
      className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-[#0F1728]/95 via-[#0D1524]/90 to-[#070B14]/95 p-6 sm:p-8 lg:p-10 shadow-2xl backdrop-blur-xl"
    >
      {/* Subtle Ambient Radial Lighting — Violet / Periwinkle Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-gradient-to-tr from-brand-mint/10 via-brand-navy/10 to-transparent blur-3xl"
      />

      {/* Subtle Top Border Highlight */}
      <div className="gradient-line-top" />

      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        {/* Left Column: Headlines & Greeting */}
        <div className="max-w-2xl space-y-3">
          {/* Badge / Page Label */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="inline-flex items-center gap-2 rounded-full border border-brand-mint/20 bg-brand-mint/[0.06] px-3 py-1 text-[11px] font-mono font-semibold uppercase tracking-widest text-brand-mint"
          >
            <Sparkles className="h-3 w-3 text-brand-mint" aria-hidden="true" />
            <span>NETWORK</span>
          </motion.div>

          {/* Contextual Greeting */}
          <motion.p
            initial={shouldReduceMotion ? false : { opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="text-sm font-semibold tracking-wide text-brand-yellow/90 sm:text-base"
          >
            {greeting}
          </motion.p>

          {/* Main Headline */}
          <motion.h1
            id="network-hero-heading"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-2xl sm:text-3xl lg:text-4xl font-heading font-extrabold tracking-tight text-white leading-tight"
          >
            Your learning community,{" "}
            <span className="text-gradient">connected in one place.</span>
          </motion.h1>

          {/* Supporting Text */}
          <motion.p
            initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="text-sm sm:text-base text-text-secondary leading-relaxed max-w-xl"
          >
            Discover students, connect with people, and stay involved in the
            Zeitnah community.
          </motion.p>
        </div>

        {/* Right Column: Contextual Dynamic Network Metric Area */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="shrink-0 flex flex-col sm:flex-row lg:flex-col gap-3"
        >
          {/* Primary Metric Pill */}
          <div className="flex items-center gap-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 backdrop-blur-md transition-colors hover:border-white/[0.14] hover:bg-white/[0.05]">
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-brand-mint/25 bg-brand-mint/10 text-brand-mint shadow-inner">
              <Users className="h-5 w-5" aria-hidden="true" />
              {/* Subtle Live Pulse Dot */}
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-mint opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-brand-mint" />
              </span>
            </div>

            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-heading font-extrabold text-white tabular-nums tracking-tight">
                  {loading ? "..." : activeStudents.toLocaleString()}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-brand-mint">
                  Active
                </span>
              </div>
              <p className="text-xs text-text-muted">students are learning today</p>
            </div>
          </div>

          {/* Secondary Metric / Community Pulse */}
          <div className="hidden sm:flex items-center gap-3 px-3 py-2 text-xs text-text-muted">
            <Activity className="h-3.5 w-3.5 text-brand-yellow/80 shrink-0" aria-hidden="true" />
            <span>Learning sessions in real-time across tracks</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
