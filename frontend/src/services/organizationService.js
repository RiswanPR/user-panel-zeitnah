import api from './api';

export const organizationService = {
  async getOrganizations(params = {}) {
    const res = await api.get('/organizations', { params });
    return res.data;
  },

  async getOrganizationBySlug(slug) {
    const res = await api.get(`/organizations/${slug}`);
    return res.data;
  },

  async createOrganization(data) {
    const res = await api.post('/organizations', data);
    return res.data;
  },

  async updateOrganization(id, data) {
    const res = await api.patch(`/organizations/${id}`, data);
    return res.data;
  },

  async getMembers(id) {
    const res = await api.get(`/organizations/${id}/members`);
    return res.data;
  },

  async addMember(id, data) {
    const res = await api.post(`/organizations/${id}/members`, data);
    return res.data;
  },
};

export default organizationService;
