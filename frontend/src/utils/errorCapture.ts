/**
 * Global Error Capture Utility
 * 
 * Intercepts console.error, console.warn, window.onerror, and
 * unhandled promise rejections. Stores them in a ring buffer
 * (max 50 entries) for use in troubleshoot reports.
 * 
 * console.warn is stored in a separate buffer and NOT counted
 * towards the visible error count to prevent inflating the
 * troubleshoot badge for minor warnings.
 */

const MAX_BUFFER_SIZE = 50;

// Error buffers — warnings are separated from real errors
const consoleErrors: any[] = [];
const consoleWarnings: any[] = [];
const networkErrors: any[] = [];
const unhandledErrors: any[] = [];

let initialized = false;

// ── Helpers ──

function now() {
  return new Date().toISOString();
}

function safeStringify(val: any) {
  if (val === null || val === undefined) return String(val);
  if (typeof val === 'string') return val;
  if (val instanceof Error) return val.message || val.toString();
  try {
    return JSON.stringify(val, null, 0)?.substring(0, 500) || String(val);
  } catch {
    return String(val);
  }
}

function pushWithLimit(arr: any[], item: any) {
  arr.push(item);
  if (arr.length > MAX_BUFFER_SIZE) arr.shift();
}

/**
 * Detect errors originating from browser extensions (MetaMask, etc.).
 * These are not application bugs and should be excluded from reports.
 */
function isBrowserExtensionNoise(messageOrStack: unknown) {
  const str = String(messageOrStack || '');
  const extProtocols = ['chrome-extension://', 'moz-extension://', 'safari-extension://'];
  if (extProtocols.some((p) => str.includes(p))) return true;
  if (/failed to connect to metamask/i.test(str)) return true;
  return false;
}

/**
 * Detect noisy console messages that are not actual application errors.
 * These include React dev-mode warnings, HMR/Vite messages, slow API
 * logs, service worker registration, and similar development noise.
 */
function isConsoleNoise(message: string): boolean {
  const noisePatterns = [
    // React dev-mode warnings
    /^Warning:/,
    /react-dom\.development/i,
    /ReactDOM\.render is no longer supported/i,
    /Each child in a list should have a unique/,
    /Cannot update a component/,
    /Can't perform a React state update on an unmounted component/i,
    // HMR / Vite / build tool messages
    /\[HMR\]/,
    /\[vite\]/i,
    /\[hmr\]/,
    /hot module replacement/i,
    // Service worker noise
    /\[SW\]/,
    /service.?worker/i,
    // Own API interceptor slow request warnings
    /\[API\] Slow request:/,
    /\[API\] Retrying request/,
    // Version control logs
    /\[Version\]/,
    // Web Vitals dev-mode console logs
    /^{name:"(CLS|FCP|LCP|TTFB|INP|FID)"/,
    // ResizeObserver benign warnings
    /ResizeObserver loop/i,
    // Browser deprecation notices
    /\[Deprecation\]/i,
  ];
  return noisePatterns.some((pattern) => pattern.test(message));
}

// ── Console Interceptors ──

const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

function interceptConsole() {
  console.error = (...args) => {
    const message = args.map(safeStringify).join(' ');
    // Skip noise — don't pollute the error buffer with dev-mode or framework messages
    if (!isConsoleNoise(message) && !isBrowserExtensionNoise(message)) {
      pushWithLimit(consoleErrors, {
        type: 'error',
        message,
        timestamp: now(),
        stack: args.find((a) => a instanceof Error)?.stack || '',
      });
    }
    originalConsoleError.apply(console, args);
  };

  console.warn = (...args) => {
    const message = args.map(safeStringify).join(' ');
    // Warnings go into a separate buffer and are NOT counted as errors
    if (!isConsoleNoise(message) && !isBrowserExtensionNoise(message)) {
      pushWithLimit(consoleWarnings, {
        type: 'warn',
        message,
        timestamp: now(),
      });
    }
    originalConsoleWarn.apply(console, args);
  };
}

// ── Global Error Handlers ──

function interceptGlobalErrors() {
  // Uncaught exceptions
  window.addEventListener('error', (event) => {
    // Skip errors from browser extensions
    if (isBrowserExtensionNoise(event.message) || isBrowserExtensionNoise(event.filename) || isBrowserExtensionNoise(event.error?.stack)) {
      return;
    }
    pushWithLimit(unhandledErrors, {
      type: 'uncaught_exception',
      message: event.message || 'Unknown error',
      timestamp: now(),
      stack: event.error?.stack || '',
      source: event.filename
        ? `${event.filename}:${event.lineno}:${event.colno}`
        : '',
    });
  });

  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = reason instanceof Error ? reason.message : safeStringify(reason);
    const stack = reason instanceof Error ? reason.stack || '' : '';
    // Skip rejections from browser extensions
    if (isBrowserExtensionNoise(msg) || isBrowserExtensionNoise(stack)) {
      return;
    }
    pushWithLimit(unhandledErrors, {
      type: 'unhandled_rejection',
      message: msg,
      timestamp: now(),
      stack,
    });
  });
}

// ── Public API ──

/**
 * Initialize global error capture. Call once at app startup.
 */
export function initErrorCapture() {
  if (initialized) return;
  initialized = true;
  interceptConsole();
  interceptGlobalErrors();
}

/**
 * Push a network error (called from api.ts interceptor).
 */
export function captureNetworkError({ method, url, status, message }: { method?: string; url?: string; status?: number; message?: string }) {
  pushWithLimit(networkErrors, {
    method: method || 'UNKNOWN',
    url: url || '',
    status: status || 0,
    message: message || 'Network error',
    timestamp: now(),
  });
}

/**
 * Get all captured errors and warnings (snapshot).
 * Warnings are included for completeness in reports but stored separately.
 */
export function getErrorBuffer() {
  return {
    consoleErrors: [...consoleErrors, ...consoleWarnings],
    networkErrors: [...networkErrors],
    unhandledErrors: [...unhandledErrors],
  };
}

/**
 * Get total error count across all buffers (includes warnings for report data).
 */
export function getErrorCount() {
  return consoleErrors.length + consoleWarnings.length + networkErrors.length + unhandledErrors.length;
}

/**
 * Get count of significant errors only (excludes console warnings).
 * Use this to determine whether to show the troubleshoot badge.
 */
export function getSignificantErrorCount() {
  return consoleErrors.length + networkErrors.length + unhandledErrors.length;
}

/**
 * Check if there are any significant errors captured (excludes warnings).
 */
export function hasErrors() {
  return getSignificantErrorCount() > 0;
}

/**
 * Clear all error buffers (after successful submission).
 */
export function clearErrorBuffer() {
  consoleErrors.length = 0;
  consoleWarnings.length = 0;
  networkErrors.length = 0;
  unhandledErrors.length = 0;
}

/**
 * Get browser info for the report.
 */
export function getBrowserInfo() {
  const ua = navigator.userAgent;
  let browser = 'Unknown';
  let os = 'Unknown';

  // Detect browser
  if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('Chrome/')) browser = 'Chrome';
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Opera') || ua.includes('OPR/')) browser = 'Opera';

  // Detect OS
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  return {
    browser,
    os,
    screenSize: `${window.screen.width}x${window.screen.height}`,
    userAgent: ua.substring(0, 300),
  };
}
