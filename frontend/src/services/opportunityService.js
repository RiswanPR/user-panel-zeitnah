import api from './api';

export const opportunityService = {
  async getOpportunities(params = {}) {
    const res = await api.get('/opportunities', { params });
    return res.data;
  },

  async getOpportunityById(id) {
    const res = await api.get(`/opportunities/${id}`);
    return res.data;
  },

  async createOpportunity(data) {
    const res = await api.post('/opportunities', data);
    return res.data;
  },

  async updateOpportunity(id, data) {
    const res = await api.patch(`/opportunities/${id}`, data);
    return res.data;
  },

  async updateStatus(id, status) {
    const res = await api.patch(`/opportunities/${id}/status`, { status });
    return res.data;
  },
};

export default opportunityService;
