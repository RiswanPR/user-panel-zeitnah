import api from "./api";

/**
 * Dedicated service abstraction for Core Profile APIs.
 * Encapsulates personal account profile operations, avatar media management,
 * and student username identity workflows.
 */
export const coreProfileService = {
  /**
   * Fetches the current authenticated user's profile, including gamification telemetry
   * and time-limited pre-signed S3 avatar URL.
   */
  getMyProfile: async () => {
    const response = await api.get("/profile/me");
    return response.data;
  },

  /**
   * Updates core profile fields (name, bio, skills).
   * Automatically recalculates profile completion and awards milestone XP on the backend.
   *
   * @param {{ name?: string, bio?: string, skills?: string[] }} data
   */
  updateMyProfile: async (data) => {
    const response = await api.patch("/profile/update", data);
    return response.data;
  },

  /**
   * Uploads a new avatar image file (max 5MB, JPG/PNG/WebP).
   * Replaces the avatar in S3, triggers garbage collection of old avatar,
   * and returns the new signed URL.
   *
   * @param {File} file
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
   * Retrieves username status, claim state, and 14-day change cooldown information.
   */
  getUsernameStatus: async () => {
    const response = await api.get("/profile/username/status");
    return response.data;
  },

  /**
   * Checks candidate username validity and real-time availability.
   *
   * @param {string} username
   */
  checkUsernameAvailability: async (username) => {
    const response = await api.get("/profile/username/check", {
      params: { username },
    });
    return response.data;
  },

  /**
   * Initial claim of student handle for new or unverified users.
   *
   * @param {string} username
   */
  claimUsername: async (username) => {
    const response = await api.post("/profile/username/claim", { username });
    return response.data;
  },

  /**
   * Changes an existing claimed username (enforcing 14-day cooldown and uniqueness).
   *
   * @param {string} username
   */
  changeUsername: async (username) => {
    const response = await api.patch("/profile/username", { username });
    return response.data;
  },

  /**
   * Resolves a public student profile by handle (/profile/u/:username)
   * returning public fields only.
   *
   * @param {string} username
   */
  getPublicProfile: async (username) => {
    const response = await api.get(`/profile/u/${encodeURIComponent(username)}`);
    return response.data;
  },
};

export default coreProfileService;
