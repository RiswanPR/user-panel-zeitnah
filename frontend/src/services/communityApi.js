import api from './api';

const SAVED_POSTS_KEY = 'zeitnah_saved_post_ids';

const getSavedPostIds = () => {
  try {
    const raw = localStorage.getItem(SAVED_POSTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const addSavedPostId = (id) => {
  try {
    const ids = getSavedPostIds();
    if (!ids.includes(id)) {
      localStorage.setItem(SAVED_POSTS_KEY, JSON.stringify([id, ...ids]));
    }
  } catch {}
};

const removeSavedPostId = (id) => {
  try {
    const ids = getSavedPostIds().filter((savedId) => savedId !== id);
    localStorage.setItem(SAVED_POSTS_KEY, JSON.stringify(ids));
  } catch {}
};

export const communityApi = {
  // ── Posts ──
  getFeed: async ({ cursor = '', limit = 10, filter = 'all' } = {}) => {
    const response = await api.get('/community/posts', {
      params: {
        cursor,
        limit,
        filter: filter && filter !== 'all' ? filter : undefined,
      },
    });

    const data = response.data;
    const savedIds = getSavedPostIds();
    if (data?.items && Array.isArray(data.items)) {
      data.items = data.items.map((post) => ({
        ...post,
        isSaved: Boolean(post.isSaved || savedIds.includes(post._id || post.id)),
      }));
    }
    return data;
  },

  getSavedPosts: async ({ cursor = '', limit = 10 } = {}) => {
    try {
      const response = await api.get('/community/posts/saved', {
        params: { cursor, limit },
      });
      if (response.data && Array.isArray(response.data.items) && response.data.items.length > 0) {
        return response.data;
      }
    } catch {
      // Continue to fallback
    }

    // Fallback: Resolve saved posts from verified bookmark IDs
    const savedIds = getSavedPostIds();
    if (savedIds.length === 0) {
      return { items: [], nextCursor: null };
    }

    const posts = await Promise.all(
      savedIds.map(async (id) => {
        try {
          const res = await api.get(`/community/posts/${id}`);
          if (res.data) {
            return { ...res.data, isSaved: true };
          }
          return null;
        } catch {
          return null;
        }
      })
    );

    return {
      items: posts.filter(Boolean),
      nextCursor: null,
    };
  },

  getPost: async (id) => {
    const response = await api.get(`/community/posts/${id}`);
    const savedIds = getSavedPostIds();
    return {
      ...response.data,
      isSaved: Boolean(response.data.isSaved || savedIds.includes(id)),
    };
  },

  createPost: async (data, options = {}) => {
    const idempotencyKey = data?.idempotencyKey || options?.idempotencyKey;
    const config = {};
    if (idempotencyKey) {
      config.headers = { 'Idempotency-Key': idempotencyKey };
    }
    const response = await api.post('/community/posts', data, config);
    return response.data;
  },

  updatePost: async (id, data) => {
    const response = await api.patch(`/community/posts/${id}`, data);
    return response.data;
  },

  deletePost: async (id) => {
    const response = await api.delete(`/community/posts/${id}`);
    removeSavedPostId(id);
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
    addSavedPostId(id);
    const response = await api.post(`/community/posts/${id}/bookmarks`);
    return response.data;
  },

  removeSavedPost: async (id) => {
    removeSavedPostId(id);
    const response = await api.delete(`/community/posts/${id}/bookmarks`);
    return response.data;
  },

  // ── Repost & Quote ──
  repostPost: async (id) => {
    const response = await api.post(`/community/posts/${id}/repost`);
    return response.data;
  },

  unrepostPost: async (id) => {
    const response = await api.delete(`/community/posts/${id}/repost`);
    return response.data;
  },

  quotePost: async (id, data) => {
    const response = await api.post(`/community/posts/${id}/quote`, data);
    return response.data;
  },

  // ── Stories ──
  getActiveStories: async () => {
    const response = await api.get('/community/stories');
    return response.data;
  },

  createStory: async (data, options = {}) => {
    const idempotencyKey = data?.idempotencyKey || options?.idempotencyKey;
    const config = {};
    if (idempotencyKey) {
      config.headers = { 'Idempotency-Key': idempotencyKey };
    }
    const response = await api.post('/community/stories', data, config);
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
  uploadMedia: async (file, onUploadProgress, signal) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/community/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
      signal,
      skipDeduplication: true,
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
