/**
 * ZEITNAH ONBOARDING TOUR ENGINE — STORAGE & STATE ABSTRACTION
 *
 * Provides resilient, versioned client-side persistence for the interactive tour.
 * Ensures zero-lag execution, corruption recovery, and predictable first-visit detection.
 */

export const ONBOARDING_VERSION = 1;
export const ONBOARDING_STORAGE_KEY = 'zeitnah_onboarding_v1';

export const DEFAULT_ONBOARDING_STATE = Object.freeze({
  version: ONBOARDING_VERSION,
  completed: false,
  skipped: false,
  currentStep: 0,
  completedAt: null,
  lastStepAt: null,
});

/**
 * Safely reads the onboarding state from storage.
 * If data is corrupt or missing, recovers gracefully with DEFAULT_ONBOARDING_STATE.
 */
export function getOnboardingState(customStorage = null) {
  const store = customStorage || (typeof window !== 'undefined' ? window.localStorage : null);
  if (!store) return { ...DEFAULT_ONBOARDING_STATE };

  try {
    const raw = store.getItem(ONBOARDING_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_ONBOARDING_STATE };

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return { ...DEFAULT_ONBOARDING_STATE };
    }

    // Version migration: if version differs, return clean state with new version
    if (parsed.version !== ONBOARDING_VERSION) {
      return {
        ...DEFAULT_ONBOARDING_STATE,
        version: ONBOARDING_VERSION,
      };
    }

    return {
      version: ONBOARDING_VERSION,
      completed: Boolean(parsed.completed),
      skipped: Boolean(parsed.skipped),
      currentStep: typeof parsed.currentStep === 'number' ? parsed.currentStep : 0,
      completedAt: parsed.completedAt || null,
      lastStepAt: parsed.lastStepAt || null,
    };
  } catch {
    return { ...DEFAULT_ONBOARDING_STATE };
  }
}

/**
 * Safely persists updated onboarding state to storage.
 */
export function saveOnboardingState(patch, customStorage = null) {
  const store = customStorage || (typeof window !== 'undefined' ? window.localStorage : null);
  if (!store) return;

  try {
    const current = getOnboardingState(store);
    const updated = {
      ...current,
      ...patch,
      version: ONBOARDING_VERSION,
    };
    store.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    // Fail silently without disrupting UI
    return null;
  }
}

/**
 * Marks the tour as completed.
 */
export function completeOnboarding(customStorage = null) {
  return saveOnboardingState(
    {
      completed: true,
      skipped: false,
      completedAt: new Date().toISOString(),
    },
    customStorage,
  );
}

/**
 * Marks the tour as skipped.
 */
export function skipOnboarding(customStorage = null) {
  return saveOnboardingState(
    {
      completed: false,
      skipped: true,
      completedAt: new Date().toISOString(),
    },
    customStorage,
  );
}

/**
 * Resets the tour state so it can be replayed.
 */
export function resetOnboarding(customStorage = null) {
  return saveOnboardingState(
    {
      completed: false,
      skipped: false,
      currentStep: 0,
      completedAt: null,
      lastStepAt: null,
    },
    customStorage,
  );
}

/**
 * Evaluates whether the onboarding tour should launch automatically.
 *
 * Rules:
 * 1. User must be authenticated (we do not disrupt public/anonymous visitors on marketing/login pages).
 * 2. Tour must not have been completed or skipped previously.
 */
export function shouldShowOnboarding(user, customStorage = null) {
  if (!user || (!user.id && !user.userId && !user._id)) {
    return false;
  }

  const state = getOnboardingState(customStorage);
  if (state.completed || state.skipped) {
    return false;
  }

  return true;
}

/**
 * Dispatches lightweight tour analytics / integration events without external dependencies.
 */
export function trackTourEvent(eventName, payload = {}) {
  if (typeof window === 'undefined') return;

  try {
    const event = new CustomEvent('zeitnah:tour:event', {
      detail: {
        event: eventName,
        payload,
        timestamp: Date.now(),
      },
    });
    window.dispatchEvent(event);
  } catch {}
}
