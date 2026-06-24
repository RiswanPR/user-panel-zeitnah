import { create } from 'zustand';
import { User, SendOtpPayload, VerifyOtpPayload } from '../types/auth';
import { authApi } from '../api/authApi';
import { tokens } from '../utils/secureStore';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitializing: boolean;
  sendOtp: (payload: SendOtpPayload) => Promise<void>;
  verifyOtp: (payload: VerifyOtpPayload) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitializing: true,

  sendOtp: async (payload) => {
    set({ isLoading: true });
    try {
      await authApi.sendOtp(payload);
      set({ isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  verifyOtp: async (payload) => {
    set({ isLoading: true });
    try {
      const response = await authApi.verifyOtp(payload);
      // Backend returns accessToken and refreshToken at the root of the response, not inside a tokens object
      await tokens.setAccessToken(response.accessToken);
      await tokens.setRefreshToken(response.refreshToken);
      await tokens.setUserProfile(response.user);
      
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      // If we had a logout endpoint:
      // await authApi.logout();
    } finally {
      await tokens.clearTokens();
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  checkSession: async () => {
    try {
      const accessToken = await tokens.getAccessToken();
      const userProfile = await tokens.getUserProfile();
      
      if (accessToken && userProfile) {
        set({
          user: userProfile,
          isAuthenticated: true,
          isInitializing: false,
        });
      } else {
        set({
          isInitializing: false,
          isAuthenticated: false,
        });
      }
    } catch (error) {
      set({
        isInitializing: false,
        isAuthenticated: false,
      });
    }
  },
}));
