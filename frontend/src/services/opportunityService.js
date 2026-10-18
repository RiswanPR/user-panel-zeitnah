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

  async updateStatus(id, status, deadline = null) {
    const payload = { status };
    if (deadline) {
      payload.deadline = typeof deadline === 'string' ? deadline : new Date(deadline).toISOString();
    }
    const res = await api.patch(`/opportunities/${id}/status`, payload);
    return res.data;
  },

  async updateOpportunityStatus(id, status, deadline = null) {
    return this.updateStatus(id, status, deadline);
  },

  async deleteOpportunity(id) {
    const res = await api.delete(`/opportunities/${id}`);
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

  async updateApplicationStatus(applicationId, status) {
    const res = await api.patch(`/opportunities/applications/${applicationId}/status`, { status });
    return res.data;
  },

  // =========================================================================
  // PHASE 8: CANDIDATE OPPORTUNITY INBOX & OUTREACH
  // =========================================================================

  async getCandidateInbox(tab = 'new', params = {}) {
    const queryParams =
      typeof tab === 'object' && tab !== null
        ? tab
        : { tab, ...params };
    const res = await api.get('/opportunities/inbox', { params: queryParams });
    return res.data;
  },

  async getCandidateOpportunityById(id) {
    const res = await api.get(`/opportunities/inbox/${id}`);
    return res.data;
  },

  async getInbox(params = {}) {
    return this.getCandidateInbox(params);
  },

  async getInboxUnreadCount() {
    const res = await api.get('/opportunities/inbox/unread-count');
    return res.data;
  },

  async getInboxDetail(id) {
    return this.getCandidateOpportunityById(id);
  },

  async markInterested(id) {
    const res = await api.post(`/opportunities/inbox/${id}/interested`);
    return res.data;
  },

  async declineOpportunity(id, data = {}) {
    const res = await api.post(`/opportunities/inbox/${id}/decline`, data);
    return res.data;
  },

  async archiveOpportunity(id) {
    const res = await api.post(`/opportunities/inbox/${id}/archive`);
    return res.data;
  },

  async sendOpportunity(data) {
    const res = await api.post('/opportunities/send', data);
    return res.data;
  },
};

export default opportunityService;


