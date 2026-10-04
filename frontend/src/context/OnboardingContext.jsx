import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  getOnboardingState,
  saveOnboardingState,
  completeOnboarding,
  skipOnboarding,
  resetOnboarding,
  shouldShowOnboarding,
  trackTourEvent,
} from '../utils/onboardingTour';
import { TOUR_STEPS } from '../components/onboarding/onboardingConfig';
import {
  findVisibleTarget,
  calculateSpotlightGeometry,
} from '../components/onboarding/onboardingPositioning';

export const OnboardingContext = createContext(null);

export function OnboardingProvider({ children }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [isMeasuring, setIsMeasuring] = useState(false);

  const previousActiveElementRef = useRef(null);
  const rAFRef = useRef(null);
  const hasAutoStartedRef = useRef(false);

  // Active step definition
  const activeStep = useMemo(() => {
    return TOUR_STEPS[currentStep] || TOUR_STEPS[0];
  }, [currentStep]);

  // Spotlight steps (excluding welcome and finish modals)
  const spotlightSteps = useMemo(() => {
    return TOUR_STEPS.filter((s) => s.type === 'spotlight');
  }, []);

  const totalSpotlightSteps = spotlightSteps.length;

  const currentSpotlightIndex = useMemo(() => {
    if (activeStep.type !== 'spotlight') return 0;
    const idx = spotlightSteps.findIndex((s) => s.id === activeStep.id);
    return idx >= 0 ? idx + 1 : 0;
  }, [activeStep, spotlightSteps]);

  /**
   * Measures the target element and updates spotlight rectangle.
   */
  const measureTarget = useCallback(() => {
    if (!isOpen || activeStep.type !== 'spotlight' || !activeStep.targetSelector) {
      setTargetRect(null);
      return;
    }

    if (rAFRef.current) {
      cancelAnimationFrame(rAFRef.current);
    }

    rAFRef.current = requestAnimationFrame(() => {
      const targetEl = findVisibleTarget(activeStep.targetSelector);

      if (targetEl) {
        // If element is off-screen, gently scroll into view
        const rect = targetEl.getBoundingClientRect();
        if (
          rect.top < 0 ||
          rect.bottom > window.innerHeight ||
          rect.left < 0 ||
          rect.right > window.innerWidth
        ) {
          try {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
          } catch {}
        }

        const geometry = calculateSpotlightGeometry(targetEl);
        setTargetRect(geometry);
      } else {
        // If target is missing, fallback to center overlay
        setTargetRect(null);
      }
      setIsMeasuring(false);
    });
  }, [isOpen, activeStep]);

  /**
   * Starts or resumes the tour.
   */
  const startTour = useCallback(
    ({ reset = false, stepIndex = 0 } = {}) => {
      if (reset) {
        resetOnboarding();
        setCurrentStep(0);
      } else if (typeof stepIndex === 'number') {
        setCurrentStep(stepIndex);
      }

      previousActiveElementRef.current = document.activeElement;
      setIsOpen(true);
      setIsMeasuring(true);
      trackTourEvent('tour_started', { stepIndex });
    },
    [],
  );

  /**
   * Completes the tour, saves persistence, and restores focus.
   */
  const completeTour = useCallback(() => {
    completeOnboarding();
    setIsOpen(false);
    setTargetRect(null);
    trackTourEvent('tour_completed', { completedAt: new Date().toISOString() });

    const prevEl = previousActiveElementRef.current;
    if (prevEl && typeof prevEl.focus === 'function') {
      try {
        prevEl.focus();
      } catch {}
    }
  }, []);

  /**
   * Skips the tour, saves persistence, and restores focus.
   */
  const skipTour = useCallback(() => {
    skipOnboarding();
    setIsOpen(false);
    setTargetRect(null);
    trackTourEvent('tour_skipped', { stepIndex: currentStep });

    const prevEl = previousActiveElementRef.current;
    if (prevEl && typeof prevEl.focus === 'function') {
      try {
        prevEl.focus();
      } catch {}
    }
  }, [currentStep]);

  /**
   * Closes tour overlay without completing (e.g. temporary dismiss).
   */
  const closeTour = useCallback(() => {
    setIsOpen(false);
    setTargetRect(null);

    const prevEl = previousActiveElementRef.current;
    if (prevEl && typeof prevEl.focus === 'function') {
      try {
        prevEl.focus();
      } catch {}
    }
  }, []);

  /**
   * Advances to next step or completes the tour.
   */
  const nextStep = useCallback(() => {
    if (currentStep < TOUR_STEPS.length - 1) {
      const nextIdx = currentStep + 1;
      setCurrentStep(nextIdx);
      saveOnboardingState({ currentStep: nextIdx, lastStepAt: new Date().toISOString() });
      trackTourEvent('tour_step_viewed', { stepId: TOUR_STEPS[nextIdx].id, stepIndex: nextIdx });
    } else {
      completeTour();
    }
  }, [currentStep, completeTour]);

  /**
   * Navigates to previous step.
   */
  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      const prevIdx = currentStep - 1;
      setCurrentStep(prevIdx);
      saveOnboardingState({ currentStep: prevIdx, lastStepAt: new Date().toISOString() });
      trackTourEvent('tour_step_viewed', { stepId: TOUR_STEPS[prevIdx].id, stepIndex: prevIdx });
    }
  }, [currentStep]);

  /**
   * Jumps directly to specified step.
   */
  const goToStep = useCallback((stepIdx) => {
    if (stepIdx >= 0 && stepIdx < TOUR_STEPS.length) {
      setCurrentStep(stepIdx);
      saveOnboardingState({ currentStep: stepIdx, lastStepAt: new Date().toISOString() });
    }
  }, []);

  // Recalculate target geometry when step changes or route transitions
  useEffect(() => {
    if (!isOpen) return;

    // Route-aware step transition
    if (activeStep?.route && location.pathname !== activeStep.route) {
      navigate(activeStep.route);
    }

    measureTarget();

    // Secondary measurement check after DOM settling / animations
    const timer = setTimeout(measureTarget, 150);
    return () => clearTimeout(timer);
  }, [isOpen, currentStep, location.pathname, measureTarget, activeStep?.route, navigate]);

  // Window resize & orientation change handler
  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => {
      measureTarget();
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('scroll', handleResize, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize);
      if (rAFRef.current) cancelAnimationFrame(rAFRef.current);
    };
  }, [isOpen, measureTarget]);

  // First-visit automated invitation for authenticated users
  useEffect(() => {
    if (!user || hasAutoStartedRef.current) return;

    // Small delay ensures layout hydration is completely settled
    const timer = setTimeout(() => {
      if (shouldShowOnboarding(user)) {
        hasAutoStartedRef.current = true;
        const saved = getOnboardingState();
        startTour({ stepIndex: saved.currentStep || 0 });
      }
    }, 750);

    return () => clearTimeout(timer);
  }, [user, startTour]);

  const value = useMemo(
    () => ({
      isOpen,
      currentStep,
      activeStep,
      totalSteps: TOUR_STEPS.length,
      spotlightIndex: currentSpotlightIndex,
      totalSpotlightSteps,
      targetRect,
      isMeasuring,
      startTour,
      nextStep,
      prevStep,
      goToStep,
      skipTour,
      completeTour,
      closeTour,
    }),
    [
      isOpen,
      currentStep,
      activeStep,
      currentSpotlightIndex,
      totalSpotlightSteps,
      targetRect,
      isMeasuring,
      startTour,
      nextStep,
      prevStep,
      goToStep,
      skipTour,
      completeTour,
      closeTour,
    ],
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}
