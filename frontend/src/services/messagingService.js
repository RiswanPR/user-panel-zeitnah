import api from './api';

export const messagingService = {
  // ── Conversations ──
  getConversations: async (params = {}) => {
    const response = await api.get('/messages/conversations', { params });
    return response.data;
  },

  getUnreadCounts: async () => {
    const response = await api.get('/messages/conversations/unread-counts');
    return response.data;
  },

  getConversation: async (id) => {
    const response = await api.get(`/messages/conversations/${id}`);
    return response.data;
  },

  startDirectConversation: async (data) => {
    const response = await api.post('/messages/conversations', data);
    return response.data;
  },

  createGroupConversation: async (data) => {
    const response = await api.post('/messages/conversations/group', data);
    return response.data;
  },

  // ── Messages ──
  getMessages: async (conversationId, params = {}) => {
    const response = await api.get(`/messages/conversations/${conversationId}/messages`, { params });
    return response.data;
  },

  sendMessage: async (conversationId, data) => {
    const response = await api.post(`/messages/conversations/${conversationId}/messages`, data);
    return response.data;
  },

  markAsRead: async (conversationId) => {
    const response = await api.patch(`/messages/conversations/${conversationId}/read`);
    return response.data;
  },

  // ── Request Actions ──
  acceptRequest: async (conversationId) => {
    const response = await api.post(`/messages/conversations/${conversationId}/request/accept`);
    return response.data;
  },

  declineRequest: async (conversationId) => {
    const response = await api.post(`/messages/conversations/${conversationId}/request/decline`);
    return response.data;
  },

  // ── Conversation Settings ──
  muteConversation: async (conversationId, data) => {
    const response = await api.patch(`/messages/conversations/${conversationId}/mute`, data);
    return response.data;
  },

  archiveConversation: async (conversationId, data) => {
    const response = await api.patch(`/messages/conversations/${conversationId}/archive`, data);
    return response.data;
  },

  leaveGroup: async (conversationId) => {
    const response = await api.post(`/messages/conversations/${conversationId}/leave`);
    return response.data;
  },

  // ── Message Actions ──
  editMessage: async (messageId, data) => {
    const response = await api.patch(`/messages/messages/${messageId}`, data);
    return response.data;
  },

  deleteMessage: async (messageId, mode = 'me') => {
    const response = await api.delete(`/messages/messages/${messageId}`, {
      params: { mode },
    });
    return response.data;
  },

  toggleReaction: async (messageId, emoji) => {
    const response = await api.post(`/messages/messages/${messageId}/reactions`, { emoji });
    return response.data;
  },

  // ── Moderation & Reports ──
  reportConversation: async (conversationId, data) => {
    const response = await api.post(`/messages/conversations/${conversationId}/report`, data);
    return response.data;
  },

  reportMessage: async (messageId, data) => {
    const response = await api.post(`/messages/messages/${messageId}/report`, data);
    return response.data;
  },
};

export default messagingService;
