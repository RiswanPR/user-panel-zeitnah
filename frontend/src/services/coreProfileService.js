import api from "./api";

/**
 * Dedicated service abstraction for Core Profile APIs.
 * Encapsulates personal student account operations, background banner,
 * experience, education, certifications, recommendations, and public profile workflows.
 */
export const coreProfileService = {
  /**
   * Fetches current authenticated user profile with authoritative completion metrics,
   * signed avatar, signed background banner, and gamification stats.
   */
  getMyProfile: async () => {
    const response = await api.get("/profile/me");
    return response.data;
  },

  /**
   * Updates core profile fields (name, headline, currentRole, location, industry, bio, skills).
   * Automatically triggers authoritative milestone evaluation on the backend.
   */
  updateMyProfile: async (data) => {
    const response = await api.patch("/profile/update", data);
    return response.data;
  },

  /**
   * Uploads avatar image file (max 5MB, JPG/PNG/WebP).
   */
  uploadAvatar: async (file) => {
    const formData = new FormData();
    formData.append("avatar", file);
    const response = await api.post("/profile/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  /**
   * Uploads custom background cover banner (max 5MB, JPG/PNG/WebP).
   */
  uploadBackground: async (file) => {
    const formData = new FormData();
    formData.append("background", file);
    const response = await api.post("/profile/background", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  /**
   * Removes custom background cover banner.
   */
  removeBackground: async () => {
    const response = await api.delete("/profile/background");
    return response.data;
  },

  // =========================================================================
  // EXPERIENCE SUBDOCUMENT CRUD
  // =========================================================================

  addExperience: async (data) => {
    const response = await api.post("/profile/experience", data);
    return response.data;
  },

  updateExperience: async (id, data) => {
    const response = await api.put(`/profile/experience/${id}`, data);
    return response.data;
  },

  deleteExperience: async (id) => {
    const response = await api.delete(`/profile/experience/${id}`);
    return response.data;
  },

  // =========================================================================
  // EDUCATION SUBDOCUMENT CRUD
  // =========================================================================

  addEducation: async (data) => {
    const response = await api.post("/profile/education", data);
    return response.data;
  },

  updateEducation: async (id, data) => {
    const response = await api.put(`/profile/education/${id}`, data);
    return response.data;
  },

  deleteEducation: async (id) => {
    const response = await api.delete(`/profile/education/${id}`);
    return response.data;
  },

  // =========================================================================
  // CERTIFICATIONS SUBDOCUMENT CRUD
  // =========================================================================

  addCertification: async (data) => {
    const response = await api.post("/profile/certifications", data);
    return response.data;
  },

  updateCertification: async (id, data) => {
    const response = await api.put(`/profile/certifications/${id}`, data);
    return response.data;
  },

  deleteCertification: async (id) => {
    const response = await api.delete(`/profile/certifications/${id}`);
    return response.data;
  },

  // =========================================================================
  // PUBLIC PROFILE PUBLISH STATE
  // =========================================================================

  setPublicProfilePublishState: async (published) => {
    const response = await api.post("/profile/public/publish", { published });
    return response.data;
  },

  // =========================================================================
  // RECOMMENDATIONS
  // =========================================================================

  getRecommendations: async () => {
    const response = await api.get("/profile/recommendations");
    return response.data;
  },

  submitRecommendation: async (data) => {
    const response = await api.post("/profile/recommendations", data);
    return response.data;
  },

  updateRecommendationStatus: async (id, status) => {
    const response = await api.patch(`/profile/recommendations/${id}/status`, { status });
    return response.data;
  },

  deleteRecommendation: async (id) => {
    const response = await api.delete(`/profile/recommendations/${id}`);
    return response.data;
  },

  // =========================================================================
  // USERNAME IDENTITY
  // =========================================================================

  getUsernameStatus: async () => {
    const response = await api.get("/profile/username/status");
    return response.data;
  },

  checkUsernameAvailability: async (username) => {
    const response = await api.get("/profile/username/check", {
      params: { username },
    });
    return response.data;
  },

  claimUsername: async (username) => {
    const response = await api.post("/profile/username/claim", { username });
    return response.data;
  },

  changeUsername: async (username) => {
    const response = await api.patch("/profile/username", { username });
    return response.data;
  },

  getPublicProfile: async (username) => {
    const response = await api.get(`/profile/u/${encodeURIComponent(username)}`);
    return response.data;
  },
};

export default coreProfileService;
