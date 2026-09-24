/**
 * @file networkConnectionsService.js
 * Frontend service for managing Network relationships:
 * - Sending, accepting, declining, cancelling connection requests
 * - Removing active connections
 * - Querying connections, incoming/outgoing requests, and real counts
 */

import api from "./api";

export const networkConnectionsService = {
  /**
   * Sends a connection request to a student.
   * @param {string} targetUserId
   * @returns {Promise<{ success: boolean; state: string; connectionId: string }>}
   */
  sendRequest: async (targetUserId) => {
    const response = await api.post(`/network/connections/request/${targetUserId}`);
    return response.data;
  },

  /**
   * Accepts a pending incoming connection request.
   * @param {string} connectionId
   * @returns {Promise<{ success: boolean; state: string; connectionId: string }>}
   */
  acceptRequest: async (connectionId) => {
    const response = await api.patch(`/network/connections/${connectionId}/accept`);
    return response.data;
  },

  /**
   * Declines a pending incoming connection request.
   * @param {string} connectionId
   * @returns {Promise<{ success: boolean; state: string }>}
   */
  declineRequest: async (connectionId) => {
    const response = await api.patch(`/network/connections/${connectionId}/decline`);
    return response.data;
  },

  /**
   * Cancels a pending outgoing connection request sent by current user.
   * @param {string} connectionId
   * @returns {Promise<{ success: boolean; state: string }>}
   */
  cancelRequest: async (connectionId) => {
    const response = await api.delete(`/network/connections/${connectionId}/cancel`);
    return response.data;
  },

  /**
   * Removes an existing active connection.
   * @param {string} connectionId
   * @returns {Promise<{ success: boolean; state: string }>}
   */
  removeConnection: async (connectionId) => {
    const response = await api.delete(`/network/connections/${connectionId}`);
    return response.data;
  },

  /**
   * Retrieves paginated active connections for the current user.
   * @param {Object} [params]
   * @param {number} [params.page=1]
   * @param {number} [params.limit=12]
   * @param {string} [params.q='']
   * @returns {Promise<{ data: Array<any>; page: number; limit: number; total: number; totalPages: number; hasNextPage: boolean }>}
   */
  getConnections: async ({ page = 1, limit = 12, q = "" } = {}) => {
    const response = await api.get("/network/connections", {
      params: {
        page,
        limit,
        q: q || undefined,
      },
    });
    return response.data;
  },

  /**
   * Retrieves pending incoming connection requests.
   * @returns {Promise<{ data: Array<any>; total: number }>}
   */
  getIncomingRequests: async () => {
    const response = await api.get("/network/connections/requests");
    return response.data;
  },

  /**
   * Retrieves pending outgoing connection requests.
   * @returns {Promise<{ data: Array<any>; total: number }>}
   */
  getOutgoingRequests: async () => {
    const response = await api.get("/network/connections/sent");
    return response.data;
  },

  /**
   * Retrieves real counts for connections, incoming requests, and outgoing requests.
   * @returns {Promise<{ connectionsCount: number; incomingRequestsCount: number; outgoingRequestsCount: number }>}
   */
  getConnectionCounts: async () => {
    const response = await api.get("/network/connections/counts");
    return response.data;
  },

  /**
   * Retrieves the relationship state between the current user and target user.
   * @param {string} targetUserId
   * @returns {Promise<{ state: string; connectionId?: string; isRequester?: boolean }>}
   */
  getRelationshipState: async (targetUserId) => {
    const response = await api.get(`/network/connections/relationship/${targetUserId}`);
    return response.data;
  },

  /**
   * Retrieves authoritative database-counted network statistics for any profile.
   * @param {string} userIdOrUsername
   * @returns {Promise<{ followers: number; following: number; connections: number; relationship: any }>}
   */
  getProfileStats: async (userIdOrUsername) => {
    const response = await api.get(`/network/users/${encodeURIComponent(userIdOrUsername)}/stats`);
    return response.data;
  },

  /**
   * Retrieves paginated followers for a user.
   * @param {string} userIdOrUsername
   * @param {Object} [params]
   * @returns {Promise<{ data: Array<any>; page: number; limit: number; total: number; totalPages: number; hasNextPage: boolean }>}
   */
  getUserFollowers: async (userIdOrUsername, { page = 1, limit = 20, q = "" } = {}) => {
    const response = await api.get(`/network/users/${encodeURIComponent(userIdOrUsername)}/followers`, {
      params: { page, limit, q: q || undefined },
    });
    return response.data;
  },

  /**
   * Retrieves paginated following list for a user.
   * @param {string} userIdOrUsername
   * @param {Object} [params]
   * @returns {Promise<{ data: Array<any>; page: number; limit: number; total: number; totalPages: number; hasNextPage: boolean }>}
   */
  getUserFollowing: async (userIdOrUsername, { page = 1, limit = 20, q = "" } = {}) => {
    const response = await api.get(`/network/users/${encodeURIComponent(userIdOrUsername)}/following`, {
      params: { page, limit, q: q || undefined },
    });
    return response.data;
  },

  /**
   * Retrieves paginated accepted connections for a user.
   * @param {string} userIdOrUsername
   * @param {Object} [params]
   * @returns {Promise<{ data: Array<any>; page: number; limit: number; total: number; totalPages: number; hasNextPage: boolean }>}
   */
  getUserConnections: async (userIdOrUsername, { page = 1, limit = 20, q = "" } = {}) => {
    const response = await api.get(`/network/users/${encodeURIComponent(userIdOrUsername)}/connections`, {
      params: { page, limit, q: q || undefined },
    });
    return response.data;
  },

  /**
   * Follows a user.
   * @param {string} userIdOrUsername
   * @returns {Promise<{ success: boolean; following: boolean }>}
   */
  followUser: async (userIdOrUsername) => {
    const response = await api.post(`/network/users/${encodeURIComponent(userIdOrUsername)}/follow`);
    return response.data;
  },

  /**
   * Unfollows a user.
   * @param {string} userIdOrUsername
   * @returns {Promise<{ success: boolean; following: boolean }>}
   */
  unfollowUser: async (userIdOrUsername) => {
    const response = await api.delete(`/network/users/${encodeURIComponent(userIdOrUsername)}/follow`);
    return response.data;
  },

  /**
   * Sends connection request by userId or username.
   * @param {string} userIdOrUsername
   * @returns {Promise<{ success: boolean; state: string; connectionId: string }>}
   */
  connectUser: async (userIdOrUsername) => {
    const response = await api.post(`/network/users/${encodeURIComponent(userIdOrUsername)}/connect`);
    return response.data;
  },
};

export default networkConnectionsService;
