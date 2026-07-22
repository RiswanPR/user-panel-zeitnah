import { UAParser } from "ua-parser-js";
import { isMobile, isTablet, isDesktop, deviceType, osName, osVersion } from "react-device-detect";

export interface DiagnosticData {
  browser: any;
  network: any;
  application: any;
  authentication: any;
  device: any;
  performance: any;
  error?: any;
  video?: any;
  feedback?: {
    whatHappened: string;
    whatTryingToDo: string;
    reproducible: string;
  };
  screenshotUrl?: string;
  correlationId?: string;
}

// Store Web Vitals globally
let webVitals: any = {};
if (typeof window !== "undefined") {
  import("web-vitals").then(({ onCLS, onFCP, onLCP, onTTFB, onINP }) => {
    onCLS((metric: any) => (webVitals.cls = metric.value));
    onFCP((metric: any) => (webVitals.fcp = metric.value));
    onLCP((metric: any) => (webVitals.lcp = metric.value));
    onTTFB((metric: any) => (webVitals.ttfb = metric.value));
    onINP((metric: any) => (webVitals.inp = metric.value));
  });
}

const safeParseJwt = (token: string | null) => {
  if (!token) return null;
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

export const collectDiagnostics = async (
  errorObj?: Error | null,
  componentStack?: string | null
): Promise<DiagnosticData> => {
  const parser = new UAParser();
  const browser = parser.getBrowser();
  const engine = parser.getEngine();

  // 1. Browser Info
  const browserInfo = {
    name: browser.name || "Unknown",
    version: browser.version || "Unknown",
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    cookiesEnabled: navigator.cookieEnabled,
    localStorageEnabled: !!window.localStorage,
    sessionStorageEnabled: !!window.sessionStorage,
    indexedDBAvailability: !!window.indexedDB,
    touchSupport: "ontouchstart" in window || navigator.maxTouchPoints > 0,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    viewportSize: `${window.innerWidth}x${window.innerHeight}`,
    pixelRatio: window.devicePixelRatio,
    engine: engine.name,
  };

  // 2. Network Info
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  const networkInfo = {
    online: navigator.onLine,
    type: connection?.type || "unknown",
    effectiveType: connection?.effectiveType || "unknown",
    downlink: connection?.downlink || 0,
    rtt: connection?.rtt || 0,
    saveData: connection?.saveData || false,
  };

  // 3. Application Info
  const performanceObj = window.performance;
  const navTiming = performanceObj?.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
  
  const appInfo = {
    frontendVersion: import.meta.env.VITE_APP_VERSION || "1.0.0",
    environment: (import.meta.env as any).MODE,
    currentUrl: window.location.href,
    pathname: window.location.pathname,
    timestamp: new Date().toISOString(),
    timeSincePageLoaded: navTiming ? Date.now() - navTiming.startTime : 0,
    sessionDuration: window.sessionStorage.getItem("sessionStart") 
      ? Date.now() - parseInt(window.sessionStorage.getItem("sessionStart")!) 
      : 0,
  };

  // 4. Authentication (Scrubbed)
  const token = localStorage.getItem("token");
  const decoded = safeParseJwt(token);
  const authInfo = {
    status: !!token ? "Authenticated" : "Unauthenticated",
    userId: decoded?.userId || decoded?.sub || "Unknown",
    role: decoded?.role || "Unknown",
    email: decoded?.email || "Unknown",
  };

  // 5. Device Info
  const devInfo = {
    manufacturer: parser.getDevice().vendor || "Unknown",
    model: parser.getDevice().model || "Unknown",
    type: deviceType,
    os: osName,
    osVersion: osVersion,
    isMobile,
    isTablet,
    isDesktop,
    memoryEstimate: (navigator as any).deviceMemory || "Unknown",
    cpuCores: navigator.hardwareConcurrency || "Unknown",
    preferredTheme: window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
  };

  // 6. Performance Info
  let memoryUsage = {};
  if ((performanceObj as any).memory) {
    const mem = (performanceObj as any).memory;
    memoryUsage = {
      jsHeapSizeLimit: mem.jsHeapSizeLimit,
      totalJSHeapSize: mem.totalJSHeapSize,
      usedJSHeapSize: mem.usedJSHeapSize,
    };
  }

  const perfInfo = {
    memoryUsage,
    pageLoadTime: navTiming ? navTiming.loadEventEnd - navTiming.startTime : 0,
    vitals: webVitals,
  };

  // 7. Error Details
  let errorDetails = null;
  if (errorObj) {
    errorDetails = {
      name: errorObj.name,
      message: errorObj.message,
      stack: errorObj.stack,
      componentStack,
    };
  }

  return {
    browser: browserInfo,
    network: networkInfo,
    application: appInfo,
    authentication: authInfo,
    device: devInfo,
    performance: perfInfo,
    error: errorDetails,
  };
};
