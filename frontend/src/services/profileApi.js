import api from './api';

export const profileApi = {
  // ── Profile ──
  getMyProfile: async () => {
    const response = await api.get('/community/profile/me');
    return response.data;
  },

  getProfileByUsername: async (username) => {
    const response = await api.get(`/community/profile/${username}`);
    return response.data;
  },

  updateProfile: async (data) => {
    const response = await api.patch('/community/profile', data);
    return response.data;
  },

  // ── Skills ──
  addSkill: async (data) => {
    const response = await api.post('/community/profile/skills', data);
    return response.data;
  },

  updateSkill: async (id, data) => {
    const response = await api.patch(`/community/profile/skills/${id}`, data);
    return response.data;
  },

  deleteSkill: async (id) => {
    const response = await api.delete(`/community/profile/skills/${id}`);
    return response.data;
  },

  // ── Projects ──
  addProject: async (data) => {
    const response = await api.post('/community/profile/projects', data);
    return response.data;
  },

  getProjects: async (userId) => {
    const response = await api.get(`/community/profile/projects/${userId}`);
    return response.data;
  },

  updateProject: async (id, data) => {
    const response = await api.patch(`/community/profile/projects/${id}`, data);
    return response.data;
  },

  deleteProject: async (id) => {
    const response = await api.delete(`/community/profile/projects/${id}`);
    return response.data;
  },

  // ── Experience ──
  addExperience: async (data) => {
    const response = await api.post('/community/profile/experience', data);
    return response.data;
  },

  updateExperience: async (id, data) => {
    const response = await api.patch(`/community/profile/experience/${id}`, data);
    return response.data;
  },

  deleteExperience: async (id) => {
    const response = await api.delete(`/community/profile/experience/${id}`);
    return response.data;
  },

  // ── Education ──
  addEducation: async (data) => {
    const response = await api.post('/community/profile/education', data);
    return response.data;
  },

  updateEducation: async (id, data) => {
    const response = await api.patch(`/community/profile/education/${id}`, data);
    return response.data;
  },

  deleteEducation: async (id) => {
    const response = await api.delete(`/community/profile/education/${id}`);
    return response.data;
  },

  // ── Certificates ──
  addCertificate: async (data) => {
    const response = await api.post('/community/profile/certificates', data);
    return response.data;
  },

  getCertificates: async (userId) => {
    const response = await api.get(`/community/profile/certificates/${userId}`);
    return response.data;
  },

  updateCertificate: async (id, data) => {
    const response = await api.patch(
      `/community/profile/certificates/${id}`,
      data,
    );
    return response.data;
  },

  deleteCertificate: async (id) => {
    const response = await api.delete(`/community/profile/certificates/${id}`);
    return response.data;
  },

  // ── Resume & File Uploads ──
  uploadResume: async (formData) => {
    const response = await api.post('/community/profile/resume', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  deleteResume: async () => {
    const response = await api.delete('/community/profile/resume');
    return response.data;
  },

  uploadAvatar: async (formData) => {
    const response = await api.post('/community/profile/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  uploadCover: async (formData) => {
    const response = await api.post('/community/profile/cover', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  uploadMedia: async (formData) => {
    const response = await api.post('/community/profile/media', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // ── Follow System ──
  followUser: async (userId) => {
    const response = await api.post(`/community/profile/follow/${userId}`);
    return response.data;
  },

  unfollowUser: async (userId) => {
    const response = await api.delete(`/community/profile/follow/${userId}`);
    return response.data;
  },

  getFollowers: async (userId, page = 1, limit = 20) => {
    const response = await api.get(
      `/community/profile/followers/${userId}?page=${page}&limit=${limit}`,
    );
    return response.data;
  },

  getFollowing: async (userId, page = 1, limit = 20) => {
    const response = await api.get(
      `/community/profile/following/${userId}?page=${page}&limit=${limit}`,
    );
    return response.data;
  },
};
