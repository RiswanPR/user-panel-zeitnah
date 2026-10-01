import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Pure helper functions mirroring the LMS logic for comprehensive unit testing
 */
export function calculateLessonCompletion({ existingCompleted, payloadCompleted, percent }) {
  return Boolean(existingCompleted) || Boolean(payloadCompleted) || percent >= 90;
}

export function resolveNextStep({
  currentClassIdx,
  chapterClasses,
  currentChapterIdx,
  courseChapters,
}) {
  const isLastLessonInChapter =
    currentClassIdx >= 0 && currentClassIdx === chapterClasses.length - 1;
  const nextLesson =
    currentClassIdx >= 0 && currentClassIdx < chapterClasses.length - 1
      ? chapterClasses[currentClassIdx + 1]
      : null;
  const nextChapter =
    isLastLessonInChapter &&
    currentChapterIdx >= 0 &&
    currentChapterIdx < courseChapters.length - 1
      ? courseChapters[currentChapterIdx + 1]
      : null;

  return {
    nextLesson,
    isLastLessonInChapter,
    nextChapter,
    isEndOfCourse: isLastLessonInChapter && (!nextChapter || currentChapterIdx === courseChapters.length - 1),
  };
}

export function shouldThrottleSave({ now, lastSaveTime, isEnding, saveInFlight, lastCurrentTime, currentTime }) {
  if (saveInFlight) return true;
  if (isEnding && lastCurrentTime === currentTime) return true;
  const delta = now - lastSaveTime;
  if (delta < 15000 && !isEnding) return true;
  return false;
}

export function getProgressbarSemantics(percent) {
  const clamped = Math.min(100, Math.max(0, Math.round(percent || 0)));
  return {
    role: 'progressbar',
    'aria-valuenow': clamped,
    'aria-valuemin': 0,
    'aria-valuemax': 100,
  };
}

export function getResponsiveLayoutRules(width) {
  return {
    isMobile: width < 768,
    isTablet: width >= 768 && width < 1280,
    isDesktop: width >= 1280,
    useCurriculumDrawer: width < 1280,
    usePersistentCurriculum: width >= 1280,
    mobileHeaderCompact: width <= 430,
    stackedNavigation: width <= 375,
  };
}

describe('ZEITNAH LMS — Premium Learning Workspace Unit Tests', () => {
  describe('Completion Logic Preservation', () => {
    it('marks completed if existing.completed is true', () => {
      const res = calculateLessonCompletion({
        existingCompleted: true,
        payloadCompleted: false,
        percent: 45,
      });
      assert.strictEqual(res, true);
    });

    it('marks completed if payload.completed is true regardless of percent', () => {
      const res = calculateLessonCompletion({
        existingCompleted: false,
        payloadCompleted: true,
        percent: 60,
      });
      assert.strictEqual(res, true);
    });

    it('marks completed if calculated percent is >= 90', () => {
      const res = calculateLessonCompletion({
        existingCompleted: false,
        payloadCompleted: false,
        percent: 90,
      });
      assert.strictEqual(res, true);

      const res95 = calculateLessonCompletion({
        existingCompleted: false,
        payloadCompleted: false,
        percent: 95,
      });
      assert.strictEqual(res95, true);
    });

    it('remains incomplete if percent is under 90 and not explicitly completed', () => {
      const res = calculateLessonCompletion({
        existingCompleted: false,
        payloadCompleted: false,
        percent: 89,
      });
      assert.strictEqual(res, false);
    });
  });

  describe('Course-wide Navigation & Chapter Boundary Resolution', () => {
    const mockChapters = [
      {
        uniqueCode: 'CH01',
        title: 'Foundations',
        classes: [
          { _id: 'cls-1', title: 'Intro', completed: true },
          { _id: 'cls-2', title: 'Setup', completed: false },
        ],
      },
      {
        uniqueCode: 'CH02',
        title: 'Advanced Systems',
        classes: [
          { _id: 'cls-3', title: 'Architecture', completed: false },
          { _id: 'cls-4', title: 'Optimization', completed: false },
        ],
      },
    ];

    it('navigates to next lesson within chapter when available', () => {
      const currentClasses = mockChapters[0].classes;
      const step = resolveNextStep({
        currentClassIdx: 0,
        chapterClasses: currentClasses,
        currentChapterIdx: 0,
        courseChapters: mockChapters,
      });

      assert.strictEqual(step.isLastLessonInChapter, false);
      assert.strictEqual(step.nextLesson?._id, 'cls-2');
      assert.strictEqual(step.nextChapter, null);
      assert.strictEqual(step.isEndOfCourse, false);
    });

    it('resolves chapter boundary without dead-end at final lesson of Chapter 1', () => {
      const currentClasses = mockChapters[0].classes;
      const step = resolveNextStep({
        currentClassIdx: 1, // last lesson of Ch1
        chapterClasses: currentClasses,
        currentChapterIdx: 0,
        courseChapters: mockChapters,
      });

      assert.strictEqual(step.isLastLessonInChapter, true);
      assert.strictEqual(step.nextLesson, null);
      assert.notStrictEqual(step.nextChapter, null);
      assert.strictEqual(step.nextChapter?.title, 'Advanced Systems');
      assert.strictEqual(step.isEndOfCourse, false);
    });

    it('detects genuine course finale at final lesson of final chapter', () => {
      const ch2Classes = mockChapters[1].classes;
      const step = resolveNextStep({
        currentClassIdx: 1, // last lesson of Ch2
        chapterClasses: ch2Classes,
        currentChapterIdx: 1,
        courseChapters: mockChapters,
      });

      assert.strictEqual(step.isLastLessonInChapter, true);
      assert.strictEqual(step.nextLesson, null);
      assert.strictEqual(step.nextChapter, null);
      assert.strictEqual(step.isEndOfCourse, true);
    });
  });

  describe('VR-003 & PERF-001: Video Throttling and Double-Save Race Prevention', () => {
    it('throttles rapid progress updates within 15 second interval', () => {
      const now = 20000;
      const lastSaveTime = 10000; // 10s ago (< 15s)
      const throttled = shouldThrottleSave({
        now,
        lastSaveTime,
        isEnding: false,
        saveInFlight: false,
        lastCurrentTime: 20,
        currentTime: 21,
      });
      assert.strictEqual(throttled, true);
    });

    it('allows save when >= 15 seconds have passed', () => {
      const now = 30000;
      const lastSaveTime = 10000; // 20s ago (> 15s)
      const throttled = shouldThrottleSave({
        now,
        lastSaveTime,
        isEnding: false,
        saveInFlight: false,
        lastCurrentTime: 10,
        currentTime: 30,
      });
      assert.strictEqual(throttled, false);
    });

    it('bypasses 15s throttle when video reaches ending state', () => {
      const now = 12000;
      const lastSaveTime = 10000; // only 2s ago
      const throttled = shouldThrottleSave({
        now,
        lastSaveTime,
        isEnding: true,
        saveInFlight: false,
        lastCurrentTime: 10,
        currentTime: 58,
      });
      assert.strictEqual(throttled, false);
    });

    it('guards against double-save race when already saved at ending position', () => {
      const now = 12000;
      const lastSaveTime = 10000;
      const throttled = shouldThrottleSave({
        now,
        lastSaveTime,
        isEnding: true,
        saveInFlight: false,
        lastCurrentTime: 58, // already saved at this currentTime!
        currentTime: 58,
      });
      assert.strictEqual(throttled, true);
    });

    it('blocks save when another save is in flight', () => {
      const throttled = shouldThrottleSave({
        now: 100000,
        lastSaveTime: 0,
        isEnding: true,
        saveInFlight: true,
        lastCurrentTime: 0,
        currentTime: 100,
      });
      assert.strictEqual(throttled, true);
    });
  });

  describe('A11Y-001: Accessibility Progressbar Semantics', () => {
    it('generates compliant ARIA attributes with value clamping', () => {
      const normal = getProgressbarSemantics(65.4);
      assert.strictEqual(normal.role, 'progressbar');
      assert.strictEqual(normal['aria-valuenow'], 65);
      assert.strictEqual(normal['aria-valuemin'], 0);
      assert.strictEqual(normal['aria-valuemax'], 100);

      const over100 = getProgressbarSemantics(105);
      assert.strictEqual(over100['aria-valuenow'], 100);

      const negative = getProgressbarSemantics(-10);
      assert.strictEqual(negative['aria-valuenow'], 0);
    });
  });

  describe('Mobile Viewport & Breakpoint Testing (320px - 430px)', () => {
    const viewports = [320, 360, 375, 390, 412, 430];

    viewports.forEach((w) => {
      it(`evaluates mobile ergonomics correctly on ${w}px viewport`, () => {
        const layout = getResponsiveLayoutRules(w);
        assert.strictEqual(layout.isMobile, true);
        assert.strictEqual(layout.useCurriculumDrawer, true);
        assert.strictEqual(layout.usePersistentCurriculum, false);
        assert.strictEqual(layout.mobileHeaderCompact, true);
      });
    });

    it('evaluates tablet hybrid model (768px - 1023px)', () => {
      const layout = getResponsiveLayoutRules(768);
      assert.strictEqual(layout.isTablet, true);
      assert.strictEqual(layout.useCurriculumDrawer, true);
      assert.strictEqual(layout.usePersistentCurriculum, false);
    });

    it('evaluates desktop persistent curriculum model (1280px+)', () => {
      const layout = getResponsiveLayoutRules(1440);
      assert.strictEqual(layout.isDesktop, true);
      assert.strictEqual(layout.usePersistentCurriculum, true);
    });
  });
});
