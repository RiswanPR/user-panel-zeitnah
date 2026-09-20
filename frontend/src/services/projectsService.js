import api from './api';

export const projectsService = {
  async getMyProjects() {
    const res = await api.get('/projects/my');
    return res.data;
  },

  async createProject(data) {
    const res = await api.post('/projects', data);
    return res.data;
  },

  async updateProject(id, data) {
    const res = await api.patch(`/projects/${id}`, data);
    return res.data;
  },

  async deleteProject(id) {
    const res = await api.delete(`/projects/${id}`);
    return res.data;
  },

  async getUserProjects(userId) {
    const res = await api.get(`/projects/user/${userId}`);
    return res.data;
  },
};

export default projectsService;
