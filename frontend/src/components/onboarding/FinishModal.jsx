import { motion } from 'framer-motion';
import { CheckCircle2, ArrowRight, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '../../context/OnboardingContext';
import { useAuth } from '../../hooks/useAuth';

export default function FinishModal() {
  const { completeTour, activeStep } = useOnboarding();
  const { user } = useAuth();
  const navigate = useNavigate();

  const isProfileIncomplete = !user?.bio || !user?.avatar || !user?.headline;

  const handleCompleteProfile = () => {
    completeTour();
    navigate('/profile/edit');
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-finish-title"
      aria-describedby="onboarding-finish-desc"
      className="relative w-full max-w-md mx-4 rounded-2xl overflow-hidden shadow-2xl z-50 text-white text-center"
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

      <div className="p-6 sm:p-8">
        {/* Success Icon */}
        <div
          className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg"
          style={{
            background:
              'linear-gradient(135deg, rgba(159,213,178,0.2) 0%, rgba(18,49,76,0.9) 100%)',
            border: '1px solid rgba(159, 213, 178, 0.4)',
          }}
        >
          <CheckCircle2 className="w-6 h-6 text-brand-mint" />
        </div>

        <span className="font-mono text-[9.5px] uppercase font-bold tracking-[0.2em] text-brand-mint/90 block mb-1">
          {activeStep.sectionBadge || 'COMPLETED'}
        </span>

        <h2
          id="onboarding-finish-title"
          className="text-2xl sm:text-3xl font-heading font-bold text-white tracking-tight mb-2"
        >
          {activeStep.title || "You're ready."}
        </h2>

        <p
          id="onboarding-finish-desc"
          className="text-sm text-text-secondary leading-relaxed mb-6 max-w-sm mx-auto"
        >
          {activeStep.description ||
            'Build your profile. Connect with people. Discover opportunities. Keep learning.'}
        </p>

        {/* Action buttons */}
        <div className="flex flex-col gap-2.5 pt-2">
          <button
            type="button"
            onClick={completeTour}
            autoFocus
            className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-black bg-brand-mint hover:bg-brand-mint/90 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint/50 cursor-pointer"
          >
            <span>{activeStep.primaryCta || 'Start exploring'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {isProfileIncomplete && (
            <button
              type="button"
              onClick={handleCompleteProfile}
              className="w-full py-2 px-4 rounded-xl text-xs font-medium text-white/60 hover:text-white hover:bg-white/[0.04] transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint/50 cursor-pointer"
            >
              <User className="w-3.5 h-3.5 text-brand-mint/80" />
              <span>Complete my profile</span>
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
