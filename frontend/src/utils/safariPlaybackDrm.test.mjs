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
      assert.match(content, /userDismissedRef\.current\[currentLessonKey\]\s*=\s*true/);

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

    it('verifies ZeitnahMobile index.tsx handles PLAY_VDOCIPHER_NATIVE with duplicate prevention and CLOSE_VDOCIPHER_NATIVE', () => {
      const mobileIndexPath = path.resolve(__dirname, '../../../../ZeitnahMobile/src/app/index.tsx');
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
  });
});
