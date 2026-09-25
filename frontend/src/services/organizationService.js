import api from './api';

export const organizationService = {
  async getOrganizations(params = {}) {
    const res = await api.get('/organizations', { params });
    return res.data;
  },

  async getMyOrganizations() {
    const res = await api.get('/organizations/my');
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

  async resubmitOrganization(id) {
    const res = await api.patch(`/organizations/${id}/resubmit`);
    return res.data;
  },

  async getOrganizationsForAdmin(params = {}) {
    const res = await api.get('/organizations/admin/review', { params });
    return res.data;
  },

  async approveOrganization(id) {
    const res = await api.patch(`/organizations/admin/${id}/approve`);
    return res.data;
  },

  async rejectOrganization(id, reason) {
    const res = await api.patch(`/organizations/admin/${id}/reject`, { reason });
    return res.data;
  },

  async suspendOrganization(id, reason) {
    const res = await api.patch(`/organizations/admin/${id}/suspend`, { reason });
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

