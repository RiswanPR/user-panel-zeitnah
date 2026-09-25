import api from './api';

export const portfolioService = {
  /**
   * Get current authenticated user's portfolio.
   */
  async getMyPortfolio() {
    const res = await api.get('/profile/portfolio');
    return res.data;
  },

  /**
   * Get public portfolio of any user by username.
   */
  async getPublicPortfolio(username) {
    const res = await api.get(`/profile/portfolio/u/${encodeURIComponent(username)}`);
    return res.data;
  },

  /**
   * Update portfolio settings (headline, bio, featured skills, featured software, sections visibility, publish state).
   */
  async updatePortfolio(data) {
    const res = await api.patch('/profile/portfolio', data);
    return res.data;
  },

  /**
   * Upload candidate resume (PDF).
   */
  async uploadResume(file) {
    const formData = new FormData();
    formData.append('resume', file);
    const res = await api.post('/profile/portfolio/resume', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  /**
   * Delete resume.
   */
  async deleteResume() {
    const res = await api.delete('/profile/portfolio/resume');
    return res.data;
  },

  /**
   * Get authorized resume download URL.
   */
  async getResumeDownloadUrl(userId) {
    const res = await api.get(`/profile/portfolio/resume/${userId}/download`);
    return res.data;
  },

  /**
   * Upload media file (photo, drawing, BOQ, presentation) for project / portfolio.
   */
  async uploadMedia(file, metadata = {}) {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata.projectId) formData.append('projectId', metadata.projectId);
    if (metadata.name) formData.append('name', metadata.name);
    if (metadata.caption) formData.append('caption', metadata.caption);
    if (metadata.visibility) formData.append('visibility', metadata.visibility);

    const res = await api.post('/profile/portfolio/media', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  /**
   * Delete media item.
   */
  async deleteMedia(mediaId, projectId) {
    const res = await api.delete(`/profile/portfolio/media/${mediaId}`, {
      params: { projectId },
    });
    return res.data;
  },

  // =========================================================================
  // VERIFICATION CENTER
  // =========================================================================

  /**
   * Get verification center overview, category statuses, and audit history.
   */
  async getVerificationCenter() {
    const res = await api.get('/profile/verification');
    return res.data;
  },

  /**
   * Submit verification request with private evidence documents.
   */
  async submitVerificationRequest(data, files = []) {
    const formData = new FormData();
    formData.append('category', data.category);
    if (data.documentType) formData.append('documentType', data.documentType);
    if (data.documentNumber) formData.append('documentNumber', data.documentNumber);
    if (data.organizationName) formData.append('organizationName', data.organizationName);
    if (data.notes) formData.append('notes', data.notes);

    if (files && files.length > 0) {
      files.forEach((f) => {
        formData.append('evidence', f);
      });
    }

    const res = await api.post('/profile/verification/request', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  /**
   * Get private verification evidence download URL (candidate owner or admin).
   */
  async getEvidenceDownloadUrl(requestId, fileId) {
    const res = await api.get(`/profile/verification/evidence/${requestId}/${fileId}`);
    return res.data;
  },

  /**
   * Administrator review for verification request.
   */
  async adminReviewVerification(requestId, reviewData) {
    const res = await api.post(`/profile/verification/admin/review/${requestId}`, reviewData);
    return res.data;
  },
};

export default portfolioService;
