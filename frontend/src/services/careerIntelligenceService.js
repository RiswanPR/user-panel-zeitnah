import api from './api';

export const careerIntelligenceService = {
  // 1. Overview & Profile Strength
  async getOverview() {
    const res = await api.get('/career-intelligence/overview');
    return res.data;
  },

  // 2. Role Alignments
  async getRoleAlignments() {
    const res = await api.get('/career-intelligence/role-alignment');
    return res.data;
  },

  // 3. Skill Gaps for Target Role
  async getSkillGaps(targetRole) {
    const res = await api.get('/career-intelligence/skill-gaps', {
      params: targetRole ? { targetRole } : {},
    });
    return res.data;
  },

  // 4. Career Pathways
  async getPathways(targetRole) {
    const res = await api.get('/career-intelligence/pathways', {
      params: targetRole ? { targetRole } : {},
    });
    return res.data;
  },

  // 5. Infrastructure Career Map
  async getCareerMap() {
    const res = await api.get('/career-intelligence/career-map');
    return res.data;
  },

  // 6. Aggregate Market Benchmarks
  async getMarketBenchmarks() {
    const res = await api.get('/career-intelligence/market-benchmarks');
    return res.data;
  },

  // 7. Profile Improvement Recommendations
  async getProfileRecommendations() {
    const res = await api.get('/career-intelligence/profile-recommendations');
    return res.data;
  },

  // 8. Configure Target Roles
  async setTargetRoles(data) {
    const res = await api.post('/career-intelligence/target-roles', data);
    return res.data;
  },

  // 9. AI Career Assistant Query
  async askAssistant(question) {
    const res = await api.post('/career-intelligence/assistant', { question });
    return res.data;
  },

  // 10. Force Refresh Insight
  async refreshInsight() {
    const res = await api.post('/career-intelligence/refresh');
    return res.data;
  },
};

export default careerIntelligenceService;
