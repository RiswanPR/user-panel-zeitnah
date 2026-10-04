import { motion } from 'framer-motion';
import { Sparkles, X, ArrowRight } from 'lucide-react';
import { useOnboarding } from '../../context/OnboardingContext';

export default function WelcomeModal() {
  const { nextStep, skipTour, activeStep } = useOnboarding();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-welcome-title"
      aria-describedby="onboarding-welcome-desc"
      className="relative w-full max-w-lg mx-4 rounded-2xl overflow-hidden shadow-2xl z-50 text-white"
      style={{
        background: 'rgba(11, 17, 30, 0.98)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow:
          '0 24px 72px rgba(0, 0, 0, 0.65), 0 0 40px rgba(159, 213, 178, 0.12)',
        backdropFilter: 'blur(28px)',
      }}
    >
      {/* Top accent hairline */}
      <div
        className="absolute top-0 inset-x-0 h-[2px]"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(159,213,178,0.7) 50%, transparent 100%)',
        }}
      />

      {/* Dismiss button */}
      <button
        type="button"
        onClick={skipTour}
        aria-label="Close welcome introduction"
        className="absolute top-4 right-4 p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint/50 cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="p-6 sm:p-8">
        {/* Brand Monogram & Section Pill */}
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
            style={{
              background:
                'linear-gradient(135deg, rgba(159,213,178,0.2) 0%, rgba(18,49,76,0.8) 100%)',
              border: '1px solid rgba(159, 213, 178, 0.3)',
            }}
          >
            <Sparkles className="w-5 h-5 text-brand-mint" />
          </div>
          <div>
            <span
              className="font-mono text-[10px] uppercase font-bold tracking-[0.16em] text-brand-mint/90 block"
            >
              {activeStep.tagline || 'See the unseen'}
            </span>
            <span className="font-mono text-[9px] uppercase tracking-wider text-white/40">
              {activeStep.subtext || 'Build. Connect. Discover.'}
            </span>
          </div>
        </div>

        {/* Title & Description */}
        <h2
          id="onboarding-welcome-title"
          className="text-2xl sm:text-3xl font-heading font-bold text-white tracking-tight mb-2.5"
        >
          {activeStep.title || 'Welcome to Zeitnah'}
        </h2>

        <p
          id="onboarding-welcome-desc"
          className="text-sm sm:text-base text-text-secondary leading-relaxed mb-6"
        >
          {activeStep.description ||
            'Zeitnah brings your community, network, learning and opportunities together in one place.'}
        </p>

        {/* Feature summary pills */}
        <div className="grid grid-cols-2 gap-2 mb-7">
          {[
            { label: 'Technical Courses', desc: 'Interactive syllabi & practice' },
            { label: 'Community Feed', desc: 'Discussions, posts & media' },
            { label: 'Verified Network', desc: 'Peer connections & spaces' },
            { label: 'Career Hub', desc: 'Opportunities & business' },
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02]"
            >
              <p className="text-xs font-semibold text-white/90">{item.label}</p>
              <p className="text-[10.5px] text-white/40 mt-0.5">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-white/[0.08]">
          <button
            type="button"
            onClick={skipTour}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-medium text-white/50 hover:text-white hover:bg-white/[0.04] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint/50 cursor-pointer order-2 sm:order-1"
          >
            {activeStep.secondaryCta || 'Explore on my own'}
          </button>

          <button
            type="button"
            onClick={nextStep}
            autoFocus
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold text-black bg-brand-mint hover:bg-brand-mint/90 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint/50 cursor-pointer order-1 sm:order-2"
          >
            <span>{activeStep.primaryCta || 'Take the quick tour'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
