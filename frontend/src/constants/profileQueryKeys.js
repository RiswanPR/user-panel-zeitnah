/**
 * Centralized React Query cache key definitions for Zeitnah Profile subsystem.
 * Ensures consistent cache invalidation across Overview, Studio, and Public views.
 */
export const PROFILE_QUERY_KEYS = {
  ME: ["profile", "me"],
  COMPLETION: ["myProfileCompletion"],
  PROJECTS_MY: ["projects", "my"],
  RECOMMENDATIONS_MY: ["profile", "recommendations"],
  PUBLIC_PROFILE: (username) => ["profile", "public", username],
  TAXONOMY: ["profile", "taxonomy"],
  CATALOGUE: ["profile", "catalogue"],
  USERNAME_STATUS: ["profile", "username", "status"],
  // Legacy aliases for backward compatibility with external handlers
  MY_PROFILE_LEGACY: ["myProfile"],
  MY_PROJECTS_LEGACY: ["myProjects"],
  MY_RECOMMENDATIONS_LEGACY: ["myRecommendations"],
};

export default PROFILE_QUERY_KEYS;
