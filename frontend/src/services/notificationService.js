/**
 * @file notificationService.js
 * Frontend service for Zeitnah notifications, preferences, and platform announcements.
 */

import api from './api';

export const notificationService = {
  /**
   * Retrieves paginated notifications with optional category and unread filters.
   */
  getNotifications: async ({ page = 1, limit = 20, category = '', unreadOnly = false } = {}) => {
    const params = new URLSearchParams();
    if (page) params.append('page', String(page));
    if (limit) params.append('limit', String(limit));
    if (category && category !== 'all') params.append('category', category);
    if (unreadOnly) params.append('unreadOnly', 'true');

    const response = await api.get(`/notifications?${params.toString()}`);
    return response.data;
  },

  /**
   * Retrieves current unread notifications count.
   */
  getUnreadCount: async () => {
    const response = await api.get('/notifications/unread-count');
    return response.data?.unreadCount || 0;
  },

  /**
   * Marks a single notification as read.
   */
  markAsRead: async (notificationId) => {
    const response = await api.patch(`/notifications/${notificationId}/read`);
    return response.data;
  },

  /**
   * Marks all notifications as read (optionally filtered by category).
   */
  markAllAsRead: async (category = '') => {
    const params = category && category !== 'all' ? `?category=${category}` : '';
    const response = await api.patch(`/notifications/read-all${params}`);
    return response.data;
  },

  /**
   * Clears (soft-deletes) all read notifications.
   */
  clearReadNotifications: async () => {
    const response = await api.delete('/notifications/clear-read');
    return response.data;
  },

  /**
   * Retrieves user notification preferences.
   */
  getPreferences: async () => {
    const response = await api.get('/notifications/preferences');
    return response.data;
  },

  /**
   * Updates user notification preferences.
   */
  updatePreferences: async (preferences) => {
    const response = await api.patch('/notifications/preferences', preferences);
    return response.data;
  },

  /**
   * Retrieves active platform announcements for the current user.
   */
  getActiveAnnouncements: async () => {
    const response = await api.get('/announcements');
    return response.data || [];
  },

  /**
   * Retrieves single announcement by ID.
   */
  getAnnouncementById: async (id) => {
    const response = await api.get(`/announcements/${id}`);
    return response.data;
  },

  /**
   * Dismisses an active announcement.
   */
  dismissAnnouncement: async (id) => {
    const response = await api.post(`/announcements/${id}/dismiss`);
    return response.data;
  },

  /**
   * Explicitly acknowledges an announcement requiring acknowledgment.
   */
  acknowledgeAnnouncement: async (id) => {
    const response = await api.post(`/announcements/${id}/acknowledge`);
    return response.data;
  },
};

export default notificationService;
