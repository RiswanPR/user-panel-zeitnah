import { memo } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import ZeitnahZMotif from "./ZeitnahZMotif";
import ZeitnahTopographyPattern from "./ZeitnahTopographyPattern";
import BrandSticker from "./BrandSticker";
import BrandArrowBadge from "./BrandArrowBadge";
import { useCardSpotlight } from "../../hooks/useCardSpotlight";

/**
 * CourseClosingCTA
 *
 * Editorial closing statement and premium call-to-action for Zeitnah Courses.
 * Directly grounded in the Zeitnah Group of Institution Brand Guideline.
 *
 * Features & Effects:
 * - Fluid organic Topographic Contour lines (Brand Guideline Pages 1, 3, 5)
 * - Tilted paper Brand Sticker "NEXT TRAJECTORY" (Pages 1 & 3)
 * - Brand Yellow circular arrow badge (Page 1)
 * - Mouse-tracking tactile radial spotlight in Light Mode
 * - Oversized typography: "YOUR NEXT SKILL IS WAITING."
 * - Large organic Z watermark
 * - Brand Yellow primary CTA button with tactile micro-bounce
 */
const CourseClosingCTA = memo(function CourseClosingCTA({ onBrowseCatalog }) {
  const { onMouseMove, onMouseLeave, spotlightStyle } = useCardSpotlight({
    radius: 500,
  });
  const easePremium = [0.16, 1, 0.3, 1];

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: easePremium }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      aria-label="Closing Call to Action"
      className="group relative overflow-hidden rounded-3xl border border-border/80 bg-surface-card zn-gradient-hero p-8 sm:p-12 lg:p-16 text-center sm:text-left shadow-lg hover:shadow-xl transition-all duration-300"
    >
      {/* Subtle top hairline */}
      <div className="zn-hairline-mint" />

      {/* ── INTERACTIVE MOUSE SPOTLIGHT (Light Mode Tactile Sheen) ── */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={spotlightStyle}
      />

      {/* Ambient Glows */}
      <div className="pointer-events-none absolute -left-20 -top-20 w-80 h-80 rounded-full bg-brand-mint/15 blur-[100px]" />
      <div className="pointer-events-none absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-brand-yellow/12 blur-[100px]" />

      {/* Flowing Topographic Contour Lines */}
      <div className="pointer-events-none absolute -left-10 -bottom-10 w-96 h-96 opacity-25 dark:opacity-10 z-0">
        <ZeitnahTopographyPattern variant="dual" opacity={0.3} animated={true} />
      </div>

      {/* Spatial Large Organic Z Motif */}
      <div className="pointer-events-none absolute -right-10 -bottom-16 w-80 sm:w-96 h-80 sm:h-96 select-none opacity-[0.05] group-hover:opacity-[0.08] transition-opacity duration-500 z-0">
        <ZeitnahZMotif variant="white" className="w-full h-full rotate-[-12deg]" />
      </div>

      <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-8">
        <div className="space-y-4 max-w-xl">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
            <BrandSticker variant="yellow" rotation={-4}>
              CAREER VELOCITY
            </BrandSticker>

            <div className="inline-flex items-center gap-2 rounded-full bg-brand-surface-subtle dark:bg-brand-mint/10 border border-emerald-600/20 dark:border-brand-mint/20 px-3 py-1 text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-brand-primary dark:text-brand-mint shadow-xs">
              <Sparkles className="w-3 h-3 text-amber-600 dark:text-brand-yellow" />
              ENGINEERING MASTERY
            </div>
          </div>

          <h2 className="display-headline text-3xl sm:text-4xl md:text-5xl text-text-primary tracking-tight leading-none">
            YOUR NEXT SKILL IS WAITING.
          </h2>

          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed font-normal">
            Advance your production capability through structured modular instruction and peer-benchmarked engineering challenges.
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-4">
          <button
            type="button"
            onClick={onBrowseCatalog}
            className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-brand-yellow text-brand-navy font-heading font-extrabold text-xs uppercase tracking-wider shadow-xl hover:bg-brand-yellow/90 hover:shadow-[0_0_32px_rgba(246,237,74,0.45)] transition-all cursor-pointer select-none active:scale-[0.98] min-h-[44px]"
          >
            <span>Explore Entire Library</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <BrandArrowBadge
            size={48}
            onClick={onBrowseCatalog}
            className="hidden lg:inline-flex"
          />
        </div>
      </div>
    </motion.section>
  );
});

export default CourseClosingCTA;
