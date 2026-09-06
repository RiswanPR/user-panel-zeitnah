/**
 * ZEITNAH LMS — CANONICAL STORAGE & DEVICE ABSTRACTION
 *
 * Provides a unified, platform-agnostic storage and device identification interface
 * supporting:
 *  1. Modern Web (localStorage + in-memory cache)
 *  2. Native Mobile / Capacitor (WKWebView / Android WebView persistence bridge)
 */

import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

export interface BrowserFingerprint {
  userAgent: string;
  language: string;
  platform: string;
  screenResolution: string;
  timezone: string;
}

const STORAGE_KEYS = {
  TOKEN: 'token',
  REFRESH_TOKEN: 'refreshToken',
  SESSION_EXPIRES_AT: 'sessionExpiresAt',
  DEVICE_ID: 'device_id',
  APP_VERSION: 'app_version',
  USER: 'user',
  LOGIN_EMAIL: 'login_email',
  REGISTER_NAME: 'register_name',
  REGISTER_EMAIL: 'register_email',
} as const;

// Synchronous in-memory cache for ultra-fast access in axios interceptors
const memoryCache = new Map<string, string>();

class StorageService {
  private isBrowser: boolean;
  private isNative: boolean;

  constructor() {
    this.isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    this.isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform();

    if (this.isBrowser) {
      try {
        // Pre-populate memory cache from available storage
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key) {
            const val = window.localStorage.getItem(key);
            if (val !== null) memoryCache.set(key, val);
          }
        }
      } catch (e) {
        console.warn('[StorageService] LocalStorage pre-warm failed:', e);
      }
    }

    // Pre-warm memory cache from Native Preferences asynchronously
    if (this.isNative) {
      this.initNativeCache();
    }
  }

  private async initNativeCache(): Promise<void> {
    try {
      const { keys } = await Preferences.keys();
      for (const key of keys) {
        const { value } = await Preferences.get({ key });
        if (value !== null) {
          memoryCache.set(key, value);
        }
      }
    } catch (e) {
      console.warn('[StorageService] Native Preferences pre-warm failed:', e);
    }
  }

  // ── Generic Key-Value Operations ──

  public getItem(key: string): string | null {
    if (memoryCache.has(key)) {
      return memoryCache.get(key) || null;
    }
    if (this.isBrowser) {
      try {
        const val = window.localStorage.getItem(key);
        if (val !== null) memoryCache.set(key, val);
        return val;
      } catch {
        return null;
      }
    }
    return null;
  }

  public setItem(key: string, value: string): void {
    memoryCache.set(key, value);
    if (this.isBrowser) {
      try {
        window.localStorage.setItem(key, value);
      } catch (e) {
        console.warn(`[StorageService] Failed to set ${key} in localStorage:`, e);
      }
    }
    if (this.isNative) {
      Preferences.set({ key, value }).catch((e) => {
        console.warn(`[StorageService] Failed to set ${key} in Preferences:`, e);
      });
    }
  }

  public removeItem(key: string): void {
    memoryCache.delete(key);
    if (this.isBrowser) {
      try {
        window.localStorage.removeItem(key);
      } catch (e) {
        console.warn(`[StorageService] Failed to remove ${key} from localStorage:`, e);
      }
    }
    if (this.isNative) {
      Preferences.remove({ key }).catch((e) => {
        console.warn(`[StorageService] Failed to remove ${key} from Preferences:`, e);
      });
    }
  }

  // ── Token Management ──

  public getAccessToken(): string | null {
    return this.getItem(STORAGE_KEYS.TOKEN);
  }

  public setAccessToken(token: string): void {
    this.setItem(STORAGE_KEYS.TOKEN, token);
  }

  public removeAccessToken(): void {
    this.removeItem(STORAGE_KEYS.TOKEN);
  }

  public getRefreshToken(): string | null {
    return this.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  }

  public setRefreshToken(token: string): void {
    this.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
  }

  public removeRefreshToken(): void {
    this.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  }

  public getSessionExpiresAt(): string | null {
    return this.getItem(STORAGE_KEYS.SESSION_EXPIRES_AT);
  }

  public setSessionExpiresAt(expiresAt: string): void {
    this.setItem(STORAGE_KEYS.SESSION_EXPIRES_AT, expiresAt);
  }

  public removeSessionExpiresAt(): void {
    this.removeItem(STORAGE_KEYS.SESSION_EXPIRES_AT);
  }

  /** Clear all session authentication tokens safely */
  public clearAuth(): void {
    this.removeAccessToken();
    this.removeRefreshToken();
    this.removeSessionExpiresAt();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('zeitnah:auth:logout'));
    }
  }

  // ── Canonical Device Identification ──

  /**
   * Resolves or generates a persistent device UUID.
   * Ensures the exact same device ID persists across reboots, tab refreshes,
   * and mobile WebView lifecycles.
   */
  public async getDeviceId(): Promise<string> {
    let deviceId = this.getItem(STORAGE_KEYS.DEVICE_ID);
    if (deviceId && deviceId.trim()) {
      return deviceId.trim();
    }

    if (this.isNative) {
      try {
        const { value } = await Preferences.get({ key: STORAGE_KEYS.DEVICE_ID });
        if (value && value.trim()) {
          memoryCache.set(STORAGE_KEYS.DEVICE_ID, value.trim());
          return value.trim();
        }
      } catch (e) {
        console.warn('[StorageService] Error reading deviceId from Preferences:', e);
      }
    }

    // Fallback: Generate stable SHA-256 device identifier
    try {
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown-ua';
      const screenRes = typeof window !== 'undefined' && window.screen
        ? `${window.screen.width}x${window.screen.height}`
        : '0x0';
      const timezone = typeof Intl !== 'undefined'
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : 'UTC';
      const language = typeof navigator !== 'undefined' ? navigator.language : 'en';
      const entropy = Math.random().toString(36).substring(2, 10);

      const rawString = `${userAgent}:::${screenRes}:::${timezone}:::${language}:::${entropy}:::${Date.now()}`;

      if (typeof crypto !== 'undefined' && crypto.subtle) {
        const msgBuffer = new TextEncoder().encode(rawString);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
        deviceId = `dev_${hashHex.substring(0, 16)}`;
      } else {
        deviceId = `dev_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
      }
    } catch {
      deviceId = `dev_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
    }

    this.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
    return deviceId;
  }

  public setDeviceId(id: string): void {
    this.setItem(STORAGE_KEYS.DEVICE_ID, id);
  }

  /**
   * Retrieves high-fidelity device fingerprint metadata for backend telemetry
   */
  public getBrowserFingerprint(): BrowserFingerprint {
    if (typeof window === 'undefined') {
      return {
        userAgent: 'SSR',
        language: 'en',
        platform: 'Server',
        screenResolution: '0x0',
        timezone: 'UTC',
      };
    }

    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform || 'Unknown',
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }
}

export const storage = new StorageService();
export default storage;

// Canonical device helpers exported for backward compatibility
export const getDeviceId = () => storage.getDeviceId();
export const getPersistentDeviceId = () => storage.getDeviceId();
export const getBrowserFingerprint = () => storage.getBrowserFingerprint();
