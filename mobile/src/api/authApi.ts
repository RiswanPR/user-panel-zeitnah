import { apiClient } from './axios';
import { ENDPOINTS } from './endpoints';
import { SendOtpPayload, VerifyOtpPayload, AuthResponse } from '../types/auth';

import { Platform } from 'react-native';

export const authApi = {
  sendOtp: async (payload: SendOtpPayload): Promise<void> => {
    await apiClient.post(ENDPOINTS.AUTH.SEND_OTP, payload);
  },

  verifyOtp: async (payload: VerifyOtpPayload): Promise<AuthResponse> => {
    const fullPayload = {
      ...payload,
      deviceId: payload.deviceId || 'mobile-device-id',
      deviceType: payload.deviceType || 'mobile',
      browser: payload.browser || 'app',
      os: payload.os || Platform.OS,
    };
    const response = await apiClient.post<AuthResponse>(ENDPOINTS.AUTH.VERIFY_OTP, fullPayload);
    return response.data;
  },

  getProfile: async () => {
    const response = await apiClient.get(ENDPOINTS.STUDENT.PROFILE);
    return response.data;
  }
};
