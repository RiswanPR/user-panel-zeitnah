import { App, URLOpenListenerEvent } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

export type AppLifecycleCallback = (isActive: boolean) => void;
export type BackButtonHandler = () => boolean | Promise<boolean>; // return true if handled

interface PriorityHandler {
  priority: number;
  handler: BackButtonHandler;
}

class NativeAppService {
  private isNative: boolean;
  private lifecycleListeners: Set<AppLifecycleCallback> = new Set();
  private backHandlers: PriorityHandler[] = [];

  constructor() {
    this.isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform();
  }

  /**
   * Initializes native platform capabilities (status bar styling, splash screen hide, lifecycle hooks).
   */
  public async initialize(): Promise<void> {
    if (!this.isNative) return;

    try {
      // Configure dark status bar matching brand #070B14
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#070B14' });
    } catch (e) {
      console.warn('[NativeApp] StatusBar setup error:', e);
    }

    try {
      // Hide splash screen after app mount
      await SplashScreen.hide();
    } catch (e) {
      console.warn('[NativeApp] SplashScreen hide error:', e);
    }

    // App state change (background / foreground)
    App.addListener('appStateChange', ({ isActive }) => {
      console.log(`[NativeApp] App state changed: ${isActive ? 'active' : 'background'}`);
      this.lifecycleListeners.forEach((cb) => {
        try {
          cb(isActive);
        } catch (err) {
          console.error('[NativeApp] Lifecycle listener error:', err);
        }
      });
    });

    // Intelligent Hierarchical Hardware Back Button for Android
    App.addListener('backButton', async ({ canGoBack }) => {
      // 1. Check custom registered high-priority handlers (e.g. video player, modals)
      for (const item of [...this.backHandlers].sort((a, b) => b.priority - a.priority)) {
        try {
          const handled = await item.handler();
          if (handled) return;
        } catch (err) {
          console.error('[NativeApp] Back button handler error:', err);
        }
      }

      // 2. Check HTML5 / Fullscreen video
      if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
          return;
        } else if ((document as any).webkitExitFullscreen) {
          (document as any).webkitExitFullscreen();
          return;
        }
      }

      // 3. Check open modals/dialogs with close buttons
      const openModalCloseBtn = document.querySelector<HTMLButtonElement>('.modal-backdrop button[aria-label="Close"], .modal-backdrop button.modal-close');
      if (openModalCloseBtn) {
        openModalCloseBtn.click();
        return;
      }

      // 4. Standard SPA History Navigation
      const currentPath = window.location.pathname;
      const rootPaths = ['/', '/courses', '/dashboard', '/login', '/community'];

      if (canGoBack && !rootPaths.includes(currentPath)) {
        window.history.back();
      } else {
        // At root page: minimize app cleanly
        App.minimizeApp();
      }
    });
  }

  /**
   * Register a custom back-button handler (higher priority runs first).
   * Return true from handler if the back action was consumed.
   */
  public registerBackButtonHandler(priority: number, handler: BackButtonHandler): () => void {
    const item = { priority, handler };
    this.backHandlers.push(item);
    return () => {
      this.backHandlers = this.backHandlers.filter((h) => h !== item);
    };
  }

  /**
   * Register a callback for background/foreground lifecycle events
   */
  public onAppStateChange(callback: AppLifecycleCallback): () => void {
    this.lifecycleListeners.add(callback);
    return () => {
      this.lifecycleListeners.delete(callback);
    };
  }

  /**
   * Register a callback for deep link URL open events
   */
  public onAppUrlOpen(callback: (url: string) => void): () => void {
    if (!this.isNative) return () => {};

    const handle = App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
      callback(event.url);
    });

    return () => {
      handle.then((h) => h.remove());
    };
  }
}

export const nativeApp = new NativeAppService();
export default nativeApp;
