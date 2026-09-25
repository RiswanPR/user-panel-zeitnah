import api from './api';

export const matchingService = {
  // Trigger AI matching for a published job
  async triggerMatching(jobId) {
    const res = await api.post(`/matching/jobs/${jobId}/trigger`);
    return res.data;
  },

  // Get recommended talent for a job
  async getRecommendedTalent(jobId, params = {}) {
    const res = await api.get(`/matching/jobs/${jobId}/talent`, { params });
    return res.data;
  },

  // Get match summary for a job (dashboard counts)
  async getJobMatchSummary(jobId) {
    const res = await api.get(`/matching/jobs/${jobId}/summary`);
    return res.data;
  },

  // Send opportunity invite to a candidate
  async sendOpportunityInvite(jobId, candidateUserId, message = '') {
    const res = await api.post(`/matching/jobs/${jobId}/invite`, {
      candidateUserId,
      message,
    });
    return res.data;
  },

  // Candidate: Get my received invites
  async getMyInvites() {
    const res = await api.get('/matching/invites/my');
    return res.data;
  },

  // Candidate: Mark invite as viewed
  async markInviteViewed(inviteId) {
    const res = await api.patch(`/matching/invites/${inviteId}/view`);
    return res.data;
  },

  // Candidate: Respond to an invite
  async respondToInvite(inviteId, response) {
    const res = await api.patch(`/matching/invites/${inviteId}/respond`, {
      response,
    });
    return res.data;
  },

  // Recruiter: Search talent
  async searchTalent(orgId, params = {}) {
    const res = await api.get('/matching/talent/search', {
      params: { orgId, ...params },
    });
    return res.data;
  },

  // Recruiter: Toggle save candidate
  async toggleSaveCandidate(jobId, candidateUserId) {
    const res = await api.post(`/matching/jobs/${jobId}/candidates/${candidateUserId}/save`);
    return res.data;
  },

  // Recruiter: Dismiss / remove candidate from recommendations
  async dismissCandidate(jobId, candidateUserId) {
    const res = await api.post(`/matching/jobs/${jobId}/candidates/${candidateUserId}/dismiss`);
    return res.data;
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 4: CANDIDATE "JOBS FOR YOU" API
  // ═══════════════════════════════════════════════════════════════════════════

  // Candidate: Get personalized "Jobs For You"
  async getRecommendedJobs(params = {}) {
    const res = await api.get('/matching/recommended-jobs', { params });
    return res.data;
  },

  // Candidate: Refresh personalized recommendations
  async refreshRecommendedJobs() {
    const res = await api.post('/matching/recommended-jobs/refresh');
    return res.data;
  },

  // Candidate: Get "Why this job matches" structured explanation
  async getJobRecommendationExplanation(jobId) {
    const res = await api.get(`/matching/recommended-jobs/${jobId}/explanation`);
    return res.data;
  },

  // Candidate: Get career profile insights & improvement advice
  async getProfileJobInsights() {
    const res = await api.get('/matching/profile-job-insights');
    return res.data;
  },

  // Candidate: Hide a recommended job
  async hideRecommendedJob(jobId) {
    const res = await api.post(`/matching/recommended-jobs/${jobId}/hide`);
    return res.data;
  },

  // Candidate: Dismiss a recommended job
  async dismissRecommendedJob(jobId) {
    const res = await api.post(`/matching/recommended-jobs/${jobId}/dismiss`);
    return res.data;
  },

  // Candidate: Record feedback (INTERESTED | NOT_INTERESTED)
  async recordJobFeedback(jobId, feedback) {
    const res = await api.post(`/matching/recommended-jobs/${jobId}/feedback`, {
      feedback,
    });
    return res.data;
  },
};

export default matchingService;

