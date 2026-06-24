export interface User {
  id: string;
  email: string;
  name: string;
  mobile?: string;
  profileImage?: string;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  message?: string;
  sessionExpiresAt?: string;
}

export interface SendOtpPayload {
  email: string;
}

export interface VerifyOtpPayload {
  email: string;
  otp: string;
  deviceId?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
}
