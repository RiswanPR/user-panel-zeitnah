const Capacitor = {
  isNativePlatform: () => typeof window !== 'undefined' && Boolean((window as any).Capacitor?.isNativePlatform?.()),
};
const Network = typeof window !== 'undefined' && (window as any).Capacitor?.Plugins?.Network ? (window as any).Capacitor.Plugins.Network : {
  addListener: () => Promise.resolve({ remove: () => {} }),
  getStatus: async () => ({ connected: typeof navigator !== 'undefined' ? navigator.onLine : true, connectionType: 'wifi' }),
};
export type ConnectionStatus = { connected: boolean; connectionType: string };

export type NetworkStatusCallback = (isOnline: boolean, connectionType: string) => void;

class NativeNetworkService {
  private isNative: boolean;
  private listeners: Set<NetworkStatusCallback> = new Set();
  private isOnline: boolean = true;
  private connectionType: string = 'unknown';

  constructor() {
    this.isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform();
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.notify(true, 'wifi'));
      window.addEventListener('offline', () => this.notify(false, 'none'));
    }

    if (this.isNative) {
      Network.addListener('networkStatusChange', (status: ConnectionStatus) => {
        this.notify(status.connected, status.connectionType);
      });
      Network.getStatus().then((status: any) => {
        this.isOnline = status.connected;
        this.connectionType = status.connectionType;
      });
    }
  }

  private notify(connected: boolean, type: string) {
    this.isOnline = connected;
    this.connectionType = type;
    this.listeners.forEach((cb) => {
      try {
        cb(connected, type);
      } catch (e) {
        console.error('[NativeNetwork] Status listener error:', e);
      }
    });
  }

  public getStatus(): { isOnline: boolean; connectionType: string } {
    return {
      isOnline: this.isOnline,
      connectionType: this.connectionType,
    };
  }

  public onNetworkChange(callback: NetworkStatusCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }
}

export const nativeNetwork = new NativeNetworkService();
export default nativeNetwork;
