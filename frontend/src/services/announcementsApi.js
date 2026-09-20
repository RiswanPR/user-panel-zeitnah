import api from './api';

export const announcementsApi = {
  getPlatformAnnouncements: async () => {
    const response = await api.get('/announcements/platform');
    return response.data;
  },

  dismissAnnouncement: async (id) => {
    const response = await api.post(`/announcements/platform/${id}/dismiss`);
    return response.data;
  },
};
