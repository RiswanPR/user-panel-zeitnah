/**
 * Authoritative Curriculum Normalization Layer for Zeitnah LMS
 *
 * Provides a single source of truth for:
 * - Course metadata and overall progress
 * - Chapters with progress, completion, and lock states
 * - Lessons within chapters with normalized completion, progress, and active status
 * - flatLessons: chronological course-wide lesson list for O(1) cross-chapter traversal
 * - prevLesson / nextLesson cross-chapter boundary resolution
 * - Authoritative "Continue Learning" / resume target resolution
 */

import { parseDurationToSeconds } from './courseUi.js';

/**
 * Normalizes an individual class/lesson record
 */
export function normalizeLesson(rawLesson, chapter = {}, activeClassId = null, classProgressOverride = null) {
  if (!rawLesson) return null;

  const id = String(rawLesson._id || rawLesson.id || '');
  const chapterCode = String(chapter.uniqueCode || chapter.code || chapter._id || '');
  const chapterTitle = String(chapter.title || 'Chapter');
  const isChapterLocked = Boolean(chapter.locked);

  const durationStr = rawLesson.duration || '0:00';
  const durationSec = parseDurationToSeconds(durationStr);

  // Check progress override or nested progress
  const progressData = classProgressOverride || rawLesson.classProgress || null;
  const rawPercent = progressData?.progressPercent ?? rawLesson.progressPercent ?? 0;
  const progressPercent = Math.min(100, Math.max(0, Math.round(rawPercent)));

  const isCompleted = Boolean(
    rawLesson.completed ||
    progressData?.completed ||
    progressPercent >= 90
  );

  const isLocked = Boolean(
    rawLesson.locked !== undefined
      ? rawLesson.locked
      : isChapterLocked
  );

  return {
    _id: id,
    id,
    title: rawLesson.title || 'Untitled Lesson',
    duration: durationStr,
    durationSeconds: durationSec,
    order: Number(rawLesson.order || 0),
    description: rawLesson.description || '',
    coverImage: rawLesson.coverImage || rawLesson.thumbnail || '',
    thumbnail: rawLesson.thumbnail || rawLesson.coverImage || '',
    exerciseCount: Array.isArray(rawLesson.exercises) ? rawLesson.exercises.length : Number(rawLesson.exerciseCount || 0),
    exercises: Array.isArray(rawLesson.exercises) ? rawLesson.exercises : [],
    progressPercent: isCompleted ? 100 : progressPercent,
    completed: isCompleted,
    isCompleted,
    completedAt: rawLesson.completedAt || progressData?.completedAt || null,
    locked: isLocked,
    isLocked,
    isActive: Boolean(activeClassId && id === String(activeClassId)),
    chapterCode,
    chapterTitle,
    chapterOrder: Number(chapter.order || 0),
  };
}

/**
 * Normalizes full course curriculum into a unified authoritative model
 *
 * @param {object} params
 * @param {object} params.course - Course metadata object
 * @param {Array} params.rawChapters - Chapters array from API
 * @param {string} [params.activeClassId] - Current active class ID
 * @param {Array} [params.activeChapterClasses] - Precision classes array for active chapter
 * @param {object} [params.activeClassProgress] - Progress record for current active class
 * @param {boolean} [params.purchased] - Course enrollment/purchase flag
 * @returns {object} UnifiedCourseCurriculum
 */
export function normalizeCurriculum({
  course = {},
  rawChapters = [],
  activeClassId = null,
  activeChapterClasses = [],
  activeClassProgress = null,
  purchased = false,
}) {
  const isEnrolled = Boolean(
    purchased ||
    course?.purchased ||
    course?.isPurchased ||
    course?.isEnrolled ||
    course?.learningProgress?.completionPercent !== undefined
  );

  const isRecording = String(course?.type || '').trim().toLowerCase() === 'recording';

  // Map of precision class progress overrides (from activeChapterClasses and activeClassProgress)
  const precisionClassMap = new Map();
  if (Array.isArray(activeChapterClasses)) {
    activeChapterClasses.forEach((cls) => {
      if (cls && (cls._id || cls.id)) {
        precisionClassMap.set(String(cls._id || cls.id), cls);
      }
    });
  }

  const chaptersSource = Array.isArray(rawChapters) && rawChapters.length > 0
    ? rawChapters
    : Array.isArray(course?.chapters)
    ? course.chapters
    : [];

  let totalCourseClasses = 0;
  let completedCourseClasses = 0;
  let watchedCourseClasses = 0;
  const flatLessons = [];

  const chapters = chaptersSource.map((rawCh, chIdx) => {
    const chapterCode = String(rawCh.uniqueCode || rawCh.code || rawCh._id || `ch-${chIdx}`);
    const isUnlocked = isEnrolled || (isRecording && chIdx < 2);
    const chapterLocked = rawCh.locked !== undefined ? Boolean(rawCh.locked) : !isUnlocked;

    // Classes array in chapter (supports classes, lessons, or activeChapterClasses fallback)
    const rawClasses = Array.isArray(rawCh.classes) && rawCh.classes.length > 0
      ? rawCh.classes
      : Array.isArray(rawCh.lessons) && rawCh.lessons.length > 0
      ? rawCh.lessons
      : (Array.isArray(activeChapterClasses) && activeChapterClasses.length > 0 && (
          rawCh.uniqueCode === chapterCode ||
          String(rawCh._id || '') === chapterCode ||
          activeChapterClasses.some((c) => String(c.chapterCode || c.chapterId || '') === chapterCode)
        ))
      ? activeChapterClasses
      : [];

    let chCompletedCount = 0;
    let chWatchedCount = 0;

    const lessons = rawClasses.map((rawCls, clsIdx) => {
      const clsId = String(rawCls._id || rawCls.id || `cls-${chIdx}-${clsIdx}`);

      // Check if precision data exists for this class
      const precisionData = precisionClassMap.get(clsId);
      const isCurrentActive = Boolean(activeClassId && clsId === String(activeClassId));
      const progressOverride = isCurrentActive && activeClassProgress
        ? activeClassProgress
        : precisionData?.classProgress || null;

      const mergedRaw = precisionData ? { ...rawCls, ...precisionData } : rawCls;

      const lesson = normalizeLesson(
        mergedRaw,
        { ...rawCh, uniqueCode: chapterCode, locked: chapterLocked },
        activeClassId,
        progressOverride
      );

      if (lesson.completed) chCompletedCount += 1;
      if (lesson.progressPercent > 0) chWatchedCount += 1;

      return lesson;
    });

    const chTotalClasses = lessons.length > 0 ? lessons.length : Number(rawCh.totalClasses || 0);
    const chCompleted = rawCh.completed !== undefined
      ? Boolean(rawCh.completed)
      : chTotalClasses > 0 && chCompletedCount >= chTotalClasses;

    const chProgressPercent = chTotalClasses > 0
      ? Math.min(100, Math.round((chCompletedCount / chTotalClasses) * 100))
      : Number(rawCh.progressPercent || 0);

    totalCourseClasses += chTotalClasses;
    completedCourseClasses += chCompletedCount;
    watchedCourseClasses += chWatchedCount;

    const normalizedChapter = {
      _id: String(rawCh._id || chapterCode),
      uniqueCode: chapterCode,
      title: rawCh.title || `Chapter ${chIdx + 1}`,
      order: Number(rawCh.order ?? chIdx),
      description: rawCh.description || '',
      coverImage: rawCh.coverImage || rawCh.imageName || '',
      totalClasses: chTotalClasses,
      lessonsCount: chTotalClasses,
      completedClasses: chCompletedCount,
      completedLessonsCount: chCompletedCount,
      watchedClasses: chWatchedCount,
      progressPercent: chCompleted ? 100 : chProgressPercent,
      completed: chCompleted,
      isCompleted: chCompleted,
      locked: chapterLocked,
      isLocked: chapterLocked,
      classes: lessons,
      lessons,
    };

    // Add lessons to flatLessons in chronological course order
    lessons.forEach((l, lIdx) => {
      flatLessons.push({
        ...l,
        chapterIndex: chIdx,
        lessonIndex: lIdx,
        overallIndex: flatLessons.length,
        isFirstInChapter: lIdx === 0,
        isLastInChapter: lIdx === lessons.length - 1,
      });
    });

    return normalizedChapter;
  });

  // Calculate overall course progress
  const serverProg = course?.learningProgress;
  const overallTotal = serverProg?.totalClasses || totalCourseClasses;
  const overallCompleted = serverProg?.completedClasses || completedCourseClasses;
  const overallWatched = serverProg?.watchedClasses || watchedCourseClasses;
  const overallPercent = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        serverProg?.completionPercent ??
        (overallTotal > 0 ? (overallCompleted / overallTotal) * 100 : 0)
      )
    )
  );

  // Cross-Chapter Navigation Resolution using flatLessons
  const activeLessonIdx = flatLessons.findIndex((l) => l.isActive);
  const activeLesson = activeLessonIdx >= 0 ? flatLessons[activeLessonIdx] : null;

  const prevLesson = activeLessonIdx > 0 ? flatLessons[activeLessonIdx - 1] : null;
  const nextLesson = activeLessonIdx >= 0 && activeLessonIdx < flatLessons.length - 1
    ? flatLessons[activeLessonIdx + 1]
    : null;

  const isLastLessonInChapter = activeLesson ? Boolean(activeLesson.isLastInChapter) : false;
  const isFirstLessonInChapter = activeLesson ? Boolean(activeLesson.isFirstInChapter) : false;
  const isLastLessonInCourse = activeLessonIdx >= 0 && activeLessonIdx === flatLessons.length - 1;

  // Next chapter if crossing chapter boundary
  let nextChapter = null;
  if (activeLesson && activeLesson.chapterIndex < chapters.length - 1) {
    nextChapter = chapters[activeLesson.chapterIndex + 1];
  }

  // Active Chapter Resolution
  const activeChapterIdx = activeLesson && activeLesson.chapterIndex >= 0 && activeLesson.chapterIndex < chapters.length
    ? activeLesson.chapterIndex
    : chapters.findIndex((ch) => ch.lessons.some((l) => l.isActive));
  const activeChapter = activeChapterIdx >= 0 ? chapters[activeChapterIdx] : (chapters[0] || null);

  // Authoritative Resume / Continue Learning Resolution
  // 1. Last accessed incomplete unlocked lesson
  // 2. Currently in-progress lesson (progressPercent > 0 and < 90)
  // 3. First incomplete unlocked lesson
  // 4. First unlocked lesson (e.g. for review when course is completed)
  // 5. Fallback to flatLessons[0]
  const lastAccessedId = String(
    course?.learningProgress?.lastAccessedClassId ||
    course?.lastAccessedClassId ||
    ''
  );
  const lastAccessedLesson = lastAccessedId
    ? flatLessons.find((l) => l.id === lastAccessedId && !l.locked && !l.isLocked && !l.completed && !l.isCompleted)
    : null;

  const inProgressLesson = flatLessons.find(
    (l) => !l.completed && !l.isCompleted && !l.locked && !l.isLocked && (l.progressPercent > 0)
  );

  const resumeLesson =
    lastAccessedLesson ||
    inProgressLesson ||
    flatLessons.find((l) => !l.completed && !l.isCompleted && !l.locked && !l.isLocked) ||
    flatLessons.find((l) => !l.locked && !l.isLocked) ||
    flatLessons[0] ||
    null;

  return {
    course: {
      _id: String(course?._id || ''),
      name: course?.name || 'Course',
      coverImage: course?.coverImage || course?.image || '',
      type: course?.type || 'recording',
      description: course?.description || '',
      purchased: isEnrolled,
      isEnrolled,
    },
    overallProgress: {
      totalClasses: overallTotal,
      completedClasses: overallCompleted,
      watchedClasses: overallWatched,
      completionPercent: overallPercent,
      streak: serverProg?.streak || 0,
      averageWatchTime: serverProg?.averageWatchTime || '',
      certificateEligible: Boolean(serverProg?.certificateEligible || overallPercent >= 100),
    },
    chapters,
    flatLessons,
    activeLesson,
    activeLessonIndex: activeLessonIdx,
    activeChapter,
    activeChapterIndex: activeChapterIdx,
    prevLesson,
    nextLesson,
    isFirstLessonInChapter,
    isLastLessonInChapter,
    isLastLessonInCourse,
    nextChapter,
    resumeLesson,
  };
}

/**
 * Helper to determine direct resume URL for a course
 */
export function getContinueLearningUrl(course, curriculum = null) {
  if (!course || !course._id) return '/courses';

  if (curriculum?.resumeLesson?.id) {
    return `/courses/class/${curriculum.resumeLesson.id}`;
  }

  // Fallback to course chapters
  return `/courses/${course._id}/chapters`;
}
