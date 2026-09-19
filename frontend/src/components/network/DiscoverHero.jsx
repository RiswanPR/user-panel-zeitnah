import { motion, useReducedMotion } from "framer-motion";
import { Compass } from "lucide-react";

/**
 * DiscoverHero Component
 * Focused, compact discovery header for the student directory.
 */
export default function DiscoverHero() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section
      aria-labelledby="discover-hero-heading"
      className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-r from-[#0F1728]/90 via-[#0D1524]/80 to-[#070B14]/90 p-5 sm:p-6 backdrop-blur-xl shadow-md"
    >
      {/* Subtle Ambient Radial Lighting */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-indigo-500/10 blur-2xl"
      />
      <div className="gradient-line-top" />

      <div className="relative z-10 flex flex-col gap-2 max-w-2xl">
        {/* Page Badge */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="inline-flex items-center gap-1.5 self-start rounded-full border border-brand-mint/20 bg-brand-mint/[0.06] px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-widest text-brand-mint"
        >
          <Compass className="h-3 w-3 text-brand-mint" aria-hidden="true" />
          <span>DISCOVER</span>
        </motion.div>

        {/* Main Headline */}
        <motion.h1
          id="discover-hero-heading"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="text-xl sm:text-2xl font-heading font-extrabold text-white tracking-tight leading-snug"
        >
          Find people who are learning,{" "}
          <span className="text-gradient">building, and growing with Zeitnah.</span>
        </motion.h1>

        {/* Supporting Text */}
        <motion.p
          initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="text-xs sm:text-sm text-text-secondary leading-relaxed"
        >
          Search by name, username, course, or learning interests.
        </motion.p>
      </div>
    </section>
  );
}
