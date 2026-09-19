/**
 * @file communityService.js
 * Service abstraction for Zeitnah LMS Learning Communities & Spaces (Phase 6).
 */

import api from "./api";

const communityService = {
  /**
   * Retrieves paginated list of discoverable communities.
   *
   * @param {Object} [params]
   * @param {string} [params.q]
   * @param {'course'|'subject'|'interest'|'project'|'general'|'all'} [params.type]
   * @param {'recommended'|'popular'|'newest'|'active'} [params.sort]
   * @param {boolean} [params.myCommunities]
   * @param {number} [params.page]
   * @param {number} [params.limit]
   */
  getCommunities: async (params = {}) => {
    const cleanParams = {};
    if (params.q?.trim()) cleanParams.q = params.q.trim();
    if (params.type && params.type !== "all") cleanParams.type = params.type.toUpperCase();
    if (params.sort) cleanParams.sort = params.sort;
    if (params.myCommunities) cleanParams.myCommunities = "true";
    if (params.page) cleanParams.page = params.page;
    if (params.limit) cleanParams.limit = params.limit;

    const response = await api.get("/network/communities", {
      params: cleanParams,
    });
    return response.data;
  },

  /**
   * Retrieves single community detail with permissions and rules by unique slug.
   *
   * @param {string} slug
   */
  getCommunityBySlug: async (slug) => {
    const response = await api.get(
      `/network/communities/${encodeURIComponent(slug)}`,
    );
    return response.data;
  },

  /**
   * Joins a community.
   *
   * @param {string} communityId
   */
  joinCommunity: async (communityId) => {
    const response = await api.post(`/network/communities/${communityId}/join`);
    return response.data;
  },

  /**
   * Leaves a community.
   *
   * @param {string} communityId
   */
  leaveCommunity: async (communityId) => {
    const response = await api.post(`/network/communities/${communityId}/leave`);
    return response.data;
  },

  /**
   * Retrieves paginated members of a community.
   *
   * @param {string} communityId
   * @param {Object} [params]
   * @param {string} [params.q]
   * @param {'all'|'member'|'moderator'|'owner'} [params.role]
   * @param {number} [params.page]
   * @param {number} [params.limit]
   */
  getCommunityMembers: async (communityId, params = {}) => {
    const cleanParams = {};
    if (params.q?.trim()) cleanParams.q = params.q.trim();
    if (params.role && params.role !== "all") cleanParams.role = params.role;
    if (params.page) cleanParams.page = params.page;
    if (params.limit) cleanParams.limit = params.limit;

    const response = await api.get(
      `/network/communities/${communityId}/members`,
      { params: cleanParams },
    );
    return response.data;
  },

  /**
   * Retrieves discussions in a community.
   *
   * @param {string} communityId
   * @param {Object} [params]
   * @param {'question'|'discussion'|'project'|'resource'|'study_help'|'all'} [params.type]
   * @param {number} [params.page]
   * @param {number} [params.limit]
   */
  getDiscussions: async (communityId, params = {}) => {
    const cleanParams = {};
    if (params.type && params.type !== "all") cleanParams.type = params.type;
    if (params.page) cleanParams.page = params.page;
    if (params.limit) cleanParams.limit = params.limit;

    const response = await api.get(
      `/network/communities/${communityId}/discussions`,
      { params: cleanParams },
    );
    return response.data;
  },

  /**
   * Creates a discussion inside a community.
   *
   * @param {string} communityId
   * @param {Object} payload
   * @param {string} payload.title
   * @param {string} payload.body
   * @param {'question'|'discussion'|'project'|'resource'|'study_help'} [payload.type]
   */
  createDiscussion: async (communityId, payload) => {
    const response = await api.post(
      `/network/communities/${communityId}/discussions`,
      payload,
    );
    return response.data;
  },

  /**
   * Retrieves single discussion detail with permissions.
   *
   * @param {string} discussionId
   */
  getDiscussionDetail: async (discussionId) => {
    const response = await api.get(`/network/discussions/${discussionId}`);
    return response.data;
  },

  /**
   * Updates an existing discussion.
   *
   * @param {string} discussionId
   * @param {Object} payload
   * @param {string} [payload.title]
   * @param {string} [payload.body]
   */
  updateDiscussion: async (discussionId, payload) => {
    const response = await api.patch(
      `/network/discussions/${discussionId}`,
      payload,
    );
    return response.data;
  },

  /**
   * Deletes a discussion.
   *
   * @param {string} discussionId
   */
  deleteDiscussion: async (discussionId) => {
    const response = await api.delete(`/network/discussions/${discussionId}`);
    return response.data;
  },

  /**
   * Moderation: Toggles lock status on a discussion.
   *
   * @param {string} discussionId
   * @param {boolean} locked
   */
  toggleLockDiscussion: async (discussionId, locked) => {
    const response = await api.patch(`/network/discussions/${discussionId}/lock`, {
      locked: Boolean(locked),
    });
    return response.data;
  },

  /**
   * Moderation: Toggles pinned status on a discussion.
   *
   * @param {string} discussionId
   * @param {boolean} [pinned]
   */
  togglePinDiscussion: async (discussionId, pinned) => {
    const response = await api.patch(`/network/discussions/${discussionId}/pin`, {
      pinned,
    });
    return response.data;
  },

  /**
   * Retrieves chronological flat replies for a discussion.
   *
   * @param {string} discussionId
   * @param {Object} [params]
   * @param {number} [params.page]
   * @param {number} [params.limit]
   */
  getReplies: async (discussionId, params = {}) => {
    const cleanParams = {};
    if (params.page) cleanParams.page = params.page;
    if (params.limit) cleanParams.limit = params.limit;

    const response = await api.get(
      `/network/discussions/${discussionId}/replies`,
      { params: cleanParams },
    );
    return response.data;
  },

  /**
   * Posts a reply to a discussion.
   *
   * @param {string} discussionId
   * @param {Object} payload
   * @param {string} payload.body
   */
  createReply: async (discussionId, payload) => {
    const response = await api.post(
      `/network/discussions/${discussionId}/replies`,
      payload,
    );
    return response.data;
  },

  /**
   * Deletes a reply.
   *
   * @param {string} discussionId
   * @param {string} replyId
   */
  deleteReply: async (discussionId, replyId) => {
    const response = await api.delete(
      `/network/discussions/${discussionId}/replies/${replyId}`,
    );
    return response.data;
  },

  /**
   * Retrieves community announcements.
   *
   * @param {string} communityId
   */
  getAnnouncements: async (communityId) => {
    const response = await api.get(
      `/network/communities/${communityId}/announcements`,
    );
    return response.data;
  },

  /**
   * Creates a community announcement (moderators/owners only).
   *
   * @param {string} communityId
   * @param {Object} payload
   * @param {string} payload.title
   * @param {string} payload.content
   * @param {boolean} [payload.pinned]
   */
  createAnnouncement: async (communityId, payload) => {
    const response = await api.post(
      `/network/communities/${communityId}/announcements`,
      payload,
    );
    return response.data;
  },

  /**
   * Retrieves community shared resources.
   *
   * @param {string} communityId
   */
  getResources: async (communityId) => {
    const response = await api.get(
      `/network/communities/${communityId}/resources`,
    );
    return response.data;
  },

  /**
   * Creates a community resource.
   *
   * @param {string} communityId
   * @param {Object} payload
   * @param {string} payload.title
   * @param {string} [payload.description]
   * @param {'course'|'document'|'link'} payload.type
   * @param {string} [payload.targetId]
   * @param {string} [payload.url]
   */
  createResource: async (communityId, payload) => {
    const response = await api.post(
      `/network/communities/${communityId}/resources`,
      payload,
    );
    return response.data;
  },

  /**
   * Reports community content (discussion, reply, or community).
   *
   * @param {Object} payload
   * @param {'community'|'discussion'|'reply'} payload.targetType
   * @param {string} payload.targetId
   * @param {string} payload.reason
   */
  reportContent: async (payload) => {
    const response = await api.post("/network/communities/report", payload);
    return response.data;
  },
};

export default communityService;
