import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'zeitnah_access_token';
const REFRESH_TOKEN_KEY = 'zeitnah_refresh_token';
const USER_PROFILE_KEY = 'zeitnah_user_profile';

export const tokens = {
  getAccessToken: async () => {
    try {
      return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    } catch (e) {
      return null;
    }
  },
  setAccessToken: async (token: string) => {
    try {
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
    } catch (e) {
      console.error('Error saving access token', e);
    }
  },
  getRefreshToken: async () => {
    try {
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    } catch (e) {
      return null;
    }
  },
  setRefreshToken: async (token: string) => {
    try {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
    } catch (e) {
      console.error('Error saving refresh token', e);
    }
  },
  clearTokens: async () => {
    try {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_PROFILE_KEY);
    } catch (e) {
      console.error('Error clearing tokens', e);
    }
  },
  setUserProfile: async (profile: any) => {
    try {
      await SecureStore.setItemAsync(USER_PROFILE_KEY, JSON.stringify(profile));
    } catch (e) {
      console.error('Error saving user profile', e);
    }
  },
  getUserProfile: async () => {
    try {
      const data = await SecureStore.getItemAsync(USER_PROFILE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },
};
