import api from './api';

export const moderationService = {
  async blockUser(targetUserId) {
    const res = await api.post('/moderation/block', { targetUserId });
    return res.data;
  },

  async unblockUser(userId) {
    const res = await api.delete(`/moderation/block/${userId}`);
    return res.data;
  },

  async getBlockedUsers() {
    const res = await api.get('/moderation/blocks');
    return res.data;
  },

  async createReport(data) {
    const res = await api.post('/moderation/report', data);
    return res.data;
  },
};

export default moderationService;
