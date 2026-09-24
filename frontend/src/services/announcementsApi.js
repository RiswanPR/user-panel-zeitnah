import api from './api';

export const announcementsApi = {
  getPlatformAnnouncements: async () => {
    const response = await api.get('/announcements/platform');
    return response.data;
  },

  getAnnouncementById: async (id) => {
    const response = await api.get(`/announcements/${id}`);
    return response.data;
  },

  dismissAnnouncement: async (id) => {
    const response = await api.post(`/announcements/platform/${id}/dismiss`);
    return response.data;
  },

  acknowledgeAnnouncement: async (id) => {
    const response = await api.post(`/announcements/platform/${id}/acknowledge`);
    return response.data;
  },
};

export default announcementsApi;
