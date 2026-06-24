export const API_CONFIG = {
  // Use localhost for Android emulator (10.0.2.2), localhost for iOS simulator, or local IP for physical devices
  // Since we're targeting a production backend eventually, we'll configure a base URL here.
  BASE_URL: 'http://10.0.2.2:3000/api', // Example local backend URL
  TIMEOUT: 15000,
};

export const ENDPOINTS = {
  AUTH: {
    SEND_OTP: '/auth/login/send-otp',
    VERIFY_OTP: '/auth/login/verify-otp',
    REFRESH_TOKEN: '/auth/refresh-token',
    LOGOUT: '/auth/logout',
  },
  STUDENT: {
    PROFILE: '/profile/me',
    COURSES: '/courses/my',
    ALL_COURSES: '/courses',
    COURSE_DETAILS: (id: string) => `/courses/${id}`,
    DASHBOARD: '/courses/my-learning',
    CHAPTERS: (courseId: string) => `/courses/${courseId}/chapters`,
    CLASSES: (courseId: string, chapterCode: string) => `/courses/${courseId}/chapters/${chapterCode}/classes`,
    CLASS: (classId: string) => `/courses/class/${classId}`,
    PROGRESS: (classId: string) => `/courses/class/${classId}/progress`,
    VIDEO_PLAYBACK: (classId: string) => `/courses/video/${classId}`,
    VIDEO_PLAYLIST: (classId: string) => `/courses/video/${classId}/playlist.m3u8`,
    WATCH_POSITION: '/courses/start-stream',
    CONTINUE_LEARNING: '/courses/my-learning',
    RESOURCES: (classId: string) => `/courses/class/${classId}/resources`,
  }
};
