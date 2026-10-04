import { useEffect, useMemo, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useOnboarding } from '../../context/OnboardingContext';
import { calculateTooltipPlacement } from './onboardingPositioning';
import WelcomeModal from './WelcomeModal';
import FinishModal from './FinishModal';
import OnboardingCard from './OnboardingCard';

export default function OnboardingOverlay() {
  const {
    isOpen,
    activeStep,
    targetRect,
    nextStep,
    prevStep,
    skipTour,
  } = useOnboarding();

  const shouldReduceMotion = useReducedMotion();
  const overlayRef = useRef(null);

  // Keyboard navigation & accessibility controls
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      // Escape to dismiss / skip
      if (e.key === 'Escape') {
        e.preventDefault();
        skipTour();
        return;
      }

      // ArrowRight to advance (if not in modal)
      if (e.key === 'ArrowRight' && activeStep.type === 'spotlight') {
        e.preventDefault();
        nextStep();
        return;
      }

      // ArrowLeft to go back (if not in modal)
      if (e.key === 'ArrowLeft' && activeStep.type === 'spotlight') {
        e.preventDefault();
        prevStep();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeStep, nextStep, prevStep, skipTour]);

  // Compute smart tooltip placement
  const placementData = useMemo(() => {
    if (!isOpen) return null;

    const width = typeof window !== 'undefined' && window.innerWidth < 420
      ? window.innerWidth - 32
      : 360;

    return calculateTooltipPlacement({
      targetRect,
      tooltipWidth: width,
      tooltipHeight: 260,
      preferredPlacement: activeStep.preferredPlacement || 'bottom',
      viewportPadding: 16,
      margin: 14,
    });
  }, [isOpen, targetRect, activeStep]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        ref={overlayRef}
        className="fixed inset-0 select-none"
        style={{ zIndex: 9999 }}
        aria-live="polite"
      >
        {/* Modal steps (Welcome & Finish) */}
        {activeStep.type === 'modal' && (
          <div
            className="fixed inset-0 flex items-center justify-center p-4"
            style={{
              background: 'rgba(5, 9, 18, 0.82)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          >
            {activeStep.id === 'welcome' && <WelcomeModal />}
            {activeStep.id === 'finish' && <FinishModal />}
          </div>
        )}

        {/* Targeted spotlight steps */}
        {activeStep.type === 'spotlight' && (
          <>
            {/* If target exists, render the GPU-efficient box-shadow cutout spotlight */}
            {targetRect ? (
              <motion.div
                initial={false}
                animate={{
                  top: targetRect.top,
                  left: targetRect.left,
                  width: targetRect.width,
                  height: targetRect.height,
                  borderRadius: targetRect.borderRadius,
                }}
                transition={
                  shouldReduceMotion
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 400, damping: 32 }
                }
                style={{
                  position: 'fixed',
                  pointerEvents: 'none',
                  boxShadow:
                    '0 0 0 9999px rgba(5, 9, 18, 0.78), 0 0 24px rgba(159, 213, 178, 0.22)',
                  border: '1.5px solid rgba(159, 213, 178, 0.65)',
                  zIndex: 10000,
                }}
              />
            ) : (
              /* Fallback backdrop if target is temporarily unmounted or resolving */
              <div
                className="fixed inset-0"
                style={{
                  background: 'rgba(5, 9, 18, 0.78)',
                  backdropFilter: 'blur(4px)',
                }}
              />
            )}

            {/* Tour Step Card */}
            {placementData && <OnboardingCard placementData={placementData} />}
          </>
        )}
      </div>
    </AnimatePresence>
  );
}
