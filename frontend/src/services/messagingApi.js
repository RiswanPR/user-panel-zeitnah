import api from './api';

export const messagingApi = {
  // ── Conversations ──
  createConversation: async (targetUserId) => {
    const response = await api.post('/community/messages/conversations', {
      targetUserId,
    });
    return response.data;
  },

  getConversations: async (page = 1, limit = 20) => {
    const response = await api.get(
      `/community/messages/conversations?page=${page}&limit=${limit}`,
    );
    return response.data;
  },

  getConversationById: async (conversationId) => {
    const response = await api.get(
      `/community/messages/conversations/${conversationId}`,
    );
    return response.data;
  },

  // ── Messages & Enterprise Pagination ──
  getMessagesByCursor: async (conversationId, cursor = '', limit = 50) => {
    const cursorQuery = cursor ? `&cursor=${cursor}` : '';
    const response = await api.get(
      `/community/messages/cursor?conversationId=${conversationId}&limit=${limit}${cursorQuery}`,
    );
    return response.data;
  },

  getMessages: async (conversationId, page = 1, limit = 50) => {
    const response = await api.get(
      `/community/messages/${conversationId}?page=${page}&limit=${limit}`,
    );
    return response.data;
  },

  sendMessage: async (payload) => {
    const response = await api.post('/community/messages', payload);
    return response.data;
  },

  uploadFile: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/community/messages/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  reactMessage: async (messageId, emoji) => {
    const response = await api.post('/community/messages/reactions', {
      messageId,
      emoji,
    });
    return response.data;
  },

  pinMessage: async (messageId) => {
    const response = await api.post('/community/messages/pin', { messageId });
    return response.data;
  },

  forwardMessage: async (messageId, targetConversationId) => {
    const response = await api.post('/community/messages/forward', {
      messageId,
      targetConversationId,
    });
    return response.data;
  },

  searchMessages: async (conversationId, query) => {
    const response = await api.get(
      `/community/messages/search?conversationId=${conversationId}&query=${encodeURIComponent(query)}`,
    );
    return response.data;
  },

  globalSearchMessages: async (query, type = '') => {
    const typeQuery = type ? `&type=${type}` : '';
    const response = await api.get(
      `/community/messages/global-search?query=${encodeURIComponent(query)}${typeQuery}`,
    );
    return response.data;
  },

  getSharedMediaGallery: async (conversationId, type = '') => {
    const typeQuery = type ? `?type=${type}` : '';
    const response = await api.get(
      `/community/messages/gallery/${conversationId}${typeQuery}`,
    );
    return response.data;
  },

  getConversationAnalytics: async (conversationId) => {
    const response = await api.get(
      `/community/messages/analytics/${conversationId}`,
    );
    return response.data;
  },

  editMessage: async (messageId, content) => {
    const response = await api.patch(`/community/messages/${messageId}`, {
      content,
    });
    return response.data;
  },

  deleteMessage: async (messageId) => {
    const response = await api.delete(`/community/messages/${messageId}`);
    return response.data;
  },

  // ── Read Receipts & Presence ──
  markRead: async ({ conversationId, messageId }) => {
    const response = await api.post('/community/messages/read', {
      conversationId,
      messageId,
    });
    return response.data;
  },

  getPresence: async (userId) => {
    const response = await api.get(`/community/messages/presences/${userId}`);
    return response.data;
  },
};
