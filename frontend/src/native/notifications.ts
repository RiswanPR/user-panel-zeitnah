import {
  PushNotifications,
  Token,
  PushNotificationSchema,
  ActionPerformed,
} from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import api from '../services/api';
import storage from '../services/storage';

export type PushNotificationReceivedCallback = (notification: PushNotificationSchema) => void;
export type PushNotificationActionCallback = (action: ActionPerformed) => void;

class NativeNotificationService {
  private isNative: boolean;
  private pushToken: string | null = null;
  private receivedListeners: Set<PushNotificationReceivedCallback> = new Set();
  private actionListeners: Set<PushNotificationActionCallback> = new Set();

  constructor() {
    this.isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform();
  }

  /**
   * Request push notification permissions and register token with native APNs / FCM.
   */
  public async registerForPushNotifications(): Promise<string | null> {
    if (!this.isNative) {
      console.log('[NativeNotifications] Push notifications only available on native mobile platforms.');
      return null;
    }

    try {
      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.warn('[NativeNotifications] User denied push notification permissions.');
        return null;
      }

      // Register device with APNs / FCM
      await PushNotifications.register();

      // Listen for successful token registration
      PushNotifications.addListener('registration', async (token: Token) => {
        console.log('[NativeNotifications] Push registration token received:', token.value);
        this.pushToken = token.value;
        await this.syncPushTokenWithBackend(token.value);
      });

      // Listen for registration errors
      PushNotifications.addListener('registrationError', (error: any) => {
        console.error('[NativeNotifications] Push registration error:', error);
      });

      // Foreground notification listener
      PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
        console.log('[NativeNotifications] Push notification received in foreground:', notification);
        this.receivedListeners.forEach((cb) => cb(notification));
      });

      // Notification action / click listener (opens deep link or conversation)
      PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
        console.log('[NativeNotifications] Push notification action performed:', action);
        this.actionListeners.forEach((cb) => cb(action));
      });

      return this.pushToken;
    } catch (e) {
      console.error('[NativeNotifications] Failed to initialize push notifications:', e);
      return null;
    }
  }

  /**
   * Sync push token with Zeitnah LMS Backend API
   */
  public async syncPushTokenWithBackend(token?: string): Promise<boolean> {
    const pushToken = token || this.pushToken;
    const accessToken = storage.getAccessToken();

    if (!pushToken || !accessToken) {
      return false;
    }

    try {
      const deviceId = storage.getDeviceId();
      const platform = Capacitor.getPlatform() === 'ios' ? 'ios' : 'android';

      await api.post('/notifications/push-token', {
        deviceId,
        pushToken,
        platform,
      });

      console.log('[NativeNotifications] Push token successfully registered with backend.');
      return true;
    } catch (error) {
      console.warn('[NativeNotifications] Failed to sync push token with backend:', error);
      return false;
    }
  }

  /**
   * Unregister device push token upon logout
   */
  public async removePushTokenFromBackend(): Promise<boolean> {
    const accessToken = storage.getAccessToken();
    if (!accessToken) return true;

    try {
      const deviceId = storage.getDeviceId();
      await api.delete(`/notifications/push-token/${encodeURIComponent(deviceId)}`);
      console.log('[NativeNotifications] Push token unregistered from backend.');
      return true;
    } catch (error) {
      console.warn('[NativeNotifications] Failed to remove push token from backend:', error);
      return false;
    }
  }

  public getPushToken(): string | null {
    return this.pushToken;
  }

  public onNotificationReceived(callback: PushNotificationReceivedCallback): () => void {
    this.receivedListeners.add(callback);
    return () => {
      this.receivedListeners.delete(callback);
    };
  }

  public onNotificationAction(callback: PushNotificationActionCallback): () => void {
    this.actionListeners.add(callback);
    return () => {
      this.actionListeners.delete(callback);
    };
  }
}

export const nativeNotifications = new NativeNotificationService();
export default nativeNotifications;
