import { memo } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import ZeitnahZMotif from "./ZeitnahZMotif";

/**
 * CourseClosingCTA
 *
 * Editorial closing statement and premium call-to-action for Zeitnah Courses.
 * Features:
 * - Deep navy #12314C brand panel with subtle technical grid
 * - Oversized typography: "YOUR NEXT SKILL IS WAITING."
 * - Large organic Z watermark
 * - Yellow primary CTA button
 */
const CourseClosingCTA = memo(function CourseClosingCTA({ onBrowseCatalog }) {
  const easePremium = [0.16, 1, 0.3, 1];

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: easePremium }}
      aria-label="Closing Call to Action"
      className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-[#12314C] via-[#0A0F14] to-[#07090B] p-8 sm:p-12 lg:p-16 text-center sm:text-left shadow-2xl bg-technical-grid"
    >
      {/* Subtle top hairline */}
      <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-brand-mint/40 to-transparent pointer-events-none" />

      {/* Ambient Glows */}
      <div className="pointer-events-none absolute -left-20 -top-20 w-80 h-80 rounded-full bg-brand-mint/10 blur-[100px]" />
      <div className="pointer-events-none absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-brand-yellow/8 blur-[100px]" />

      {/* Spatial Large Organic Z Motif */}
      <div className="pointer-events-none absolute -right-10 -bottom-16 w-80 sm:w-96 h-80 sm:h-96 select-none opacity-[0.05]">
        <ZeitnahZMotif variant="white" className="w-full h-full rotate-[-12deg]" />
      </div>

      <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-8">
        <div className="space-y-3 max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/[0.05] border border-white/[0.1] px-3 py-1 text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-brand-mint">
            <Sparkles className="w-3 h-3 text-brand-yellow" />
            ENGINEERING & PRODUCT MASTERY
          </div>

          <h2 className="display-headline text-3xl sm:text-4xl md:text-5xl text-white tracking-tight leading-none">
            YOUR NEXT SKILL IS WAITING.
          </h2>

          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed font-normal">
            Advance your production capability through structured modular instruction and peer-benchmarked engineering challenges.
          </p>
        </div>

        <div className="shrink-0">
          <button
            type="button"
            onClick={onBrowseCatalog}
            className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-brand-yellow text-black font-heading font-extrabold text-xs uppercase tracking-wider shadow-xl hover:bg-brand-yellow/90 hover:shadow-[0_0_28px_rgba(246,237,74,0.35)] transition-all cursor-pointer select-none active:scale-[0.98]"
          >
            <span>Explore Entire Library</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.section>
  );
});

export default CourseClosingCTA;
