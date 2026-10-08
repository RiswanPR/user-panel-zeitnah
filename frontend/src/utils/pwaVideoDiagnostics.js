/**
 * PWA Video & DRM Diagnostic Telemetry Engine
 * 
 * Provides runtime inspection for VdoCipher DRM playback differences
 * between standard browser tabs and installed PWA / standalone mode.
 * 
 * SECURITY NOTICE:
 * Does NOT log OTPs, playbackInfo, authorization headers, signed URLs, or secrets.
 */

/**
 * Detect current display mode according to CSS media queries
 */
export function getDisplayMode(win = typeof window !== 'undefined' ? window : null) {
  if (!win || !win.matchMedia) return 'unknown';
  if (win.matchMedia('(display-mode: standalone)').matches) return 'standalone';
  if (win.matchMedia('(display-mode: fullscreen)').matches) return 'fullscreen';
  if (win.matchMedia('(display-mode: minimal-ui)').matches) return 'minimal-ui';
  if (win.matchMedia('(display-mode: window-controls-overlay)').matches) return 'window-controls-overlay';
  if (win.matchMedia('(display-mode: browser)').matches) return 'browser';
  return 'browser';
}

/**
 * Detect iOS-specific navigator.standalone
 */
export function getNavigatorStandalone(win = typeof window !== 'undefined' ? window : null) {
  if (!win || !win.navigator) return false;
  return Boolean(win.navigator.standalone);
}

/**
 * Check if the current context is an installed PWA / standalone web app
 */
export function isStandalonePwa(win = typeof window !== 'undefined' ? window : null) {
  if (!win) return false;
  const displayMode = getDisplayMode(win);
  const isNavStandalone = getNavigatorStandalone(win);
  return displayMode === 'standalone' || displayMode === 'fullscreen' || isNavStandalone;
}

/**
 * Retrieve user agent
 */
export function getUserAgent(win = typeof window !== 'undefined' ? window : null) {
  if (!win || !win.navigator) return 'unknown';
  return win.navigator.userAgent || 'unknown';
}

/**
 * Verify Encrypted Media Extensions (EME) API presence
 */
export function checkEmeAvailability(win = typeof window !== 'undefined' ? window : null) {
  if (!win || !win.navigator) return false;
  return typeof win.navigator.requestMediaKeySystemAccess === 'function';
}

/**
 * Probe Google Widevine key system access without initiating a license exchange
 */
export async function probeWidevineKeySystem(win = typeof window !== 'undefined' ? window : null) {
  if (!win || !win.navigator || typeof win.navigator.requestMediaKeySystemAccess !== 'function') {
    return {
      status: 'unavailable',
      reason: 'requestMediaKeySystemAccess not supported',
    };
  }

  const widevineConfig = [
    {
      initDataTypes: ['cenc'],
      audioCapabilities: [
        {
          contentType: 'audio/mp4; codecs="mp4a.40.2"',
        },
      ],
      videoCapabilities: [
        {
          contentType: 'video/mp4; codecs="avc1.42E01E"',
        },
      ],
    },
  ];

  try {
    const access = await win.navigator.requestMediaKeySystemAccess('com.widevine.alpha', widevineConfig);
    return {
      status: 'supported',
      keySystem: access.keySystem,
    };
  } catch (err) {
    return {
      status: 'rejected',
      errorName: err?.name || 'Error',
      errorMessage: err?.message || 'Access rejected by system/browser',
    };
  }
}

/**
 * Probe Apple FairPlay key system access (for iOS / Safari contexts)
 */
export async function probeFairPlayKeySystem(win = typeof window !== 'undefined' ? window : null) {
  if (!win || !win.navigator || typeof win.navigator.requestMediaKeySystemAccess !== 'function') {
    return {
      status: 'unavailable',
      reason: 'requestMediaKeySystemAccess not supported',
    };
  }

  const fairPlayConfig = [
    {
      initDataTypes: ['sinf', 'skd'],
      videoCapabilities: [
        {
          contentType: 'video/mp4',
        },
      ],
    },
  ];

  const systems = ['com.apple.fps', 'com.apple.fps.1_0', 'com.apple.fps.2_0', 'com.apple.fps.3_0'];
  for (const system of systems) {
    try {
      const access = await win.navigator.requestMediaKeySystemAccess(system, fairPlayConfig);
      return {
        status: 'supported',
        keySystem: access.keySystem,
      };
    } catch {
      // Try next version
    }
  }

  return {
    status: 'unsupported',
    reason: 'com.apple.fps key system not supported in this runtime context',
  };
}

/**
 * Check MediaSource and ManagedMediaSource availability
 */
export function getMediaSourceSupport(win = typeof window !== 'undefined' ? window : null) {
  if (!win) {
    return {
      hasMediaSource: false,
      hasManagedMediaSource: false,
    };
  }
  return {
    hasMediaSource: typeof win.MediaSource !== 'undefined',
    hasManagedMediaSource: typeof win.ManagedMediaSource !== 'undefined',
  };
}

/**
 * Inspect Service Worker controller status
 */
export function getServiceWorkerStatus(win = typeof window !== 'undefined' ? window : null) {
  if (!win || !win.navigator || !('serviceWorker' in win.navigator)) {
    return {
      supported: false,
      hasController: false,
    };
  }

  const controller = win.navigator.serviceWorker.controller;
  return {
    supported: true,
    hasController: Boolean(controller),
    state: controller?.state || null,
  };
}

/**
 * Check local storage, session storage, and cookie availability
 */
export function getStorageAvailability(win = typeof window !== 'undefined' ? window : null) {
  if (!win) {
    return {
      localStorage: false,
      sessionStorage: false,
      cookieEnabled: false,
    };
  }

  let localStorageOk = false;
  let sessionStorageOk = false;

  try {
    const testKey = '__pwa_drm_diag_test__';
    win.localStorage.setItem(testKey, '1');
    win.localStorage.removeItem(testKey);
    localStorageOk = true;
  } catch {
    localStorageOk = false;
  }

  try {
    const testKey = '__pwa_drm_diag_test__';
    win.sessionStorage.setItem(testKey, '1');
    win.sessionStorage.removeItem(testKey);
    sessionStorageOk = true;
  } catch {
    sessionStorageOk = false;
  }

  return {
    localStorage: localStorageOk,
    sessionStorage: sessionStorageOk,
    cookieEnabled: Boolean(win.navigator?.cookieEnabled),
  };
}

/**
 * Retrieve origin and security context (no secrets)
 */
export function getOriginInfo(win = typeof window !== 'undefined' ? window : null) {
  if (!win || !win.location) {
    return {
      origin: 'unknown',
      protocol: 'unknown',
      isSecureContext: false,
    };
  }

  return {
    origin: win.location.origin,
    protocol: win.location.protocol,
    isSecureContext: Boolean(win.isSecureContext),
  };
}

/**
 * Sanitize and record OTP / license fetch response status
 * IMPORTANT: NEVER logs OTP strings, playbackInfo, or tokens
 */
export function recordOtpStatus({ status, hasOtp, hasPlaybackInfo, videoSource }) {
  const telemetry = {
    timestamp: new Date().toISOString(),
    event: 'OTP_FETCH_STATUS',
    httpStatus: Number(status) || 0,
    hasOtp: Boolean(hasOtp),
    hasPlaybackInfo: Boolean(hasPlaybackInfo),
    videoSource: videoSource || 'unknown',
  };

  console.info('[PWA-VIDEO-DIAGNOSTIC] OTP Status:', telemetry);
  return telemetry;
}

/**
 * Record iframe lifecycle event (load, error)
 */
export function recordIframeStatus(eventName, details = {}) {
  const telemetry = {
    timestamp: new Date().toISOString(),
    event: `IFRAME_${String(eventName).toUpperCase()}`,
    title: details.title || 'lesson-iframe',
    elapsedMs: details.elapsedMs || 0,
  };

  console.info('[PWA-VIDEO-DIAGNOSTIC] Iframe Event:', telemetry);
  return telemetry;
}

/**
 * Record VdoCipher player error safely
 */
export function recordVdoError(err) {
  const code = err?.code || err?.payload?.code || 'UNKNOWN_CODE';
  const rawMsg = err?.message || err?.payload?.message || String(err || '');
  
  // Clean message of any accidental tokens
  const sanitizedMsg = rawMsg
    .replace(/[a-f0-9]{32,}/gi, '[TOKEN_REDACTED]')
    .slice(0, 200);

  const telemetry = {
    timestamp: new Date().toISOString(),
    event: 'VDOCIPHER_PLAYER_ERROR',
    code,
    sanitizedMessage: sanitizedMsg,
  };

  console.warn('[PWA-VIDEO-DIAGNOSTIC] VdoCipher Error Intercepted:', telemetry);
  return telemetry;
}

/**
 * Comprehensive diagnostic probe executed on classroom mount
 */
export async function runPwaVideoDiagnostics(win = typeof window !== 'undefined' ? window : null) {
  if (!win) return null;

  const displayMode = getDisplayMode(win);
  const standalone = getNavigatorStandalone(win);
  const isPwa = isStandalonePwa(win);
  const userAgent = getUserAgent(win);
  const emeAvailable = checkEmeAvailability(win);
  const mediaSource = getMediaSourceSupport(win);
  const serviceWorker = getServiceWorkerStatus(win);
  const storage = getStorageAvailability(win);
  const originInfo = getOriginInfo(win);

  const [widevineResult, fairplayResult] = await Promise.all([
    probeWidevineKeySystem(win),
    probeFairPlayKeySystem(win),
  ]);

  const report = {
    timestamp: new Date().toISOString(),
    displayMode,
    navigatorStandalone: standalone,
    isPwaStandalone: isPwa,
    userAgent,
    origin: originInfo.origin,
    isSecureContext: originInfo.isSecureContext,
    emeAvailable,
    widevine: widevineResult,
    fairplay: fairplayResult,
    mediaSource,
    serviceWorkerController: serviceWorker,
    storageAvailability: storage,
  };

  console.groupCollapsed(
    `%c[PWA-VIDEO-DIAGNOSTIC] Environment Snapshot (${isPwa ? 'STANDALONE PWA' : 'BROWSER TAB'})`,
    'color: #00e5ff; font-weight: bold;'
  );
  console.info('Display Mode:', displayMode);
  console.info('Navigator Standalone (iOS):', standalone);
  console.info('Is Standalone PWA:', isPwa);
  console.info('Secure Context:', originInfo.isSecureContext);
  console.info('EME API Available:', emeAvailable);
  console.info('Widevine Status:', widevineResult);
  console.info('FairPlay Status:', fairplayResult);
  console.info('MediaSource Support:', mediaSource);
  console.info('SW Controller:', serviceWorker);
  console.info('Storage Status:', storage);
  console.groupEnd();

  return report;
}
