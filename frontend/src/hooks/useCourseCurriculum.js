import { useMemo } from 'react';
import { normalizeCurriculum } from '../utils/courseCurriculum';

/**
 * useCourseCurriculum
 *
 * React hook that memoizes authoritative curriculum normalization.
 * Consumed by:
 * - ClassView (Watch Class / Learning Studio)
 * - CurriculumSidebar (Desktop)
 * - CurriculumDrawer (Mobile)
 * - LessonNavigation
 */
export function useCourseCurriculum({
  course,
  rawChapters,
  activeClassId,
  activeChapterClasses,
  activeClassProgress,
  purchased,
}) {
  return useMemo(() => {
    return normalizeCurriculum({
      course,
      rawChapters,
      activeClassId,
      activeChapterClasses,
      activeClassProgress,
      purchased,
    });
  }, [
    course,
    rawChapters,
    activeClassId,
    activeChapterClasses,
    activeClassProgress,
    purchased,
  ]);
}

export default useCourseCurriculum;
