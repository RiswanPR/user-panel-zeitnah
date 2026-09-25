import api from './api';

export const networkApi = {
  // ── Learning Spaces ──
  getSpaces: async (params = {}) => {
    const response = await api.get('/network/spaces', { params });
    return response.data;
  },

  getSpace: async (idOrSlug) => {
    const response = await api.get(`/network/spaces/${idOrSlug}`);
    return response.data;
  },

  joinSpace: async (idOrSlug) => {
    const response = await api.post(`/network/spaces/${idOrSlug}/join`);
    return response.data;
  },

  leaveSpace: async (idOrSlug) => {
    const response = await api.delete(`/network/spaces/${idOrSlug}/leave`);
    return response.data;
  },

  // ── Space Announcements ──
  getSpaceAnnouncements: async (idOrSlug) => {
    const response = await api.get(`/network/spaces/${idOrSlug}/announcements`);
    return response.data;
  },

  createSpaceAnnouncement: async (idOrSlug, data) => {
    const response = await api.post(`/network/spaces/${idOrSlug}/announcements`, data);
    return response.data;
  },

  // ── Space Discussions ──
  getSpaceDiscussions: async (idOrSlug, params = {}) => {
    const response = await api.get(`/network/spaces/${idOrSlug}/discussions`, { params });
    return response.data;
  },

  createSpaceDiscussion: async (idOrSlug, data) => {
    const response = await api.post(`/network/spaces/${idOrSlug}/discussions`, data);
    return response.data;
  },

  getDiscussion: async (id) => {
    const response = await api.get(`/network/discussions/${id}`);
    return response.data;
  },

  getReplies: async (discussionId, params = {}) => {
    const response = await api.get(`/network/discussions/${discussionId}/replies`, { params });
    return response.data;
  },

  createReply: async (discussionId, data) => {
    const response = await api.post(`/network/discussions/${discussionId}/replies`, data);
    return response.data;
  },

  // ── Space Resources ──
  getSpaceResources: async (idOrSlug) => {
    const response = await api.get(`/network/spaces/${idOrSlug}/resources`);
    return response.data;
  },

  createSpaceResource: async (idOrSlug, data) => {
    const response = await api.post(`/network/spaces/${idOrSlug}/resources`, data);
    return response.data;
  },

  // ── Space Members ──
  getSpaceMembers: async (idOrSlug, params = {}) => {
    const response = await api.get(`/network/spaces/${idOrSlug}/members`, { params });
    return response.data;
  },

  // ── People & Connections ──
  getFilters: async () => {
    const response = await api.get('/network/filters');
    return response.data;
  },

  getPeople: async (params = {}) => {
    const response = await api.get('/network/people', { params });
    return response.data;
  },

  getConnections: async (params = {}) => {
    const response = await api.get('/network/connections', { params });
    return response.data;
  },

  getPendingRequests: async () => {
    const response = await api.get('/network/connections/requests');
    return response.data;
  },

  sendConnectionRequest: async (recipientId) => {
    const response = await api.post(`/network/connections/request/${recipientId}`);
    return response.data;
  },

  acceptConnectionRequest: async (id) => {
    const response = await api.patch(`/network/connections/${id}/accept`);
    return response.data;
  },

  removeConnection: async (id) => {
    const response = await api.delete(`/network/connections/${id}`);
    return response.data;
  },

  // ── Network Profile Statistics & Relationships ──
  getProfileStats: async (userIdOrUsername) => {
    const response = await api.get(`/network/users/${encodeURIComponent(userIdOrUsername)}/stats`);
    return response.data;
  },

  getUserFollowers: async (userIdOrUsername, params = {}) => {
    const response = await api.get(`/network/users/${encodeURIComponent(userIdOrUsername)}/followers`, { params });
    return response.data;
  },

  getUserFollowing: async (userIdOrUsername, params = {}) => {
    const response = await api.get(`/network/users/${encodeURIComponent(userIdOrUsername)}/following`, { params });
    return response.data;
  },

  getUserConnections: async (userIdOrUsername, params = {}) => {
    const response = await api.get(`/network/users/${encodeURIComponent(userIdOrUsername)}/connections`, { params });
    return response.data;
  },

  followUser: async (userIdOrUsername) => {
    const response = await api.post(`/network/users/${encodeURIComponent(userIdOrUsername)}/follow`);
    return response.data;
  },

  unfollowUser: async (userIdOrUsername) => {
    const response = await api.delete(`/network/users/${encodeURIComponent(userIdOrUsername)}/follow`);
    return response.data;
  },

  connectUser: async (userIdOrUsername) => {
    const response = await api.post(`/network/users/${encodeURIComponent(userIdOrUsername)}/connect`);
    return response.data;
  },

  // ── Opportunities & Organizations ──
  getOrganizations: async (params = {}) => {
    const response = await api.get('/network/organizations', { params });
    return response.data;
  },

  getOrganization: async (slug) => {
    const response = await api.get(`/network/organizations/${slug}`);
    return response.data;
  },

  getOpportunities: async (params = {}) => {
    const response = await api.get('/network/opportunities', { params });
    return response.data;
  },

  getOpportunity: async (id) => {
    const response = await api.get(`/network/opportunities/${id}`);
    return response.data;
  },
};
