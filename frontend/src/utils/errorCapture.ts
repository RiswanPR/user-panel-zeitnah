/**
 * Global Error Capture Utility
 * 
 * Intercepts console.error, console.warn, window.onerror, and
 * unhandled promise rejections. Stores them in a ring buffer
 * (max 50 entries) for use in troubleshoot reports.
 */

const MAX_BUFFER_SIZE = 50;

// Error buffers
const consoleErrors: any[] = [];
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

// ── Console Interceptors ──

const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

function interceptConsole() {
  console.error = (...args) => {
    pushWithLimit(consoleErrors, {
      type: 'error',
      message: args.map(safeStringify).join(' '),
      timestamp: now(),
      stack: args.find((a) => a instanceof Error)?.stack || '',
    });
    originalConsoleError.apply(console, args);
  };

  console.warn = (...args) => {
    pushWithLimit(consoleErrors, {
      type: 'warn',
      message: args.map(safeStringify).join(' '),
      timestamp: now(),
    });
    originalConsoleWarn.apply(console, args);
  };
}

// ── Global Error Handlers ──

function interceptGlobalErrors() {
  // Uncaught exceptions
  window.addEventListener('error', (event) => {
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
    pushWithLimit(unhandledErrors, {
      type: 'unhandled_rejection',
      message:
        reason instanceof Error
          ? reason.message
          : safeStringify(reason),
      timestamp: now(),
      stack: reason instanceof Error ? reason.stack || '' : '',
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
 * Get all captured errors (snapshot).
 */
export function getErrorBuffer() {
  return {
    consoleErrors: [...consoleErrors],
    networkErrors: [...networkErrors],
    unhandledErrors: [...unhandledErrors],
  };
}

/**
 * Get total error count across all buffers.
 */
export function getErrorCount() {
  return consoleErrors.length + networkErrors.length + unhandledErrors.length;
}

/**
 * Check if there are any errors captured.
 */
export function hasErrors() {
  return getErrorCount() > 0;
}

/**
 * Clear all error buffers (after successful submission).
 */
export function clearErrorBuffer() {
  consoleErrors.length = 0;
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
