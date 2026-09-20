import api from './api';

export const skillsService = {
  async searchSkills(query) {
    const res = await api.get('/skills/search', { params: { q: query } });
    return res.data;
  },

  async getMySkills() {
    const res = await api.get('/skills/me');
    return res.data;
  },

  async addMySkill(data) {
    const res = await api.post('/skills/me', data);
    return res.data;
  },

  async removeMySkill(id) {
    const res = await api.delete(`/skills/me/${id}`);
    return res.data;
  },

  async getUserSkills(userId) {
    const res = await api.get(`/skills/user/${userId}`);
    return res.data;
  },
};

export default skillsService;
