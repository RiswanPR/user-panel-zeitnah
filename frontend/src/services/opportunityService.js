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

  async getBusinessJobs(orgId, status) {
    const res = await api.get(`/opportunities/business/${orgId}`, {
      params: { status },
    });
    return res.data;
  },

  async saveJob(id) {
    const res = await api.post(`/opportunities/${id}/save`);
    return res.data;
  },

  async unsaveJob(id) {
    const res = await api.delete(`/opportunities/${id}/save`);
    return res.data;
  },

  async getSavedJobs() {
    const res = await api.get('/opportunities/saved');
    return res.data;
  },

  async applyToJob(id, data) {
    const res = await api.post(`/opportunities/${id}/apply`, data);
    return res.data;
  },

  async withdrawApplication(applicationId) {
    const res = await api.patch(`/opportunities/applications/${applicationId}/withdraw`);
    return res.data;
  },

  async getMyApplications() {
    const res = await api.get('/opportunities/my/applications');
    return res.data;
  },

  async getJobApplications(jobId) {
    const res = await api.get(`/opportunities/${jobId}/applications`);
    return res.data;
  },
};

export default opportunityService;

