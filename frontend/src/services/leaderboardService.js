import api from "./api";

/**
 * Dedicated service abstraction for the Zeitnah Leaderboard ecosystem.
 * Consumes authoritative backend endpoints for global & course-specific
 * rankings, top-3 podiums, personal student position, and enrolled course stats.
 */
export const leaderboardService = {
  /**
   * Retrieves the global student leaderboard with server-side pagination,
   * search query, level/rank filters, top-3 podium, and personal telemetry.
   *
   * @param {Object} params
   * @param {number} [params.page=1]
   * @param {number} [params.limit=25]
   * @param {string} [params.q]
   * @param {number} [params.level]
   * @param {string} [params.rank]
   */
  getGlobalLeaderboard: async (params = {}) => {
    const response = await api.get("/leaderboard/global", { params });
    return response.data;
  },

  /**
   * Retrieves authenticated student's current global position, XP, level,
   * rank title, and level progression towards next tier.
   */
  getMyLeaderboardPosition: async () => {
    const response = await api.get("/leaderboard/position");
    return response.data;
  },

  /**
   * Retrieves student's enrolled courses with course XP, completion %,
   * learner count, and course-specific rank.
   */
  getMyCoursesLeaderboard: async () => {
    const response = await api.get("/leaderboard/courses");
    return response.data;
  },

  /**
   * Retrieves course-specific leaderboard with podium, paginated learners,
   * course XP, completion %, and student's personal position in this course.
   *
   * @param {string} courseId
   * @param {Object} params
   * @param {number} [params.page=1]
   * @param {number} [params.limit=25]
   * @param {string} [params.q]
   * @param {number} [params.level]
   */
  getCourseLeaderboard: async (courseId, params = {}) => {
    const response = await api.get(`/leaderboard/course/${courseId}`, { params });
    return response.data;
  },
};

export default leaderboardService;
