const apiBaseUrl =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) ||
  (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? "http://localhost:3000/api"
    : "https://zeitnahacademy.com/api");

const uploadBaseUrl = apiBaseUrl.replace(/\/api\/?$/, "");
const bunnyLibraryId = (typeof import.meta !== "undefined" && import.meta.env?.VITE_BUNNY_LIBRARY_ID)?.trim();

export function getUploadUrl(path) {
  if (!path) {
    return null;
  }

  if (typeof path === "object" && path !== null) {
    path = path.url || path.path || path.src || "";
    if (!path) return null;
  }

  if (typeof path !== "string") {
    return null;
  }

  const trimmed = path.trim();
  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const cleaned = trimmed.replace(/^\/?uploads\/?/i, "").replace(/^\/+/, "");
  return `${uploadBaseUrl}/uploads/${cleaned}`;
}

export function formatDuration(duration) {
  if (!duration) {
    return "Self paced";
  }

  const value = String(duration).trim();

  if (/^\d+$/.test(value)) {
    const totalSeconds = Number.parseInt(value, 10);

    if (totalSeconds < 60) {
      return `${totalSeconds} sec`;
    }

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (hours > 0) {
      return minutes > 0
        ? `${hours} hr ${minutes} min`
        : `${hours} hr`;
    }

    return `${minutes} min`;
  }

  return value;
}

export function parseDurationToSeconds(duration) {
  if (!duration) return 0;
  if (typeof duration === "number") return duration;
  const value = String(duration).trim();
  if (/^\d+$/.test(value)) return Number.parseInt(value, 10);

  const parts = value.split(":").map((p) => Number.parseInt(p, 10) || 0);
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  const hourMatch = value.match(/(\d+)\s*h/i);
  const minMatch = value.match(/(\d+)\s*m/i);
  const secMatch = value.match(/(\d+)\s*s/i);
  if (hourMatch || minMatch || secMatch) {
    const hours = hourMatch ? Number.parseInt(hourMatch[1], 10) : 0;
    const mins = minMatch ? Number.parseInt(minMatch[1], 10) : 0;
    const secs = secMatch ? Number.parseInt(secMatch[1], 10) : 0;
    return hours * 3600 + mins * 60 + secs;
  }

  return 0;
}

export function getCourseTypeLabel(type) {
  return (type || "").toLowerCase() === "recording"
    ? "Recording Class"
    : "Online Class";
}

export function getClassVideoSource(courseType, videoSource) {
  const explicitSource = String(videoSource || "").trim().toLowerCase();

  if (explicitSource === "s3" || explicitSource === "aws") {
    return "s3";
  }

  if (explicitSource === "vdocipher" || explicitSource === "vdo") {
    return "vdocipher";
  }

  return String(courseType || "").trim().toLowerCase() === "recording"
    ? "s3"
    : "vdocipher";
}

export function getVdoCipherEmbedUrl(vdoCipher) {
  if (!vdoCipher) {
    return null;
  }

  if (typeof vdoCipher === "string" && vdoCipher.startsWith("http")) {
    return vdoCipher;
  }

  if (
    !vdoCipher?.otp ||
    !vdoCipher?.playbackInfo
  ) {
    return null;
  }

  const params = new URLSearchParams({
    otp: vdoCipher.otp,
    playbackInfo: vdoCipher.playbackInfo,
  });

  return `https://player.vdocipher.com/v2/?${params.toString()}`;
}

export function getBunnyEmbedUrl(videoReference) {
  if (!videoReference) {
    return null;
  }

  const value = String(videoReference).trim();

  if (!value) {
    return null;
  }

  const match =
    value.match(/(?:embed|play)\/([^/?#]+)\/([^/?#]+)/i) ||
    value.match(/^([^/?#]+)\/([^/?#]+)$/);

  if (match) {
    const [, libraryId, videoId] = match;
    return `https://player.mediadelivery.net/embed/${libraryId}/${videoId}`;
  }

  if (bunnyLibraryId) {
    return `https://player.mediadelivery.net/embed/${bunnyLibraryId}/${value}`;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `https://iframe.mediadelivery.net/play/${value}`;
}

/**
 * Detects whether the runtime environment is the Zeitnah React Native mobile app.
 * Matches active window.ReactNativeWebView bridge injection, native WebKit script message handlers,
 * and the ZeitnahMobile user-agent token.
 */
export function isZeitnahNativeApp(win = typeof window !== "undefined" ? window : null) {
  if (!win) return false;
  const hasBridge = Boolean(
    (win.ReactNativeWebView && typeof win.ReactNativeWebView.postMessage === "function") ||
    win.webkit?.messageHandlers?.ReactNativeWebView ||
    win.webkit?.messageHandlers?.zeitnah ||
    win.webkit?.messageHandlers?.ZeitnahMobile
  );
  const ua = win.navigator?.userAgent || "";
  const hasAppUa = /ZeitnahMobile/i.test(ua);
  return hasBridge || hasAppUa;
}

export function isIOSAppOrWebView(win = typeof window !== "undefined" ? window : null) {
  if (!win || !win.navigator) return false;
  const ua = win.navigator.userAgent || "";
  const platform = win.navigator.platform || "";
  const maxTouchPoints = Number(win.navigator.maxTouchPoints || 0);
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (platform === "MacIntel" && maxTouchPoints > 1);
  if (!isIOS) return false;

  // 1. Direct Zeitnah React Native container detection
  if (isZeitnahNativeApp(win) || typeof win.ReactNativeWebView !== "undefined") {
    return true;
  }

  // 2. Standalone PWA mode (runs in WebKit standalone without FairPlay EME / fullscreen support)
  if (win.navigator.standalone === true) {
    return true;
  }

  // 3. Third-party iOS browsers (Chrome CriOS, Firefox FxiOS, Edge EdgiOS, Opera OPiOS, etc.)
  if (/CriOS|FxiOS|OPiOS|EdgiOS|mercury/i.test(ua)) {
    return true;
  }

  // 4. Known in-app social & messaging WebViews (Facebook, Instagram, Line, Twitter/X, Snapchat, TikTok, WeChat)
  if (/FBAN|FBAV|Instagram|Line\/|Twitter|Snapchat|musical_ly|ByteLocale|TikTok|MicroMessenger/i.test(ua)) {
    return true;
  }

  // 5. Classic WKWebView signature: WKWebView on iOS by default does NOT include 'Version/' or 'Safari/' tokens
  const hasSafari = /Safari/i.test(ua);
  const hasVersion = /Version\//i.test(ua);
  if (!hasSafari || !hasVersion) {
    return true;
  }

  // 6. Explicit native container bridge messageHandlers (e.g., custom host app bridges).
  // Note: On iOS 15+, genuine Safari exposes window.webkit.messageHandlers whenever a user has
  // one or more Safari Web Extensions enabled (e.g., 1Password, Bitwarden, AdGuard, Grammarly).
  // Therefore, presence of window.webkit.messageHandlers alone MUST NOT classify a browser as an
  // in-app WebView when standard Safari tokens (hasSafari && hasVersion) are present, unless
  // a known host application bridge is explicitly registered.
  const hasNativeBridge = Boolean(
    win.webkit?.messageHandlers?.ReactNativeWebView ||
    win.webkit?.messageHandlers?.zeitnah ||
    win.webkit?.messageHandlers?.ZeitnahMobile
  );
  if (hasNativeBridge) {
    return true;
  }

  return false;
}

// Backward-compatible alias
export const isIOSNonSafari = isIOSAppOrWebView;

/**
 * Detects whether the runtime is genuine desktop Safari on macOS.
 * Accurately distinguishes macOS Safari from iOS/iPadOS, Chrome on Mac, Firefox on Mac, Edge, and WebViews.
 */
export function isMacOSDesktopSafari(win = typeof window !== "undefined" ? window : null) {
  if (!win || !win.navigator) return false;
  const ua = win.navigator.userAgent || "";
  const platform = win.navigator.platform || "";
  const maxTouchPoints = Number(win.navigator.maxTouchPoints || 0);

  // Must be a Mac platform without touch screens (iPadOS desktop UA has maxTouchPoints > 1)
  const isMac = /Mac(intosh|Intel|PPC|68K)/i.test(platform) || (platform === "MacIntel" && maxTouchPoints <= 1);
  if (!isMac) return false;

  // Exclude iOS devices (iPhone, iPad, iPod) or iPad in desktop mode
  if (/iPad|iPhone|iPod/i.test(ua) || (platform === "MacIntel" && maxTouchPoints > 1)) {
    return false;
  }

  // Must contain Safari/ and Version/ tokens
  const hasSafari = /Safari/i.test(ua);
  const hasVersion = /Version\//i.test(ua);
  if (!hasSafari || !hasVersion) return false;

  // Exclude other desktop browsers on macOS (Chrome, Chromium, Firefox, Edge, Opera, Brave, Vivaldi, etc.)
  if (/Chrome|Chromium|CriOS|Edg|OPR|Opera|Firefox|FxiOS|Vivaldi|YaBrowser|Brave/i.test(ua)) {
    return false;
  }

  return true;
}

/**
 * Detects whether the runtime is native Safari on iOS (iPhone / iPad).
 */
export function isIOSSafari(win = typeof window !== "undefined" ? window : null) {
  if (!win || !win.navigator) return false;
  const ua = win.navigator.userAgent || "";
  const platform = win.navigator.platform || "";
  const maxTouchPoints = Number(win.navigator.maxTouchPoints || 0);

  const isIOS =
    /iPad|iPhone|iPod/i.test(ua) ||
    (platform === "MacIntel" && maxTouchPoints > 1);
  if (!isIOS) return false;

  // Must NOT be an in-app WebView, standalone PWA, or third-party iOS browser
  if (isIOSAppOrWebView(win)) return false;

  // Must have Safari and Version
  return /Safari/i.test(ua) && /Version\//i.test(ua);
}

/**
 * Formats VdoCipher player error events and postMessage payloads into user-friendly,
 * environment-aware diagnostic messages without exposing DRM secrets or tokens.
 *
 * Specifically handles the provider's "Browser failed / Please view in updated Google Chrome browser"
 * message on Safari without erroneously directing Safari users to install Chrome.
 */
export function formatVdoPlayerError(err, win = typeof window !== "undefined" ? window : null) {
  const code = err?.code || err?.payload?.code;
  const rawMsg = String(err?.message || err?.payload?.message || err?.error?.message || err?.error || err || "");
  const lowerMsg = rawMsg.toLowerCase();

  const isMacSafari = isMacOSDesktopSafari(win);
  const isIOSRestricted = isIOSAppOrWebView(win);
  const isIOSNativeSafari = isIOSSafari(win);
  const isFirefox = /Firefox|FxiOS/i.test(win?.navigator?.userAgent || "");

  // 1. Provider's "Browser failed / Please view in updated Google Chrome browser"
  if (
    lowerMsg.includes("browser failed") ||
    lowerMsg.includes("chrome browser") ||
    lowerMsg.includes("google chrome")
  ) {
    if (isMacSafari) {
      return {
        title: "Playback Interrupted",
        message: "Video playback could not be initialized in Safari. FairPlay DRM or certificate authorization failed. Click below to reload the player session.",
        isRetryable: true,
        showSafariFallback: false,
        category: "drm_safari_blocked",
      };
    }
    if (isIOSRestricted) {
      return {
        title: "Play in Safari Browser",
        message: "Apple FairPlay DRM requires opening this video in the official Safari browser on iOS.",
        isRetryable: true,
        showSafariFallback: true,
        category: "ios_webview_restricted",
      };
    }
    if (isFirefox) {
      return {
        title: "DRM Playback Notice",
        message: "Firefox requires DRM playback to be enabled. Please ensure 'Play DRM-controlled content' is checked in Firefox Settings > General, or try another supported browser.",
        isRetryable: true,
        showSafariFallback: false,
        category: "firefox_drm_disabled",
      };
    }
    return {
      title: "Browser Playback Notice",
      message: "Protected content playback failed in this browser. Please verify browser permissions or reload.",
      isRetryable: true,
      showSafariFallback: false,
      category: "browser_unsupported",
    };
  }

  // 2. SDK load failure / script blockage
  if (
    code === "SDK_LOAD_FAILED" ||
    lowerMsg.includes("script failed") ||
    lowerMsg.includes("player engine") ||
    lowerMsg.includes("vdocipher api") ||
    lowerMsg.includes("vdocipher script")
  ) {
    return {
      title: "Player Engine Unavailable",
      message: "The video player engine could not be loaded. Please check your internet connection or disable ad blockers and click Reload Player.",
      isRetryable: true,
      showSafariFallback: false,
      category: "sdk_load_failed",
    };
  }

  // 3. Domain authorization notice (VdoCipher code 60072014)
  if (code === 60072014 || lowerMsg.includes("domain")) {
    return {
      title: "Domain Authorization Notice",
      message: "Domain authorization notice: This domain must be allowed in VdoCipher dashboard settings. Click below to refresh the stream.",
      isRetryable: true,
      showSafariFallback: false,
      category: "domain_restricted",
    };
  }

  // 4. Playback connection / initialization watchdog timeout
  if (
    code === "INITIALIZATION_TIMEOUT" ||
    lowerMsg.includes("initialization timed out") ||
    lowerMsg.includes("connection timed out")
  ) {
    return {
      title: "Playback Connection Timeout",
      message: "The video stream took too long to connect. Please check your internet connection and click Reload Player.",
      isRetryable: true,
      showSafariFallback: false,
      category: "network_timeout",
    };
  }

  // 5. FairPlay / DRM / License errors
  if (
    lowerMsg.includes("safari") ||
    lowerMsg.includes("fairplay") ||
    lowerMsg.includes("drm") ||
    lowerMsg.includes("license") ||
    lowerMsg.includes("protected") ||
    code === 4
  ) {
    if (isIOSRestricted) {
      return {
        title: "Play in Safari Browser",
        message: "Apple FairPlay DRM requires opening this video in Safari Browser on iOS devices.",
        isRetryable: true,
        showSafariFallback: true,
        category: "ios_webview_restricted",
      };
    }

    if (isMacSafari || isIOSNativeSafari) {
      return {
        title: "DRM Authorization Notice",
        message: "Video stream authorization was interrupted. Click below to fetch a fresh authenticated session.",
        isRetryable: true,
        showSafariFallback: false,
        category: "drm_safari_session",
      };
    }

    if (isFirefox) {
      return {
        title: "DRM Authorization Notice",
        message: "Protected content could not be verified in Firefox. Please ensure 'Play DRM-controlled content' is enabled in Firefox Settings > General, or reload the session.",
        isRetryable: true,
        showSafariFallback: false,
        category: "firefox_drm_disabled",
      };
    }

    return {
      title: "Protected Stream Notice",
      message: "Protected content could not be verified in this view. Click below to fetch a fresh authenticated session.",
      isRetryable: true,
      showSafariFallback: false,
      category: "drm_verification_failed",
    };
  }

  // 4. Network / Jitter / Timeout errors
  if (
    code === 1002 ||
    code === 2 ||
    lowerMsg.includes("network") ||
    lowerMsg.includes("offline") ||
    lowerMsg.includes("timeout")
  ) {
    return {
      title: "Network Notice",
      message: "Stream interrupted by network connectivity. Click below to retry playback.",
      isRetryable: true,
      showSafariFallback: false,
      category: "network_error",
    };
  }

  // 5. Default generic playback interruption
  return {
    title: "Video Stream Notice",
    message: rawMsg && rawMsg !== "[object Object]" && !lowerMsg.includes("error")
      ? rawMsg
      : "Playback session was interrupted. Click below to fetch a fresh authenticated session.",
    isRetryable: true,
    showSafariFallback: isIOSRestricted,
    category: "general_interruption",
  };
}

/**
 * Creates an authoritative progress snapshot stamped with its originating class ID.
 */
export function createProgressSnapshot({
  classId,
  completed = false,
  currentTimeSeconds = 0,
  durationSeconds = 0,
  totalCoveredSeconds = 0,
  totalPlayedSeconds = 0,
}) {
  return {
    classId: classId ? String(classId).trim() : null,
    completed: Boolean(completed),
    currentTimeSeconds: Math.round(Number(currentTimeSeconds) || 0),
    durationSeconds: Math.round(Number(durationSeconds) || 0),
    totalCoveredSeconds: Math.round(Number(totalCoveredSeconds) || 0),
    totalPlayedSeconds: Math.round(Number(totalPlayedSeconds) || 0),
  };
}

/**
 * Extracts the target class ID and whitelisted DTO payload for POST /courses/class/:id/progress.
 * Strips classId from the body to comply with backend forbidNonWhitelisted validation rules.
 */
export function sanitizeProgressPayload(snapshot, fallbackClassId = null) {
  if (!snapshot || typeof snapshot !== "object") {
    return {
      targetClassId: fallbackClassId ? String(fallbackClassId).trim() : null,
      dtoPayload: null,
    };
  }

  const rawTarget = snapshot.classId || fallbackClassId;
  const targetClassId = rawTarget ? String(rawTarget).trim() : null;

  const dtoPayload = {
    completed: Boolean(snapshot.completed),
    currentTimeSeconds: Math.round(Number(snapshot.currentTimeSeconds) || 0),
    durationSeconds: Math.round(Number(snapshot.durationSeconds) || 0),
    totalCoveredSeconds: Math.round(Number(snapshot.totalCoveredSeconds) || 0),
    totalPlayedSeconds: Math.round(Number(snapshot.totalPlayedSeconds) || 0),
  };

  return { targetClassId, body: dtoPayload, dtoPayload };
}

/**
 * Resolves progress API endpoint URL for a given class ID.
 */
export function resolveProgressEndpoint(classId, baseUrl = "") {
  if (!classId) return null;
  const cleanBase = baseUrl ? baseUrl.replace(/\/+$/, "") : "";
  return `${cleanBase}/courses/class/${encodeURIComponent(String(classId).trim())}/progress`;
}

/**
 * Determines whether an asynchronous workspace response belongs to an outdated lesson request.
 */
export function isWorkspaceResponseStale(requestedClassId, latestRequestedClassId) {
  if (!requestedClassId || !latestRequestedClassId) return false;
  return String(requestedClassId).trim() !== String(latestRequestedClassId).trim();
}

/**
 * Evaluates whether current data belongs to the active class ID to prevent cross-lesson ref pollution.
 */
export function shouldSyncProgressRefs(dataClassId, activeClassId) {
  if (!dataClassId || !activeClassId) return true;
  return String(dataClassId).trim() === String(activeClassId).trim();
}

/**
 * Determines whether an asynchronous reload response or failure has been superseded by a newer reload
 * or a lesson navigation event.
 */
export function isReloadRequestSuperseded(requestSeq, latestSeq, requestedClassId, latestRequestedClassId) {
  if (requestSeq !== latestSeq) return true;
  if (requestedClassId && latestRequestedClassId && String(requestedClassId).trim() !== String(latestRequestedClassId).trim()) {
    return true;
  }
  return false;
}

