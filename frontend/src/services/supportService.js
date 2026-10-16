import api from './api';

export const supportService = {
  /**
   * Submits a customer support ticket to the Zeitnah LMS backend.
   * Endpoint: POST /api/support/ticket
   */
  submitTicket: async (ticketData) => {
    const response = await api.post('/support/ticket', ticketData);
    return response.data;
  },
};

export default supportService;
