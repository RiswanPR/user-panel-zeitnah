// Injection token for the ioredis client instance
export const REDIS_CLIENT = 'REDIS_CLIENT';

// Key prefix constants for namespacing Redis keys
export const OTP_PREFIX = 'otp:';

// Default OTP TTL in seconds (3 minutes)
export const OTP_TTL_SECONDS = 180;
