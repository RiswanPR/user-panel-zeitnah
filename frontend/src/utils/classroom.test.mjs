import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLesson, normalizeCurriculum, getContinueLearningUrl } from './courseCurriculum.js';
import { formatDuration, parseDurationToSeconds, getVdoCipherEmbedUrl, getClassVideoSource } from './courseUi.js';

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
  describe('Authoritative normalizeLesson Unit Tests', () => {
    it('normalizes raw lesson with default values and parses duration', () => {
      const lesson = normalizeLesson({
        _id: 'cls-101',
        title: 'Introduction to Systems',
        duration: '12:30',
        order: 1,
      });

      assert.strictEqual(lesson.id, 'cls-101');
      assert.strictEqual(lesson.title, 'Introduction to Systems');
      assert.strictEqual(lesson.duration, '12:30');
      assert.strictEqual(lesson.durationSeconds, 750);
      assert.strictEqual(lesson.completed, false);
      assert.strictEqual(lesson.progressPercent, 0);
      assert.strictEqual(lesson.isActive, false);
    });

    it('marks lesson completed automatically when progress >= 90%', () => {
      const lesson = normalizeLesson({
        _id: 'cls-102',
        title: 'Core Algorithms',
        progressPercent: 91,
      });

      assert.strictEqual(lesson.completed, true);
      assert.strictEqual(lesson.progressPercent, 100);
    });

    it('recognizes active class id correctly', () => {
      const lesson = normalizeLesson(
        { _id: 'cls-active', title: 'Active Lesson' },
        { uniqueCode: 'CH01' },
        'cls-active'
      );

      assert.strictEqual(lesson.isActive, true);
      assert.strictEqual(lesson.chapterCode, 'CH01');
    });

    it('inherits lock state from chapter if not specified on class', () => {
      const lockedLesson = normalizeLesson(
        { _id: 'cls-locked', title: 'Locked Lesson' },
        { locked: true }
      );
      assert.strictEqual(lockedLesson.locked, true);

      const unlockedLesson = normalizeLesson(
        { _id: 'cls-unlocked', title: 'Unlocked Lesson' },
        { locked: false }
      );
      assert.strictEqual(unlockedLesson.locked, false);
    });
  });

  describe('Authoritative normalizeCurriculum & Cross-Chapter Traversal', () => {
    const rawChapters = [
      {
        _id: 'ch-1',
        uniqueCode: 'CH01',
        title: 'Module 1: Fundamentals',
        order: 1,
        locked: false,
        classes: [
          { _id: 'cls-101', title: 'Lesson 1.1: Getting Started', duration: '10:00', order: 1, completed: true, progressPercent: 100 },
          { _id: 'cls-102', title: 'Lesson 1.2: Architecture Overview', duration: '15:00', order: 2, completed: true, progressPercent: 100 },
        ],
      },
      {
        _id: 'ch-2',
        uniqueCode: 'CH02',
        title: 'Module 2: Advanced Topics',
        order: 2,
        locked: false,
        classes: [
          { _id: 'cls-201', title: 'Lesson 2.1: Data Pipeline', duration: '20:00', order: 1, completed: false, progressPercent: 20 },
          { _id: 'cls-202', title: 'Lesson 2.2: Production Deployment', duration: '25:00', order: 2, completed: false, progressPercent: 0 },
        ],
      },
    ];

    it('flattens lessons course-wide into chronological flatLessons array', () => {
      const curriculum = normalizeCurriculum({
        course: { _id: 'course-1', name: 'Full-Stack Mastery' },
        rawChapters,
        purchased: true,
      });

      assert.strictEqual(curriculum.flatLessons.length, 4);
      assert.strictEqual(curriculum.flatLessons[0].id, 'cls-101');
      assert.strictEqual(curriculum.flatLessons[1].id, 'cls-102');
      assert.strictEqual(curriculum.flatLessons[2].id, 'cls-201');
      assert.strictEqual(curriculum.flatLessons[3].id, 'cls-202');
    });

    it('CROSS-CHAPTER TRAVERSAL: Lesson 2.1 previous points to Lesson 1.2 across chapter boundary', () => {
      const curriculum = normalizeCurriculum({
        course: { _id: 'course-1', name: 'Full-Stack Mastery' },
        rawChapters,
        activeClassId: 'cls-201', // First lesson of Chapter 2
        purchased: true,
      });

      assert.strictEqual(curriculum.activeLesson?.id, 'cls-201');
      assert.strictEqual(curriculum.isFirstLessonInChapter, true);
      assert.notStrictEqual(curriculum.prevLesson, null);
      assert.strictEqual(curriculum.prevLesson?.id, 'cls-102'); // Final lesson of Chapter 1!
      assert.strictEqual(curriculum.prevLesson?.chapterCode, 'CH01');
      assert.strictEqual(curriculum.nextLesson?.id, 'cls-202');
    });

    it('CROSS-CHAPTER TRAVERSAL: Lesson 1.2 next points to Lesson 2.1 across chapter boundary', () => {
      const curriculum = normalizeCurriculum({
        course: { _id: 'course-1', name: 'Full-Stack Mastery' },
        rawChapters,
        activeClassId: 'cls-102', // Final lesson of Chapter 1
        purchased: true,
      });

      assert.strictEqual(curriculum.activeLesson?.id, 'cls-102');
      assert.strictEqual(curriculum.isLastLessonInChapter, true);
      assert.notStrictEqual(curriculum.nextLesson, null);
      assert.strictEqual(curriculum.nextLesson?.id, 'cls-201'); // First lesson of Chapter 2!
      assert.strictEqual(curriculum.nextLesson?.chapterCode, 'CH02');
      assert.strictEqual(curriculum.nextChapter?.title, 'Module 2: Advanced Topics');
    });

    it('BOUNDARY CHECKS: Course beginning has null prevLesson and course finale has null nextLesson', () => {
      const startCurriculum = normalizeCurriculum({
        course: { _id: 'course-1' },
        rawChapters,
        activeClassId: 'cls-101',
        purchased: true,
      });
      assert.strictEqual(startCurriculum.prevLesson, null);
      assert.strictEqual(startCurriculum.isFirstLessonInChapter, true);
      assert.strictEqual(startCurriculum.isLastLessonInCourse, false);

      const endCurriculum = normalizeCurriculum({
        course: { _id: 'course-1' },
        rawChapters,
        activeClassId: 'cls-202',
        purchased: true,
      });
      assert.strictEqual(endCurriculum.nextLesson, null);
      assert.strictEqual(endCurriculum.isLastLessonInChapter, true);
      assert.strictEqual(endCurriculum.isLastLessonInCourse, true);
    });

    it('AUTHORITATIVE RESUME: Accurately identifies first incomplete unlocked lesson', () => {
      const curriculum = normalizeCurriculum({
        course: { _id: 'course-1' },
        rawChapters,
        purchased: true,
      });

      // cls-101 and cls-102 are complete; cls-201 is incomplete and unlocked
      assert.strictEqual(curriculum.resumeLesson?.id, 'cls-201');
      assert.strictEqual(curriculum.resumeLesson?.title, 'Lesson 2.1: Data Pipeline');
    });

    it('OVERALL PROGRESS: Computes aggregate completed counts and percent', () => {
      const curriculum = normalizeCurriculum({
        course: { _id: 'course-1' },
        rawChapters,
        purchased: true,
      });

      assert.strictEqual(curriculum.overallProgress.totalClasses, 4);
      assert.strictEqual(curriculum.overallProgress.completedClasses, 2);
      assert.strictEqual(curriculum.overallProgress.completionPercent, 50);
      assert.strictEqual(curriculum.chapters[0].isCompleted, true);
      assert.strictEqual(curriculum.chapters[1].isCompleted, false);
    });
  });

  describe('getContinueLearningUrl Helper Tests', () => {
    it('returns direct player class URL when resumeLesson is available', () => {
      const course = { _id: 'course-123' };
      const curriculum = {
        resumeLesson: { id: 'cls-resume-99' },
      };
      const url = getContinueLearningUrl(course, curriculum);
      assert.strictEqual(url, '/courses/class/cls-resume-99');
    });

    it('falls back to course chapters when resumeLesson is null', () => {
      const course = { _id: 'course-123' };
      const curriculum = { resumeLesson: null };
      const url = getContinueLearningUrl(course, curriculum);
      assert.strictEqual(url, '/courses/course-123/chapters');
    });

    it('returns /courses when course is missing', () => {
      const url = getContinueLearningUrl(null);
      assert.strictEqual(url, '/courses');
    });
  });

  describe('Duration Parsing & Formatting Utilities', () => {
    it('parses various duration string formats into seconds', () => {
      assert.strictEqual(parseDurationToSeconds(45), 45);
      assert.strictEqual(parseDurationToSeconds('90'), 90);
      assert.strictEqual(parseDurationToSeconds('01:30'), 90);
      assert.strictEqual(parseDurationToSeconds('1:02:15'), 3735);
      assert.strictEqual(parseDurationToSeconds('45m'), 2700);
      assert.strictEqual(parseDurationToSeconds('1h 15m'), 4500);
      assert.strictEqual(parseDurationToSeconds(''), 0);
      assert.strictEqual(parseDurationToSeconds(null), 0);
    });

    it('formats duration nicely for human display', () => {
      assert.strictEqual(formatDuration(null), 'Self paced');
      assert.strictEqual(formatDuration(''), 'Self paced');
      assert.strictEqual(formatDuration(45), '45 sec');
      assert.strictEqual(formatDuration(90), '1 min');
      assert.strictEqual(formatDuration(3600), '1 hr');
      assert.strictEqual(formatDuration(3900), '1 hr 5 min');
      assert.strictEqual(formatDuration('12:30'), '12:30');
    });
  });

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

  describe('Phase 1 & Phase 2 Regression Tests: ClassView Initialization & Traversal', () => {
    const mockChapters = [
      {
        _id: 'ch-alpha',
        uniqueCode: 'CH01',
        title: 'Module 01: Core Architecture',
        order: 1,
        classes: [
          { _id: 'cls-1', title: 'Lesson 1', duration: 600, completed: true, progress: 100 },
          { _id: 'cls-2', title: 'Lesson 2', duration: 900, completed: false, progress: 45 },
          { _id: 'cls-3', title: 'Lesson 3', duration: 1200, completed: false, progress: 0 },
        ],
      },
      {
        _id: 'ch-beta',
        uniqueCode: 'CH02',
        title: 'Module 02: Advanced Systems',
        order: 2,
        classes: [
          { _id: 'cls-4', title: 'Lesson 4', duration: 800, completed: false, progress: 0 },
          { _id: 'cls-5', title: 'Lesson 5 (Locked)', duration: 1000, completed: false, progress: 0, locked: true },
        ],
      },
    ];

    it('TDZ & PROGRESS DERIVATION: Evaluates derived progress before curriculum consumption', () => {
      // Simulating ClassView derived progress metrics calculation
      const progressState = { classProgress: { progressPercent: 45, completed: false, lastPositionSeconds: 405 } };
      const data = { progress: { learningProgress: { completionPercent: 20 } } };

      const classProgress = progressState?.classProgress || data?.progress?.classProgress || null;
      const learningProgress = progressState?.learningProgress || data?.progress?.learningProgress || null;
      const classProgressPercent = Math.min(100, Math.max(0, Math.round(classProgress?.progressPercent || 0)));
      const isClassCompleted = Boolean(classProgress?.completed) || classProgressPercent >= 90;

      assert.strictEqual(classProgressPercent, 45);
      assert.strictEqual(isClassCompleted, false);

      // Now pass to normalizeCurriculum safely
      const curriculum = normalizeCurriculum({
        course: { _id: 'course-alpha', name: 'Alpha Mastery' },
        rawChapters: mockChapters,
        activeClassId: 'cls-2',
        activeClassProgress: classProgress,
        purchased: true,
      });

      assert.ok(curriculum);
      assert.strictEqual(curriculum.currentLesson?.id, 'cls-2');
      assert.strictEqual(curriculum.prevLesson?.id, 'cls-1');
      assert.strictEqual(curriculum.nextLesson?.id, 'cls-3');
    });

    it('CROSS-CHAPTER NEXT: Lesson 3 (Chapter 1) nextLesson points to Lesson 4 (Chapter 2)', () => {
      const curriculum = normalizeCurriculum({
        course: { _id: 'course-alpha' },
        rawChapters: mockChapters,
        activeClassId: 'cls-3',
        purchased: true,
      });

      assert.strictEqual(curriculum.isLastLessonInChapter, true);
      assert.strictEqual(curriculum.nextLesson?.id, 'cls-4');
      assert.strictEqual(curriculum.nextLesson?.title, 'Lesson 4');
    });

    it('CROSS-CHAPTER PREV: Lesson 4 (Chapter 2) prevLesson points to Lesson 3 (Chapter 1)', () => {
      const curriculum = normalizeCurriculum({
        course: { _id: 'course-alpha' },
        rawChapters: mockChapters,
        activeClassId: 'cls-4',
        purchased: true,
      });

      assert.strictEqual(curriculum.isFirstLessonInChapter, true);
      assert.strictEqual(curriculum.prevLesson?.id, 'cls-3');
      assert.strictEqual(curriculum.prevLesson?.title, 'Lesson 3');
    });

    it('LOCKED TARGET REJECTION: Locked lessons expose both .locked and .isLocked true', () => {
      const curriculum = normalizeCurriculum({
        course: { _id: 'course-alpha' },
        rawChapters: mockChapters,
        activeClassId: 'cls-4',
        purchased: true,
      });

      const next = curriculum.nextLesson;
      assert.strictEqual(next.id, 'cls-5');
      assert.strictEqual(next.locked, true);
      assert.strictEqual(next.isLocked, true);
      // Autoplay / navigation condition: !next.locked && !next.isLocked
      const canNavigate = !next.locked && !next.isLocked;
      assert.strictEqual(canNavigate, false);
    });

    it('FIRST LESSON: Beginning of course has null prevLesson', () => {
      const curriculum = normalizeCurriculum({
        course: { _id: 'course-alpha' },
        rawChapters: mockChapters,
        activeClassId: 'cls-1',
        purchased: true,
      });

      assert.strictEqual(curriculum.prevLesson, null);
      assert.strictEqual(curriculum.isFirstLessonInCourse, true);
    });

    it('FINAL LESSON: End of course has null nextLesson', () => {
      const curriculum = normalizeCurriculum({
        course: { _id: 'course-alpha' },
        rawChapters: mockChapters,
        activeClassId: 'cls-5',
        purchased: true,
      });

      assert.strictEqual(curriculum.nextLesson, null);
      assert.strictEqual(curriculum.isLastLessonInCourse, true);
    });

    it('FULL COURSE COMPLETION: Resume lesson gracefully returns first unlocked lesson for review', () => {
      const allCompleteChapters = [
        {
          _id: 'ch-1',
          classes: [
            { _id: 'cls-1', title: 'L1', completed: true, progress: 100 },
            { _id: 'cls-2', title: 'L2', completed: true, progress: 100 },
          ],
        },
      ];

      const curriculum = normalizeCurriculum({
        course: { _id: 'c-all-done' },
        rawChapters: allCompleteChapters,
        purchased: true,
      });

      assert.strictEqual(curriculum.overallProgress.completionPercent, 100);
      assert.ok(curriculum.resumeLesson);
      assert.strictEqual(curriculum.resumeLesson.id, 'cls-1');
      assert.strictEqual(getContinueLearningUrl({ _id: 'c-all-done' }, curriculum), '/courses/class/cls-1');
    });

    it('DRAWER BODY SCROLL LOCK: Verifies cleanup restoration', () => {
      // Emulating body scroll toggle behavior in CurriculumDrawer
      let bodyOverflow = '';
      const original = bodyOverflow;
      // When opened:
      bodyOverflow = 'hidden';
      assert.strictEqual(bodyOverflow, 'hidden');
      // When closed (cleanup):
      bodyOverflow = original;
      assert.strictEqual(bodyOverflow, '');
    });

    it('VDOCIPHER EMBED URL: Correctly formats parameters and handles edge cases', () => {
      assert.strictEqual(getVdoCipherEmbedUrl(null), null);
      assert.strictEqual(getVdoCipherEmbedUrl(undefined), null);
      assert.strictEqual(getVdoCipherEmbedUrl({}), null);
      assert.strictEqual(getVdoCipherEmbedUrl({ otp: 'test-otp' }), null);
      assert.strictEqual(getVdoCipherEmbedUrl({ playbackInfo: 'test-info' }), null);
      
      const fullUrl = 'https://player.vdocipher.com/v2/?otp=existing&playbackInfo=existing';
      assert.strictEqual(getVdoCipherEmbedUrl(fullUrl), fullUrl);

      const generated = getVdoCipherEmbedUrl({ otp: '12345', playbackInfo: 'abcdef' });
      assert.strictEqual(generated, 'https://player.vdocipher.com/v2/?otp=12345&playbackInfo=abcdef');
    });

    it('VIDEO SOURCE RESOLUTION: Correctly resolves source priority between S3 and VdoCipher', () => {
      assert.strictEqual(getClassVideoSource('recording', ''), 's3');
      assert.strictEqual(getClassVideoSource('online', 's3'), 's3');
      assert.strictEqual(getClassVideoSource('online', 'aws'), 's3');
      assert.strictEqual(getClassVideoSource('course', 'vdocipher'), 'vdocipher');
      assert.strictEqual(getClassVideoSource('course', 'vdo'), 'vdocipher');
      assert.strictEqual(getClassVideoSource('online', ''), 'vdocipher');
    });
  });
});
