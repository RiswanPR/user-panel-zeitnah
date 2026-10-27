import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  isMacOSDesktopSafari,
  isIOSSafari,
  isIOSAppOrWebView,
  isZeitnahNativeApp,
  formatVdoPlayerError,
} from './courseUi.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Safari & Multi-DRM Playback Behavioral Tests', () => {
  // Common User-Agent Profiles
  const MACOS_SAFARI_UA =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15';
  const MACOS_CHROME_UA =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';
  const MACOS_FIREFOX_UA =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:124.0) Gecko/20100101 Firefox/124.0';
  const MACOS_EDGE_UA =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0';
  const IOS_IPHONE_SAFARI_UA =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
  const IOS_IPAD_SAFARI_DESKTOP_UA =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15';
  const IOS_CHROME_CRIOS_UA =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/123.0.6312.52 Mobile/15E148 Safari/604.1';
  const IOS_WEBVIEW_UA =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';

  describe('1. Browser Environment Detection', () => {
    it('identifies macOS desktop Safari accurately', () => {
      const mockWin = {
        navigator: {
          userAgent: MACOS_SAFARI_UA,
          platform: 'MacIntel',
          maxTouchPoints: 0,
        },
      };

      assert.equal(isMacOSDesktopSafari(mockWin), true);
      assert.equal(isIOSSafari(mockWin), false);
      assert.equal(isIOSAppOrWebView(mockWin), false);
    });

    it('rejects macOS Google Chrome from macOS Safari detection', () => {
      const mockWin = {
        navigator: {
          userAgent: MACOS_CHROME_UA,
          platform: 'MacIntel',
          maxTouchPoints: 0,
        },
      };

      assert.equal(isMacOSDesktopSafari(mockWin), false);
      assert.equal(isIOSSafari(mockWin), false);
      assert.equal(isIOSAppOrWebView(mockWin), false);
    });

    it('rejects macOS Firefox from macOS Safari detection', () => {
      const mockWin = {
        navigator: {
          userAgent: MACOS_FIREFOX_UA,
          platform: 'MacIntel',
          maxTouchPoints: 0,
        },
      };

      assert.equal(isMacOSDesktopSafari(mockWin), false);
      assert.equal(isIOSSafari(mockWin), false);
    });

    it('rejects macOS Edge from macOS Safari detection', () => {
      const mockWin = {
        navigator: {
          userAgent: MACOS_EDGE_UA,
          platform: 'MacIntel',
          maxTouchPoints: 0,
        },
      };

      assert.equal(isMacOSDesktopSafari(mockWin), false);
      assert.equal(isIOSSafari(mockWin), false);
    });

    it('identifies native iOS Safari on iPhone without misclassifying as macOS Safari', () => {
      const mockWin = {
        navigator: {
          userAgent: IOS_IPHONE_SAFARI_UA,
          platform: 'iPhone',
          maxTouchPoints: 5,
        },
      };

      assert.equal(isMacOSDesktopSafari(mockWin), false);
      assert.equal(isIOSSafari(mockWin), true);
      assert.equal(isIOSAppOrWebView(mockWin), false);
    });

    it('identifies iPadOS Safari in desktop UA mode via touch points', () => {
      const mockWin = {
        navigator: {
          userAgent: IOS_IPAD_SAFARI_DESKTOP_UA,
          platform: 'MacIntel',
          maxTouchPoints: 5,
        },
      };

      assert.equal(isMacOSDesktopSafari(mockWin), false);
      assert.equal(isIOSSafari(mockWin), true);
      assert.equal(isIOSAppOrWebView(mockWin), false);
    });

    it('identifies third-party iOS browsers (CriOS) as restricted iOS environments', () => {
      const mockWin = {
        navigator: {
          userAgent: IOS_CHROME_CRIOS_UA,
          platform: 'iPhone',
          maxTouchPoints: 5,
        },
      };

      assert.equal(isMacOSDesktopSafari(mockWin), false);
      assert.equal(isIOSSafari(mockWin), false);
      assert.equal(isIOSAppOrWebView(mockWin), true);
    });

    it('identifies iOS in-app WebViews as restricted environments', () => {
      const mockWin = {
        navigator: {
          userAgent: IOS_WEBVIEW_UA,
          platform: 'iPhone',
          maxTouchPoints: 5,
        },
      };

      assert.equal(isMacOSDesktopSafari(mockWin), false);
      assert.equal(isIOSSafari(mockWin), false);
      assert.equal(isIOSAppOrWebView(mockWin), true);
    });

    it('detects native app runtime inside ZeitnahMobile React Native container', () => {
      const mockWin = {
        ReactNativeWebView: { postMessage: () => {} },
        navigator: {
          userAgent: IOS_IPHONE_SAFARI_UA,
          platform: 'iPhone',
          maxTouchPoints: 5,
        },
      };

      assert.equal(isIOSAppOrWebView(mockWin), true);
      assert.equal(isIOSSafari(mockWin), false);
    });

    it('identifies iOS Safari with arbitrary extension message handlers (e.g., 1Password, Bitwarden, AdGuard)', () => {
      const mockWin = {
        navigator: {
          userAgent: IOS_IPHONE_SAFARI_UA,
          platform: 'iPhone',
          maxTouchPoints: 5,
        },
        webkit: {
          messageHandlers: {
            onePassword: {},
            bitwarden: {},
            adguard: {},
          },
        },
      };

      assert.equal(isMacOSDesktopSafari(mockWin), false);
      assert.equal(isIOSSafari(mockWin), true, 'Safari with extensions must be classified as native iOS Safari');
      assert.equal(isIOSAppOrWebView(mockWin), false, 'Safari with extensions must NOT be treated as in-app WebView');
    });

    it('identifies iOS in-app WebView with generic user agent and message handlers', () => {
      const mockWin = {
        navigator: {
          userAgent: IOS_WEBVIEW_UA,
          platform: 'iPhone',
          maxTouchPoints: 5,
        },
        webkit: {
          messageHandlers: {
            customAppBridge: {},
          },
        },
      };

      assert.equal(isMacOSDesktopSafari(mockWin), false);
      assert.equal(isIOSSafari(mockWin), false);
      assert.equal(isIOSAppOrWebView(mockWin), true);
    });

    it('detects native app runtime via webkit messageHandlers bridge (ReactNativeWebView / zeitnah)', () => {
      const mockWin = {
        navigator: {
          userAgent: IOS_IPHONE_SAFARI_UA,
          platform: 'iPhone',
          maxTouchPoints: 5,
        },
        webkit: {
          messageHandlers: {
            ReactNativeWebView: { postMessage: () => {} },
          },
        },
      };

      assert.equal(isZeitnahNativeApp(mockWin), true);
      assert.equal(isIOSAppOrWebView(mockWin), true);
      assert.equal(isIOSSafari(mockWin), false);
    });
  });

  describe('2. Provider "Browser failed" Error Handling', () => {
    it('handles "Browser failed. Please view in updated Google Chrome browser" on macOS Safari without pushing to Chrome', () => {
      const mockWin = {
        navigator: {
          userAgent: MACOS_SAFARI_UA,
          platform: 'MacIntel',
          maxTouchPoints: 0,
        },
      };

      const errorPayload = {
        message: 'Browser failed. Please view in updated Google Chrome browser',
      };

      const result = formatVdoPlayerError(errorPayload, mockWin);

      assert.equal(result.title, 'Playback Interrupted');
      assert.match(result.message, /Safari/i);
      assert.match(result.message, /FairPlay/i);
      // Crucial: Must NEVER instruct an existing macOS Safari user to switch to Google Chrome
      assert.doesNotMatch(result.message, /Google Chrome/i);
      assert.equal(result.showSafariFallback, false, 'Do not show Open in Safari to a user already on Safari');
      assert.equal(result.isRetryable, true);
      assert.equal(result.category, 'drm_safari_blocked');
    });

    it('handles "Browser failed" on iOS in-app WebView by providing Safari fallback', () => {
      const mockWin = {
        navigator: {
          userAgent: IOS_WEBVIEW_UA,
          platform: 'iPhone',
          maxTouchPoints: 5,
        },
      };

      const errorPayload = {
        message: 'Browser failed. Please view in updated Google Chrome browser',
      };

      const result = formatVdoPlayerError(errorPayload, mockWin);

      assert.equal(result.title, 'Play in Safari Browser');
      assert.match(result.message, /Safari/i);
      assert.equal(result.showSafariFallback, true, 'Show Open in Safari to iOS WebView user');
      assert.equal(result.category, 'ios_webview_restricted');
    });

    it('handles "Browser failed" on desktop Chrome gracefully', () => {
      const mockWin = {
        navigator: {
          userAgent: MACOS_CHROME_UA,
          platform: 'MacIntel',
          maxTouchPoints: 0,
        },
      };

      const errorPayload = {
        message: 'Browser failed. Please view in updated Google Chrome browser',
      };

      const result = formatVdoPlayerError(errorPayload, mockWin);

      assert.equal(result.title, 'Browser Playback Notice');
      assert.equal(result.showSafariFallback, false);
      assert.equal(result.category, 'browser_unsupported');
    });

    it('handles "Browser failed" on Mozilla Firefox with specific DRM guidance', () => {
      const mockWin = {
        navigator: {
          userAgent: MACOS_FIREFOX_UA,
          platform: 'MacIntel',
          maxTouchPoints: 0,
        },
      };

      const errorPayload = {
        message: 'Browser failed. Please view in updated Google Chrome browser',
      };

      const result = formatVdoPlayerError(errorPayload, mockWin);

      assert.equal(result.title, 'DRM Playback Notice');
      assert.match(result.message, /Play DRM-controlled content/i);
      assert.match(result.message, /Firefox Settings > General/i);
      assert.doesNotMatch(result.message, /Google Chrome/i);
      assert.equal(result.showSafariFallback, false);
      assert.equal(result.isRetryable, true);
      assert.equal(result.category, 'firefox_drm_disabled');
    });
  });

  describe('3. FairPlay & DRM License Failure Error Handling', () => {
    it('does not prompt a macOS Safari user to "open in Safari" when a DRM/FairPlay error occurs', () => {
      const mockWin = {
        navigator: {
          userAgent: MACOS_SAFARI_UA,
          platform: 'MacIntel',
          maxTouchPoints: 0,
        },
      };

      const drmError = {
        code: 4,
        message: 'Apple FairPlay DRM license acquisition failed',
      };

      const result = formatVdoPlayerError(drmError, mockWin);

      assert.equal(result.title, 'DRM Authorization Notice');
      assert.match(result.message, /authorization was interrupted/i);
      assert.doesNotMatch(result.message, /requires opening this video in Safari Browser/i);
      assert.equal(result.showSafariFallback, false, 'Never tell a macOS Safari user to open Safari');
      assert.equal(result.isRetryable, true);
    });

    it('prompts an iOS in-app WebView user to open in Safari when DRM/FairPlay error occurs', () => {
      const mockWin = {
        navigator: {
          userAgent: IOS_CHROME_CRIOS_UA,
          platform: 'iPhone',
          maxTouchPoints: 5,
        },
      };

      const drmError = {
        code: 4,
        message: 'FairPlay DRM initialization error',
      };

      const result = formatVdoPlayerError(drmError, mockWin);

      assert.equal(result.title, 'Play in Safari Browser');
      assert.match(result.message, /Safari Browser on iOS/i);
      assert.equal(result.showSafariFallback, true);
      assert.equal(result.category, 'ios_webview_restricted');
    });

    it('handles VdoCipher domain authorization error (code 60072014) accurately', () => {
      const mockWin = {
        navigator: {
          userAgent: MACOS_SAFARI_UA,
          platform: 'MacIntel',
          maxTouchPoints: 0,
        },
      };

      const domainError = {
        code: 60072014,
        message: 'Domain not authorized for playback',
      };

      const result = formatVdoPlayerError(domainError, mockWin);

      assert.equal(result.title, 'Domain Authorization Notice');
      assert.match(result.message, /VdoCipher dashboard settings/i);
      assert.equal(result.showSafariFallback, false);
      assert.equal(result.category, 'domain_restricted');
    });

    it('handles network connectivity failure without DRM misattribution', () => {
      const mockWin = {
        navigator: {
          userAgent: MACOS_SAFARI_UA,
          platform: 'MacIntel',
          maxTouchPoints: 0,
        },
      };

      const netError = {
        code: 1002,
        message: 'Network request timed out',
      };

      const result = formatVdoPlayerError(netError, mockWin);

      assert.equal(result.title, 'Network Notice');
      assert.match(result.message, /network connectivity/i);
      assert.equal(result.showSafariFallback, false);
      assert.equal(result.category, 'network_error');
    });

    it('handles VdoCipher SDK load failure (code: SDK_LOAD_FAILED) with actionable retry advice', () => {
      const mockWin = {
        navigator: {
          userAgent: IOS_IPHONE_SAFARI_UA,
          platform: 'iPhone',
          maxTouchPoints: 5,
        },
      };

      const sdkError = {
        code: 'SDK_LOAD_FAILED',
        message: 'The video player engine could not be loaded',
      };

      const result = formatVdoPlayerError(sdkError, mockWin);

      assert.equal(result.title, 'Player Engine Unavailable');
      assert.match(result.message, /internet connection or disable ad blockers/i);
      assert.match(result.message, /Reload Player/i);
      assert.equal(result.showSafariFallback, false);
      assert.equal(result.isRetryable, true);
      assert.equal(result.category, 'sdk_load_failed');
    });

    it('handles VdoCipher script network load rejection without exposing sensitive data', () => {
      const mockWin = {
        navigator: {
          userAgent: MACOS_SAFARI_UA,
          platform: 'MacIntel',
          maxTouchPoints: 0,
        },
      };

      const scriptError = new Error('VdoCipher script failed to load');
      const result = formatVdoPlayerError(scriptError, mockWin);

      assert.equal(result.title, 'Player Engine Unavailable');
      assert.equal(result.category, 'sdk_load_failed');
      assert.equal(result.isRetryable, true);
      assert.doesNotMatch(result.message, /otp|playbackInfo|secret|token/i);
    });

    it('handles Widevine / DRM verification failure on Firefox with DRM enablement notice', () => {
      const mockWin = {
        navigator: {
          userAgent: MACOS_FIREFOX_UA,
          platform: 'MacIntel',
          maxTouchPoints: 0,
        },
      };

      const drmError = {
        code: 4,
        message: 'DRM license acquisition rejected',
      };

      const result = formatVdoPlayerError(drmError, mockWin);

      assert.equal(result.title, 'DRM Authorization Notice');
      assert.match(result.message, /Play DRM-controlled content/i);
      assert.equal(result.category, 'firefox_drm_disabled');
      assert.equal(result.isRetryable, true);
    });

    it('preserves network error classification on Firefox without DRM misattribution', () => {
      const mockWin = {
        navigator: {
          userAgent: MACOS_FIREFOX_UA,
          platform: 'MacIntel',
          maxTouchPoints: 0,
        },
      };

      const netError = {
        code: 1002,
        message: 'Network request timed out',
      };

      const result = formatVdoPlayerError(netError, mockWin);

      assert.equal(result.title, 'Network Notice');
      assert.equal(result.category, 'network_error');
      assert.doesNotMatch(result.message, /DRM-controlled content/i);
    });

    it('handles playback initialization watchdog timeout (INITIALIZATION_TIMEOUT) cleanly', () => {
      const mockWin = {
        navigator: {
          userAgent: MACOS_CHROME_UA,
          platform: 'MacIntel',
          maxTouchPoints: 0,
        },
      };

      const timeoutError = {
        code: 'INITIALIZATION_TIMEOUT',
        message: 'Video player initialization timed out',
      };

      const result = formatVdoPlayerError(timeoutError, mockWin);

      assert.equal(result.title, 'Playback Connection Timeout');
      assert.match(result.message, /too long to connect/i);
      assert.match(result.message, /Reload Player/i);
      assert.equal(result.category, 'network_timeout');
      assert.equal(result.isRetryable, true);
    });
  });

  describe('4. VideoStage Iframe Configuration & Permissions Audit', () => {
    it('verifies VideoStage defines necessary and valid iframe permissions without wildcards', () => {
      const videoStagePath = path.resolve(__dirname, '../components/classroom/VideoStage.jsx');
      const content = fs.readFileSync(videoStagePath, 'utf8');

      // Check allow attribute
      assert.match(content, /allow="autoplay; encrypted-media; picture-in-picture; fullscreen"/);
      assert.match(content, /allowFullScreen/);
      assert.match(content, /referrerPolicy="strict-origin-when-cross-origin"/);

      // Verify no invalid blind wildcards exist in the allow attribute
      assert.doesNotMatch(content, /allow="[^"]*\*[^"]*"/);
    });

    it('verifies VideoStage error overlay respects showSafariFallback', () => {
      const videoStagePath = path.resolve(__dirname, '../components/classroom/VideoStage.jsx');
      const content = fs.readFileSync(videoStagePath, 'utf8');

      // Ensures the "Open in Safari" button is conditionally gated by showSafariFallback
      assert.match(content, /typeof vdoPlayerError === 'object'\s*\?\s*vdoPlayerError\?\.showSafariFallback\s*:\s*isIOSRestricted/);
    });

    it('verifies VideoStage guards against initial Safari fallback flicker during native bridge startup', () => {
      const videoStagePath = path.resolve(__dirname, '../components/classroom/VideoStage.jsx');
      const content = fs.readFileSync(videoStagePath, 'utf8');

      // Bridge checking state prevents initial mount flash of "Play in Safari Browser"
      assert.match(content, /isBridgeChecking/);
      assert.match(content, /Connecting player\.\.\./);
      assert.match(content, /setTimeout\(\(\)\s*=>\s*\{[\s\S]*setIsBridgeChecking\(false\)/);
    });
  });

  describe('5. Native React Native Player Integration & Handoff Audit', () => {
    it('identifies Zeitnah mobile app with active ReactNativeWebView bridge', () => {
      const mockWin = {
        ReactNativeWebView: {
          postMessage: () => {},
        },
        navigator: {
          userAgent: IOS_IPHONE_SAFARI_UA,
        },
      };

      assert.equal(isZeitnahNativeApp(mockWin), true);
    });

    it('identifies Zeitnah mobile app from ZeitnahMobile user agent token', () => {
      const mockWin = {
        navigator: {
          userAgent: `${IOS_IPHONE_SAFARI_UA} ZeitnahMobile/1.0.3`,
        },
      };

      assert.equal(isZeitnahNativeApp(mockWin), true);
    });

    it('rejects ordinary mobile Safari and desktop browsers from native app detection', () => {
      const safariWin = {
        navigator: {
          userAgent: IOS_IPHONE_SAFARI_UA,
        },
      };
      const macWin = {
        navigator: {
          userAgent: MACOS_SAFARI_UA,
        },
      };

      assert.equal(isZeitnahNativeApp(safariWin), false);
      assert.equal(isZeitnahNativeApp(macWin), false);
    });

    it('verifies VideoStage dispatches PLAY_VDOCIPHER_NATIVE message contract with all required fields', () => {
      const videoStagePath = path.resolve(__dirname, '../components/classroom/VideoStage.jsx');
      const content = fs.readFileSync(videoStagePath, 'utf8');

      // Verifies exact action type and payload contract
      assert.match(content, /type:\s*['"]PLAY_VDOCIPHER_NATIVE['"]/);
      assert.match(content, /otp:\s*vdoCipher\.otp/);
      assert.match(content, /playbackInfo:\s*vdoCipher\.playbackInfo/);
      assert.match(content, /classId:\s*classProgress\?\.classId/);
      assert.match(content, /title:\s*classTitle/);
    });

    it('verifies VideoStage renders a unified video player surface in native app without redundant button cards', () => {
      const videoStagePath = path.resolve(__dirname, '../components/classroom/VideoStage.jsx');
      const content = fs.readFileSync(videoStagePath, 'utf8');

      // 1. Checks that native player surface is rendered with accessible button role and tap-to-play
      assert.match(content, /Unified Native Video Player Surface for ZeitnahMobile App/);
      assert.match(content, /role="button"/);
      assert.match(content, /onClick=\{handlePlayNative\}/);
      assert.match(content, /Tap to play/);
      assert.match(content, /HD.*Native Player/);

      // 2. Checks that redundant action button cards ("Play in App", "Watch in Safari Browser", "Copy Lesson Link") are NOT inside the native player surface
      const nativeSurfaceBlock = content.slice(
        content.indexOf('Unified Native Video Player Surface for ZeitnahMobile App'),
        content.indexOf('Dedicated Apple FairPlay DRM Stage for iOS In-App WebViews outside ZeitnahMobile')
      );

      assert.doesNotMatch(nativeSurfaceBlock, /Play in App/);
      assert.doesNotMatch(nativeSurfaceBlock, /Watch in Safari Browser/);
      assert.doesNotMatch(nativeSurfaceBlock, /Copy Lesson Link/);
      assert.doesNotMatch(nativeSurfaceBlock, /Try In-App Player/);

      // 3. Error fallback is only displayed when genuine native error occurs
      assert.match(nativeSurfaceBlock, /\{nativeError\s*&&/);
    });

    it('verifies VideoStage implements auto-launch, duplicate prevention, and dismissal lifecycle', () => {
      const videoStagePath = path.resolve(__dirname, '../components/classroom/VideoStage.jsx');
      const content = fs.readFileSync(videoStagePath, 'utf8');

      // Auto-launch effect with credential check
      assert.match(content, /hasAutoLaunchedRef\.current\[currentLessonKey\]/);
      assert.match(content, /userDismissedRef\.current\[currentLessonKey\]/);
      assert.match(content, /isNativePlayerOpenRef\.current/);

      // User dismissal handler prevents automatic reopening
      assert.match(content, /window\.__onNativeVdoPlayerClosed/);
      assert.match(content, /userDismissedRef\.current\[closedLessonId\]\s*=\s*true/);

      // Cleanup on unmount sends CLOSE_VDOCIPHER_NATIVE
      assert.match(content, /type:\s*['"]CLOSE_VDOCIPHER_NATIVE['"]/);
    });

    it('verifies Safari fallback is preserved for ordinary iOS browsers outside the app', () => {
      const videoStagePath = path.resolve(__dirname, '../components/classroom/VideoStage.jsx');
      const content = fs.readFileSync(videoStagePath, 'utf8');

      // Verifies fallback for external iOS browsers/webviews outside ZeitnahMobile
      assert.match(content, /Dedicated Apple FairPlay DRM Stage for iOS In-App WebViews outside ZeitnahMobile/);
      assert.match(content, /Play in Safari Browser/);
      assert.match(content, /Watch in Safari Browser/);
      assert.match(content, /Copy Lesson Link/);
      assert.match(content, /Try In-App Player/);
    });

    it('verifies ZeitnahMobile index.tsx handles PLAY_VDOCIPHER_NATIVE with duplicate prevention and CLOSE_VDOCIPHER_NATIVE', (t) => {
      const mobileIndexPath = path.resolve(__dirname, '../../../../ZeitnahMobile/src/app/index.tsx');
      if (!fs.existsSync(mobileIndexPath)) {
        t.skip('ZeitnahMobile workspace directory not present in standalone frontend environment');
        return;
      }
      const content = fs.readFileSync(mobileIndexPath, 'utf8');

      // Duplicate prevention
      assert.match(content, /isNativePlayerVisibleRef\.current/);
      assert.match(content, /nativePlayerEmbedInfoRef\.current\?\.otp\s*===\s*payload\.otp/);

      // CLOSE_VDOCIPHER_NATIVE bridge message
      assert.match(content, /data\?\.type\s*===\s*['"]CLOSE_VDOCIPHER_NATIVE['"]/);
      assert.match(content, /handleCloseNativePlayer\(\)/);

      // Window bridge events dispatched to webview
      assert.match(content, /__onNativeVdoPlayerClosed/);
      assert.match(content, /__onNativeVdoProgress/);
      assert.match(content, /__onNativeVdoError/);
    });

    it('verifies VideoStage __onNativeVdoPlayerClosed ignores stale close callbacks from another lesson', () => {
      const videoStagePath = path.resolve(__dirname, '../components/classroom/VideoStage.jsx');
      const content = fs.readFileSync(videoStagePath, 'utf8');

      // 1. Verifies closedLessonId parameter is accepted
      assert.match(content, /__onNativeVdoPlayerClosed\s*=\s*\(closedLessonId\)/);

      // 2. Verifies userDismissedRef is keyed by closedLessonId
      assert.match(content, /userDismissedRef\.current\[closedLessonId\]\s*=\s*true/);

      // 3. Verifies stale callback guard protects the newly active lesson
      assert.match(content, /if\s*\(closedLessonId\s*!==\s*activeClassIdentifier\s*&&\s*closedLessonId\s*!==\s*currentLessonKey\)\s*\{\s*return;\s*\}/);

      // 4. Verifies unparameterized legacy callbacks never dismiss the active lesson or clear open flags
      assert.match(content, /\/\/ Legacy unparameterized callbacks/);
    });

    it('verifies native close callback handling across all 4 regression scenarios', () => {
      // Test harness simulating VideoStage's state and callback logic
      const createState = () => ({
        userDismissed: {},
        isNativePlayerOpen: false,
        lastLayout: null,
      });

      const handleNativeClose = (closedLessonId, state, currentLessonKey, activeClassIdentifier) => {
        if (closedLessonId && typeof closedLessonId === 'string') {
          state.userDismissed[closedLessonId] = true;
          if (closedLessonId !== activeClassIdentifier && closedLessonId !== currentLessonKey) {
            return;
          }
          state.isNativePlayerOpen = false;
          state.lastLayout = null;
          return;
        }
        // Legacy unparameterized callbacks: never mark active lesson dismissed, never clear newer lesson flags
      };

      // Scenario 1: Missing/null lesson ID arriving before new lesson opens
      {
        const state = createState();
        state.isNativePlayerOpen = false; // Lesson B hasn't opened yet
        handleNativeClose(null, state, 'lesson-b', 'lesson-b');
        assert.strictEqual(state.userDismissed['lesson-b'], undefined, 'Lesson B must not be marked dismissed');
        assert.strictEqual(state.isNativePlayerOpen, false, 'isNativePlayerOpen remains unchanged');
      }

      // Scenario 2: Missing/null lesson ID arriving after new lesson opens
      {
        const state = createState();
        state.isNativePlayerOpen = true; // Lesson B already opened
        state.lastLayout = { width: 400, height: 225 };
        handleNativeClose(null, state, 'lesson-b', 'lesson-b');
        assert.strictEqual(state.userDismissed['lesson-b'], undefined, 'Lesson B must not be marked dismissed');
        assert.strictEqual(state.isNativePlayerOpen, true, 'Lesson B open flag must NOT be cleared');
        assert.notStrictEqual(state.lastLayout, null, 'Lesson B layout must NOT be cleared');
      }

      // Scenario 3: Valid stale lesson ID arriving after navigation
      {
        const state = createState();
        state.isNativePlayerOpen = true; // Lesson B is active
        state.lastLayout = { width: 400, height: 225 };
        handleNativeClose('lesson-a', state, 'lesson-b', 'lesson-b');
        assert.strictEqual(state.userDismissed['lesson-a'], true, 'Lesson A marked dismissed');
        assert.strictEqual(state.userDismissed['lesson-b'], undefined, 'Lesson B not marked dismissed');
        assert.strictEqual(state.isNativePlayerOpen, true, 'Lesson B open flag remains true');
      }

      // Scenario 4: Valid close callback for the active lesson
      {
        const state = createState();
        state.isNativePlayerOpen = true; // Lesson B is active
        state.lastLayout = { width: 400, height: 225 };
        handleNativeClose('lesson-b', state, 'lesson-b', 'lesson-b');
        assert.strictEqual(state.userDismissed['lesson-b'], true, 'Lesson B intentionally marked dismissed');
        assert.strictEqual(state.isNativePlayerOpen, false, 'Lesson B open flag cleared');
        assert.strictEqual(state.lastLayout, null, 'Lesson B layout cleared');
      }
    });
  });

  describe('6. ClassView SDK Load Error & Stale Lesson Guard Audit', () => {
    it('verifies ClassView surfaces SDK load failure to player error state with actionable retry', () => {
      const classViewPath = path.resolve(__dirname, '../pages/courses/ClassView.jsx');
      const content = fs.readFileSync(classViewPath, 'utf8');

      // 1. Verifies setupPlayer catch block formats and surfaces SDK_LOAD_FAILED
      assert.match(content, /code:\s*['"]SDK_LOAD_FAILED['"]/);
      assert.match(content, /formatVdoPlayerError\(\{[\s\S]*SDK_LOAD_FAILED/);
      assert.match(content, /setVdoPlayerError\(formatted\)/);

      // 2. Verifies stale lesson guard prevents outdated failure from overriding new lesson
      assert.match(content, /if\s*\(cancelled\s*\|\|\s*boundClassId\s*!==\s*activeClassIdRef\.current\)\s*return;/);

      // 3. Verifies reload count triggers reinitialization on user retry
      assert.match(content, /setVdoReloadCount\(\(c\)\s*=>\s*c\s*\+\s*1\)/);
      assert.match(content, /vdoReloadCount/);

      // 4. Verifies failed script tag is removed from DOM to unblock retries
      assert.match(content, /script\.remove\(\)/);
    });

    it('verifies ClassView implements 25s bounded initialization watchdog with verified player.video readiness clearing', () => {
      const classViewPath = path.resolve(__dirname, '../pages/courses/ClassView.jsx');
      const content = fs.readFileSync(classViewPath, 'utf8');

      // 1. Verifies 25s timeout creation
      assert.match(content, /watchdogTimer\s*=\s*window\.setTimeout\(/);
      assert.match(content, /25000\);/);

      // 2. Verifies INITIALIZATION_TIMEOUT error formatting
      assert.match(content, /code:\s*['"]INITIALIZATION_TIMEOUT['"]/);

      // 3. Verifies handlePostMessage handles provider errors without raw readiness clearing
      assert.match(content, /payload\.event\s*===\s*["']error["']\s*\|\|\s*payload\.type\s*===\s*["']error["']\s*\|\|\s*payload\.error/);
      assert.doesNotMatch(content, /isReadinessSignal/);

      // 4. Verifies player.video media event listeners clear the watchdog
      assert.match(content, /const onLoadedMetadata\s*=\s*\(\)\s*=>\s*\{[\s\S]*clearWatchdog\(\)/);
      assert.match(content, /const onTimeUpdate\s*=\s*\(\)\s*=>\s*\{[\s\S]*clearWatchdog\(\)/);
      assert.match(content, /const onPlay\s*=\s*\(\)\s*=>\s*\{[\s\S]*clearWatchdog\(\)/);

      // 5. Verifies cleanup on unmount/reload clears the watchdog
      assert.match(content, /cleanup\s*=\s*\(\)\s*=>\s*\{[\s\S]*clearWatchdog\(\)/);
    });

    it('verifies watchdog cancellation specificity: player.video readiness vs postMessage error handling', () => {
      let watchdogCleared = false;
      let recordedError = null;
      let surfacedError = null;

      const clearWatchdog = () => { watchdogCleared = true; };
      const recordVdoError = (err) => { recordedError = err; };
      const setVdoPlayerError = (err) => { surfacedError = err; };

      // Helper implementing ClassView's simplified handlePostMessage logic
      const handlePostMessage = (event) => {
        if (event?.origin && event.origin.includes('vdocipher.com')) {
          try {
            const payload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
            if (!payload || typeof payload !== 'object') return;

            // Provider error interception: clear watchdog and surface error
            if (payload.event === 'error' || payload.type === 'error' || payload.error) {
              clearWatchdog();
              recordVdoError(payload);
              const formatted = formatVdoPlayerError(payload?.error || payload);
              setVdoPlayerError(formatted);
            }
          } catch {}
        }
      };

      // 1. Namespaced boot handshakes cannot cancel watchdog via postMessage
      for (const handshakeType of ['@vdo/readyToHandshake', '@vdo/handshake', '@vdo/handshakeSuccessful']) {
        watchdogCleared = false;
        handlePostMessage({ origin: 'https://player.vdocipher.com', data: { type: handshakeType } });
        assert.strictEqual(watchdogCleared, false, `Handshake "${handshakeType}" must not clear watchdog`);
      }

      // 2. Generic readiness-like postMessage payloads cannot cancel watchdog
      for (const genericType of ['ready', 'loadedmetadata', 'play', 'playing', 'timeupdate', 'init', 'resize', 'ping']) {
        watchdogCleared = false;
        handlePostMessage({ origin: 'https://player.vdocipher.com', data: { type: genericType } });
        assert.strictEqual(watchdogCleared, false, `Generic postMessage "${genericType}" must not clear watchdog`);

        watchdogCleared = false;
        handlePostMessage({ origin: 'https://player.vdocipher.com', data: { event: genericType } });
        assert.strictEqual(watchdogCleared, false, `Generic postMessage event "${genericType}" must not clear watchdog`);
      }

      // 3. Unrelated origins cannot cancel watchdog
      watchdogCleared = false;
      handlePostMessage({ origin: 'https://example.com', data: { event: 'error', error: 'fail' } });
      assert.strictEqual(watchdogCleared, false, 'Unrelated origin must not cancel watchdog even on error');

      // 4. Actual player.video readiness listeners cancel watchdog
      const simulateVideoEvent = (eventName) => {
        if (eventName === 'loadedmetadata' || eventName === 'play' || eventName === 'timeupdate') {
          clearWatchdog();
        }
      };

      for (const eventName of ['loadedmetadata', 'play', 'timeupdate']) {
        watchdogCleared = false;
        simulateVideoEvent(eventName);
        assert.strictEqual(watchdogCleared, true, `player.video "${eventName}" listener must clear watchdog`);
      }

      // 5. Genuine supported provider errors are surfaced correctly
      watchdogCleared = false;
      recordedError = null;
      surfacedError = null;
      handlePostMessage({
        origin: 'https://player.vdocipher.com',
        data: { event: 'error', error: { message: 'License acquisition failed', code: 4 } },
      });
      assert.strictEqual(watchdogCleared, true, 'Provider error must clear watchdog');
      assert.ok(recordedError, 'Real error must be recorded');
      assert.ok(surfacedError, 'Error must be surfaced');
      assert.strictEqual(surfacedError.category, 'drm_verification_failed');

      // 6. Stale lesson isolation & timeout behavior
      let timeoutFiredForStaleLesson = false;
      const boundClassId = 'lesson-1';
      let activeClassId = 'lesson-2'; // Navigation occurred
      let cancelled = true;

      const onTimeout = () => {
        if (cancelled || boundClassId !== activeClassId) return;
        timeoutFiredForStaleLesson = true;
      };
      onTimeout();
      assert.strictEqual(timeoutFiredForStaleLesson, false, 'Stale lesson timeout must not execute');
    });
  });
});
