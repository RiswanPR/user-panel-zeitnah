import api from './api';

export const communityApi = {
  // ── Posts ──
  getFeed: async ({ cursor = '', limit = 10 }) => {
    const response = await api.get('/community/posts', {
      params: { cursor, limit }
    });
    return response.data;
  },

  getPost: async (id) => {
    const response = await api.get(`/community/posts/${id}`);
    return response.data;
  },

  createPost: async (data) => {
    const response = await api.post('/community/posts', data);
    return response.data;
  },

  updatePost: async (id, data) => {
    const response = await api.patch(`/community/posts/${id}`, data);
    return response.data;
  },

  deletePost: async (id) => {
    const response = await api.delete(`/community/posts/${id}`);
    return response.data;
  },

  reactToPost: async (id, reactionData) => {
    const response = await api.post(`/community/posts/${id}/reactions`, reactionData);
    return response.data;
  },

  removeReaction: async (id) => {
    const response = await api.delete(`/community/posts/${id}/reactions`);
    return response.data;
  },

  savePost: async (id) => {
    const response = await api.post(`/community/posts/${id}/bookmarks`);
    return response.data;
  },

  removeSavedPost: async (id) => {
    const response = await api.delete(`/community/posts/${id}/bookmarks`);
    return response.data;
  },

  // ── Stories ──
  getActiveStories: async () => {
    const response = await api.get('/community/stories');
    return response.data;
  },

  createStory: async (data) => {
    const response = await api.post('/community/stories', data);
    return response.data;
  },

  deleteStory: async (id) => {
    const response = await api.delete(`/community/stories/${id}`);
    return response.data;
  },

  viewStory: async (id) => {
    const response = await api.post(`/community/stories/${id}/view`);
    return response.data;
  },

  replyToStory: async (id, data) => {
    const response = await api.post(`/community/stories/${id}/reply`, data);
    return response.data;
  },

  // ── Comments ──
  getComments: async (postId, { skip = 0, limit = 10 }) => {
    const response = await api.get(`/community/comments/post/${postId}`, {
      params: { skip, limit }
    });
    return response.data;
  },

  createComment: async (postId, data) => {
    const response = await api.post(`/community/comments/${postId}`, data);
    return response.data;
  },

  updateComment: async (id, data) => {
    const response = await api.patch(`/community/comments/${id}`, data);
    return response.data;
  },

  deleteComment: async (id) => {
    const response = await api.delete(`/community/comments/${id}`);
    return response.data;
  },

  // ── Notifications ──
  getNotifications: async () => {
    const response = await api.get('/community/notifications');
    return response.data;
  },

  getUnreadNotificationsCount: async () => {
    const response = await api.get('/community/notifications/unread-count');
    return response.data;
  },

  markNotificationRead: async (id) => {
    const response = await api.patch(`/community/notifications/${id}/read`);
    return response.data;
  },

  markAllNotificationsRead: async () => {
    const response = await api.patch('/community/notifications/read-all');
    return response.data;
  },

  // ── File Upload ──
  // Uploads to NestJS endpoint which forwards to S3
  uploadMedia: async (file, onUploadProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    
    // Using common upload endpoint, assuming it exists or will be created.
    // If not, we will add an endpoint in community module for this.
    // Using common upload endpoint in community module.
    const response = await api.post('/community/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    });
    return response.data;
  },

  deleteMedia: async (url) => {
    const response = await api.delete('/community/upload', { data: { url } });
    return response.data;
  },

  // ── Gamification ──
  getProfile: async () => {
    const response = await api.get('/community/profile');
    return response.data;
  },

  // ── AI ──
  improveText: async (text) => {
    const response = await api.post('/community/ai/improve', { text });
    return response.data;
  },
  
  suggestTags: async (text) => {
    const response = await api.post('/community/ai/suggest-tags', { text });
    return response.data;
  },

  // ── Moderation ──
  getReports: async () => {
    const response = await api.get('/community/moderation/reports');
    return response.data;
  },

  resolveReport: async (id, data) => {
    const response = await api.post(`/community/moderation/reports/${id}/resolve`, data);
    return response.data;
  },

  hidePostAsMod: async (id, reason) => {
    const response = await api.post(`/community/moderation/posts/${id}/hide`, { reason });
    return response.data;
  },

  acceptAnswer: async (postId, commentId) => {
    // We can just hit a generic route for this or build one specifically. We'll add this to posts controller later if needed, or handle it locally
    const response = await api.post(`/community/posts/${postId}/accept-answer`, { commentId });
    return response.data;
  }
};
