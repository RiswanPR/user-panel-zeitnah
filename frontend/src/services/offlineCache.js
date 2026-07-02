const CACHE_NAME = 'zeitnah-lms-cache-v1';

export const cacheCourseMetadata = async (courseId, data) => {
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = new Response(JSON.stringify(data));
    await cache.put(`/api/courses/${courseId}`, response);
  } catch (error) {
    console.warn('Failed to cache course metadata', error);
  }
};

export const getCachedCourseMetadata = async (courseId) => {
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(`/api/courses/${courseId}`);
    if (response) {
      return await response.json();
    }
  } catch (error) {
    console.warn('Failed to get cached course metadata', error);
  }
  return null;
};

export const cacheRecentlyWatched = (data) => {
  try {
    localStorage.setItem('recently_watched', JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to cache recently watched', error);
  }
};

export const getCachedRecentlyWatched = () => {
  try {
    const data = localStorage.getItem('recently_watched');
    if (data) return JSON.parse(data);
  } catch (error) {
    console.warn('Failed to get cached recently watched', error);
  }
  return null;
};
