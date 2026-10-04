import { motion } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import { useOnboarding } from '../../context/OnboardingContext';

export default function OnboardingCard({ placementData }) {
  const {
    activeStep,
    spotlightIndex,
    totalSpotlightSteps,
    nextStep,
    prevStep,
    skipTour,
  } = useOnboarding();

  const isLastSpotlight = spotlightIndex === totalSpotlightSteps;

  return (
    <motion.div
      initial={{ opacity: 0, y: placementData.placement === 'top' ? -8 : 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-step-title"
      aria-describedby="onboarding-step-desc"
      style={{
        position: 'fixed',
        top: placementData.top,
        left: placementData.left,
        width: typeof window !== 'undefined' && window.innerWidth < 420 ? 'calc(100vw - 32px)' : '360px',
        zIndex: 10001,
        background: 'rgba(11, 17, 30, 0.98)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        boxShadow:
          '0 20px 60px rgba(0, 0, 0, 0.6), 0 0 30px rgba(159, 213, 178, 0.08)',
        backdropFilter: 'blur(24px)',
      }}
      className="p-5 text-white select-none"
    >
      {/* Top subtle mint hairline */}
      <div
        className="absolute top-0 inset-x-4 h-px pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(159,213,178,0.5) 50%, transparent 100%)',
        }}
      />

      {/* Header: Section badge + Step counter + Close button */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-[9px] uppercase font-bold tracking-widest text-brand-mint/90 px-2 py-0.5 rounded-md bg-brand-mint/10 border border-brand-mint/20">
            {activeStep.sectionBadge || 'DISCOVER'}
          </span>
          <span className="font-mono text-[10px] text-white/40 tracking-wider">
            {spotlightIndex} of {totalSpotlightSteps}
          </span>
        </div>

        <button
          type="button"
          onClick={skipTour}
          aria-label="Skip tour"
          className="p-1 rounded-md text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint/50 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Step Title */}
      <h3
        id="onboarding-step-title"
        className="text-base font-heading font-semibold text-white tracking-tight mb-1.5 leading-snug"
      >
        {activeStep.title}
      </h3>

      {/* Description */}
      <p
        id="onboarding-step-desc"
        className="text-xs text-text-secondary leading-relaxed mb-3.5"
      >
        {activeStep.description}
      </p>

      {/* Highlights List if defined */}
      {Array.isArray(activeStep.highlights) && activeStep.highlights.length > 0 && (
        <div className="mb-4 space-y-1.5 pt-2 border-t border-white/[0.06]">
          {activeStep.highlights.map((h, i) => (
            <div key={i} className="flex items-center gap-2 text-[11px] text-white/70">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-mint/70 shrink-0" />
              <span className="truncate">{h}</span>
            </div>
          ))}
        </div>
      )}

      {/* Bottom Footer: Progress Dots + Navigation Buttons */}
      <div className="flex items-center justify-between pt-3 border-t border-white/[0.08] gap-2">
        {/* Progress indicators */}
        <div className="flex items-center gap-1">
          {Array.from({ length: totalSpotlightSteps }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                i + 1 === spotlightIndex
                  ? 'w-4 bg-brand-mint'
                  : i + 1 < spotlightIndex
                  ? 'w-1.5 bg-brand-mint/40'
                  : 'w-1.5 bg-white/15'
              }`}
            />
          ))}
        </div>

        {/* Navigation CTAs */}
        <div className="flex items-center gap-2 shrink-0">
          {spotlightIndex > 1 && (
            <button
              type="button"
              onClick={prevStep}
              aria-label="Previous step"
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-white/50 hover:text-white hover:bg-white/[0.04] transition-colors flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint/50 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          )}

          <button
            type="button"
            onClick={nextStep}
            autoFocus
            aria-label={isLastSpotlight ? 'Finish tour' : 'Next step'}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-black bg-brand-mint hover:bg-brand-mint/90 transition-all flex items-center gap-1 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint/50 cursor-pointer"
          >
            <span>{isLastSpotlight ? 'Finish' : 'Next'}</span>
            {isLastSpotlight ? (
              <CheckCircle className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
