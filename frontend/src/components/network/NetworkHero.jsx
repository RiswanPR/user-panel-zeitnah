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

  const activeStudents = stats?.activeStudentsCount ?? 0;
  const connectionsCount = stats?.connectionsCount ?? 0;
  const incomingRequestsCount = stats?.incomingRequestsCount ?? 0;
  const joinedCommunitiesCount = stats?.joinedCommunitiesCount ?? 0;

  return (
    <section
      aria-labelledby="network-hero-heading"
      className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-b from-[#0C1220]/95 via-[#080D18]/90 to-[#040607]/95 p-6 sm:p-8 lg:p-10 shadow-2xl backdrop-blur-xl"
    >
      {/* Subtle Ambient Violet & Periwinkle Glow (Restrained) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -right-32 h-80 w-80 rounded-full bg-[#4928C2]/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-[#5B2A62]/10 blur-3xl"
      />

      {/* Subtle Top Border Highlight */}
      <div className="gradient-line-top" />

      <div className="relative z-10 flex flex-col gap-8 lg:gap-10">
        {/* Main Content Area */}
        <div className="max-w-3xl space-y-4">
          {/* Badge & Contextual Greeting */}
          <div className="flex flex-wrap items-center gap-3">
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.04] px-3 py-1 text-[11px] font-mono font-semibold uppercase tracking-widest text-[#E3D9FC]"
            >
              <Sparkles className="h-3 w-3 text-[#E3D9FC]" aria-hidden="true" />
              <span>YOUR LEARNING NETWORK</span>
            </motion.div>

            <motion.span
              initial={shouldReduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.05 }}
              className="text-xs font-semibold text-text-muted"
            >
              {greeting}
            </motion.span>
          </div>

          {/* Main Headline */}
          <motion.h1
            id="network-hero-heading"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-heading font-extrabold tracking-tight text-white leading-tight"
          >
            Discover people who are learning{" "}
            <span className="text-gradient">in the same direction as you.</span>
          </motion.h1>

          {/* Supporting Subtitle */}
          <motion.p
            initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="text-sm sm:text-base text-text-secondary leading-relaxed max-w-2xl"
          >
            Connect with peers across your course, exchange knowledge, collaborate in focused learning spaces, and build your professional network.
          </motion.p>
        </div>

        {/* Telemetry Strip (Real Database Counts) */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="flex flex-wrap items-center gap-3 sm:gap-6 pt-6 border-t border-white/[0.06]"
        >
          {/* Item 1: Connections */}
          <div className="flex items-center gap-2.5">
            <span className="text-xl sm:text-2xl font-heading font-extrabold text-white tabular-nums">
              {loading ? "..." : connectionsCount.toLocaleString()}
            </span>
            <span className="text-xs font-medium text-text-muted">
              Connections
            </span>
          </div>

          <div className="hidden sm:block h-4 w-px bg-white/[0.1]" aria-hidden="true" />

          {/* Item 2: Pending Requests */}
          <div className="flex items-center gap-2.5">
            <span className="text-xl sm:text-2xl font-heading font-extrabold text-white tabular-nums">
              {loading ? "..." : incomingRequestsCount.toLocaleString()}
            </span>
            <span className="text-xs font-medium text-text-muted">
              Pending {incomingRequestsCount === 1 ? "Request" : "Requests"}
            </span>
          </div>

          <div className="hidden sm:block h-4 w-px bg-white/[0.1]" aria-hidden="true" />

          {/* Item 3: Learning Spaces */}
          <div className="flex items-center gap-2.5">
            <span className="text-xl sm:text-2xl font-heading font-extrabold text-white tabular-nums">
              {loading ? "..." : joinedCommunitiesCount.toLocaleString()}
            </span>
            <span className="text-xs font-medium text-text-muted">
              Learning {joinedCommunitiesCount === 1 ? "Space" : "Spaces"}
            </span>
          </div>

          <div className="hidden sm:block h-4 w-px bg-white/[0.1]" aria-hidden="true" />

          {/* Item 4: Active Learners */}
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-mint opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-mint" />
            </span>
            <span className="text-xl sm:text-2xl font-heading font-extrabold text-brand-mint tabular-nums">
              {loading ? "..." : activeStudents.toLocaleString()}
            </span>
            <span className="text-xs font-medium text-text-muted">
              Active Today
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
