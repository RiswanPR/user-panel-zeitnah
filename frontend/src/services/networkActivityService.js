/**
 * @file networkActivityService.js
 * Service layer for Phase 5 Network Activity Feed, Events & Learning Timeline.
 */

import api from "./api";

/**
 * @typedef {Object} NetworkActivityActor
 * @property {string} id
 * @property {string} name
 * @property {string} [username]
 * @property {string} [avatarUrl]
 * @property {string} [headline]
 * @property {boolean} [isVerified]
 */

/**
 * @typedef {Object} NetworkActivityItemData
 * @property {string} id
 * @property {NetworkActivityActor} actor
 * @property {'COURSE_COMPLETED' | 'LESSON_COMPLETED' | 'ACHIEVEMENT_EARNED' | 'STREAK_MILESTONE' | 'COURSE_JOINED'} type
 * @property {Object} context
 * @property {string} [context.courseId]
 * @property {string} [context.courseName]
 * @property {string} [context.lessonId]
 * @property {string} [context.lessonName]
 * @property {string} [context.achievementId]
 * @property {string} [context.achievementName]
 * @property {number} [context.streakDays]
 * @property {string} [context.thumbnail]
 * @property {string} createdAt
 * @property {Object} relationship
 * @property {'none' | 'outgoing_pending' | 'incoming_pending' | 'connected' | 'self' | 'blocked'} relationship.state
 * @property {string} [relationship.connectionId]
 */

/**
 * @typedef {Object} PaginatedNetworkActivityResponse
 * @property {NetworkActivityItemData[]} data
 * @property {number} page
 * @property {number} limit
 * @property {number} total
 * @property {number} totalPages
 * @property {boolean} hasNextPage
 */

/**
 * @typedef {Object} NetworkActivitySummaryResponse
 * @property {number} activeConnectionsCount
 * @property {number} weeklyMilestonesCount
 * @property {number} weeklyAchievementsCount
 */

export const networkActivityService = {
  /**
   * Fetches the server-driven network learning activity feed.
   *
   * @param {Object} [params]
   * @param {number} [params.page=1]
   * @param {number} [params.limit=10]
   * @param {'all' | 'connections'} [params.scope='all']
   * @param {'all' | 'courses' | 'achievements' | 'streaks' | 'lessons'} [params.type='all']
   * @returns {Promise<PaginatedNetworkActivityResponse>}
   */
  fetchActivityFeed: async ({
    page = 1,
    limit = 10,
    scope = "all",
    type = "all",
  } = {}) => {
    const response = await api.get("/network/activity", {
      params: { page, limit, scope, type },
    });
    return response.data;
  },

  /**
   * Fetches summary statistics for the network activity timeline.
   *
   * @returns {Promise<NetworkActivitySummaryResponse>}
   */
  fetchActivitySummary: async () => {
    const response = await api.get("/network/activity/summary");
    return response.data;
  },
};

export default networkActivityService;
