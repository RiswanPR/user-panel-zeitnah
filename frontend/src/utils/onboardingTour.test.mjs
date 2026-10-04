import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ONBOARDING_VERSION,
  ONBOARDING_STORAGE_KEY,
  DEFAULT_ONBOARDING_STATE,
  getOnboardingState,
  saveOnboardingState,
  completeOnboarding,
  skipOnboarding,
  resetOnboarding,
  shouldShowOnboarding,
  trackTourEvent,
} from './onboardingTour.js';
import {
  calculateTooltipPlacement,
  calculateSpotlightGeometry,
} from '../components/onboarding/onboardingPositioning.js';
import {
  TOUR_STEPS,
  SPOTLIGHT_STEPS,
  TOTAL_SPOTLIGHT_STEPS,
  getTourStepById,
} from '../components/onboarding/onboardingConfig.js';

// In-memory mock storage adhering to Storage interface
function createMockStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
    removeItem(key) {
      map.delete(key);
    },
    clear() {
      map.clear();
    },
  };
}

describe('Zeitnah Onboarding Tour — Storage & State Engine', () => {
  it('defines valid initial default state', () => {
    assert.equal(DEFAULT_ONBOARDING_STATE.version, 1);
    assert.equal(DEFAULT_ONBOARDING_STATE.completed, false);
    assert.equal(DEFAULT_ONBOARDING_STATE.skipped, false);
    assert.equal(DEFAULT_ONBOARDING_STATE.currentStep, 0);
    assert.equal(DEFAULT_ONBOARDING_STATE.completedAt, null);
  });

  it('returns default state when storage is empty', () => {
    const store = createMockStorage();
    const state = getOnboardingState(store);
    assert.deepEqual(state, { ...DEFAULT_ONBOARDING_STATE });
  });

  it('safely recovers default state on corrupt JSON', () => {
    const store = createMockStorage({ [ONBOARDING_STORAGE_KEY]: 'NOT_JSON{bad:data}' });
    const state = getOnboardingState(store);
    assert.deepEqual(state, { ...DEFAULT_ONBOARDING_STATE });
  });

  it('migrates older version data safely to new version', () => {
    const store = createMockStorage({
      [ONBOARDING_STORAGE_KEY]: JSON.stringify({ version: 0, completed: true }),
    });
    const state = getOnboardingState(store);
    assert.equal(state.version, ONBOARDING_VERSION);
    assert.equal(state.completed, false); // version change resets clean
  });

  it('reads valid persisted state', () => {
    const validData = {
      version: 1,
      completed: true,
      skipped: false,
      currentStep: 7,
      completedAt: '2026-10-04T12:00:00.000Z',
      lastStepAt: '2026-10-04T12:00:00.000Z',
    };
    const store = createMockStorage({
      [ONBOARDING_STORAGE_KEY]: JSON.stringify(validData),
    });
    const state = getOnboardingState(store);
    assert.deepEqual(state, validData);
  });

  it('saves state updates correctly', () => {
    const store = createMockStorage();
    const updated = saveOnboardingState({ currentStep: 3 }, store);
    assert.equal(updated.currentStep, 3);
    assert.equal(updated.version, ONBOARDING_VERSION);

    const saved = getOnboardingState(store);
    assert.equal(saved.currentStep, 3);
  });

  it('marks tour as completed with timestamp', () => {
    const store = createMockStorage();
    const res = completeOnboarding(store);
    assert.equal(res.completed, true);
    assert.equal(res.skipped, false);
    assert.ok(res.completedAt);

    const state = getOnboardingState(store);
    assert.equal(state.completed, true);
    assert.equal(state.skipped, false);
  });

  it('marks tour as skipped with timestamp', () => {
    const store = createMockStorage();
    const res = skipOnboarding(store);
    assert.equal(res.completed, false);
    assert.equal(res.skipped, true);
    assert.ok(res.completedAt);

    const state = getOnboardingState(store);
    assert.equal(state.completed, false);
    assert.equal(state.skipped, true);
  });

  it('resets tour state cleanly for replay', () => {
    const store = createMockStorage();
    completeOnboarding(store);
    assert.equal(getOnboardingState(store).completed, true);

    const res = resetOnboarding(store);
    assert.equal(res.completed, false);
    assert.equal(res.skipped, false);
    assert.equal(res.currentStep, 0);
    assert.equal(res.completedAt, null);
  });

  it('evaluates first-visit automatic launch correctly', () => {
    const store = createMockStorage();

    // Anonymous visitors: never auto-trigger
    assert.equal(shouldShowOnboarding(null, store), false);
    assert.equal(shouldShowOnboarding(undefined, store), false);
    assert.equal(shouldShowOnboarding({}, store), false);
    assert.equal(shouldShowOnboarding({ role: 'student' }, store), false);

    // Authenticated new user: should trigger
    const authUser = { id: 'user_123', email: 'alex@example.com' };
    assert.equal(shouldShowOnboarding(authUser, store), true);

    // User with _id: should trigger
    const authUserMongo = { _id: '64a1b2c3d4e5f6', name: 'Sam' };
    assert.equal(shouldShowOnboarding(authUserMongo, store), true);

    // After completion: should not trigger
    completeOnboarding(store);
    assert.equal(shouldShowOnboarding(authUser, store), false);

    // After skipping: should not trigger
    const store2 = createMockStorage();
    skipOnboarding(store2);
    assert.equal(shouldShowOnboarding(authUser, store2), false);
  });

  it('safely handles trackTourEvent without throwing', () => {
    assert.doesNotThrow(() => {
      trackTourEvent('tour_started', { stepIndex: 0 });
    });
  });
});

describe('Zeitnah Onboarding Tour — Smart Positioning Engine', () => {
  it('centers tooltip when targetRect is null (welcome/finish modals)', () => {
    const placement = calculateTooltipPlacement({
      targetRect: null,
      tooltipWidth: 360,
      tooltipHeight: 200,
      viewportWidth: 1000,
      viewportHeight: 800,
      viewportPadding: 20,
    });

    assert.equal(placement.placement, 'center');
    assert.equal(placement.left, (1000 - 360) / 2);
    assert.equal(placement.top, (800 - 200) / 2);
  });

  it('positions below target when ample space exists below', () => {
    const targetRect = {
      top: 50,
      left: 200,
      bottom: 90,
      right: 300,
      width: 100,
      height: 40,
    };

    const placement = calculateTooltipPlacement({
      targetRect,
      tooltipWidth: 320,
      tooltipHeight: 180,
      preferredPlacement: 'bottom',
      viewportWidth: 1200,
      viewportHeight: 800,
      viewportPadding: 16,
      margin: 12,
    });

    assert.equal(placement.placement, 'bottom');
    assert.equal(placement.top, 90 + 12); // bottom + margin
    assert.ok(placement.left >= 16);
  });

  it('flips to top when target is at bottom of viewport (e.g. mobile bottom nav)', () => {
    const targetRect = {
      top: 720,
      left: 100,
      bottom: 770,
      right: 180,
      width: 80,
      height: 50,
    };

    const placement = calculateTooltipPlacement({
      targetRect,
      tooltipWidth: 300,
      tooltipHeight: 160,
      preferredPlacement: 'bottom',
      viewportWidth: 400,
      viewportHeight: 800,
      viewportPadding: 16,
      margin: 10,
    });

    assert.equal(placement.placement, 'top');
    assert.equal(placement.top, 720 - 160 - 10); // top - tooltipHeight - margin
  });

  it('clamps coordinates inside viewport boundaries', () => {
    const targetRect = {
      top: 10,
      left: 10,
      bottom: 40,
      right: 60,
      width: 50,
      height: 30,
    };

    const placement = calculateTooltipPlacement({
      targetRect,
      tooltipWidth: 360,
      tooltipHeight: 200,
      preferredPlacement: 'bottom',
      viewportWidth: 380,
      viewportHeight: 600,
      viewportPadding: 16,
      margin: 10,
    });

    // Horizontal left must be constrained >= viewportPadding
    assert.ok(placement.left >= 16);
    // Right boundary cannot overflow
    assert.ok(placement.left + 360 <= 380);
    // Top boundary cannot overflow
    assert.ok(placement.top >= 16);
  });

  it('positions left and right correctly when preferred and space is available', () => {
    const targetRect = {
      top: 200,
      left: 500,
      bottom: 250,
      right: 600,
      width: 100,
      height: 50,
    };

    const rightPlacement = calculateTooltipPlacement({
      targetRect,
      tooltipWidth: 300,
      tooltipHeight: 180,
      preferredPlacement: 'right',
      viewportWidth: 1200,
      viewportHeight: 800,
      viewportPadding: 16,
      margin: 12,
    });
    assert.equal(rightPlacement.placement, 'right');
    assert.equal(rightPlacement.left, 600 + 12);

    const leftPlacement = calculateTooltipPlacement({
      targetRect,
      tooltipWidth: 300,
      tooltipHeight: 180,
      preferredPlacement: 'left',
      viewportWidth: 1200,
      viewportHeight: 800,
      viewportPadding: 16,
      margin: 12,
    });
    assert.equal(leftPlacement.placement, 'left');
    assert.equal(leftPlacement.left, 500 - 300 - 12);
  });

  it('safely handles null target in calculateSpotlightGeometry', () => {
    assert.equal(calculateSpotlightGeometry(null), null);
    assert.equal(calculateSpotlightGeometry(undefined), null);
  });
});

describe('Zeitnah Onboarding Tour — Configuration & Step Registry', () => {
  it('contains expected step sequence starting with welcome and ending with finish', () => {
    assert.equal(TOUR_STEPS[0].id, 'welcome');
    assert.equal(TOUR_STEPS[0].type, 'modal');

    const lastStep = TOUR_STEPS[TOUR_STEPS.length - 1];
    assert.equal(lastStep.id, 'finish');
    assert.equal(lastStep.type, 'modal');
  });

  it('provides exactly 6 targeted spotlight steps matching the platform pillars', () => {
    assert.equal(TOTAL_SPOTLIGHT_STEPS, 6);
    assert.equal(SPOTLIGHT_STEPS.length, 6);

    const stepIds = SPOTLIGHT_STEPS.map((s) => s.id);
    assert.deepEqual(stepIds, [
      'learning',
      'community',
      'network',
      'opportunities',
      'connected',
      'profile',
    ]);
  });

  it('ensures each spotlight step contains required metadata and targets', () => {
    for (const step of SPOTLIGHT_STEPS) {
      assert.ok(step.title, `Step ${step.id} missing title`);
      assert.ok(step.description, `Step ${step.id} missing description`);
      assert.ok(step.targetSelector, `Step ${step.id} missing targetSelector`);
      assert.ok(step.targetSelector.startsWith('[data-tour='), `Invalid selector for ${step.id}`);
      assert.ok(Array.isArray(step.highlights), `Step ${step.id} missing highlights array`);
      assert.ok(step.highlights.length >= 2, `Step ${step.id} should have at least 2 highlights`);
    }
  });

  it('retrieves steps by id correctly', () => {
    const communityStep = getTourStepById('community');
    assert.ok(communityStep);
    assert.equal(communityStep.title, 'Discover Community');

    const nonExistent = getTourStepById('unknown_xyz');
    assert.equal(nonExistent, undefined);
  });
});
