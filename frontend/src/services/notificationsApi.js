import api from './api';
import { deduplicateAndSortNotifications } from '../utils/notificationUtils';

export const notificationsApi = {
  getNotifications: async (params = {}) => {
    const response = await api.get('/notifications', { params });
    const raw = response.data;
    const rawList = raw?.notifications || raw?.data || (Array.isArray(raw) ? raw : []);
    const notifications = deduplicateAndSortNotifications(rawList);

    return {
      notifications,
      data: notifications,
      unreadCount: typeof raw?.unreadCount === 'number' ? raw.unreadCount : 0,
      total: typeof raw?.total === 'number' ? raw.total : notifications.length,
      page: Number(raw?.page) || 1,
      limit: Number(raw?.limit) || 20,
      totalPages: Number(raw?.totalPages) || 1,
    };
  },

  markAsRead: async (id) => {
    const response = await api.patch(`/notifications/${id}/read`);
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await api.patch('/notifications/read-all');
    return response.data;
  },

  getPreferences: async () => {
    const response = await api.get('/notifications/preferences');
    return response.data;
  },

  updatePreferences: async (data) => {
    const response = await api.patch('/notifications/preferences', data);
    return response.data;
  },
};
