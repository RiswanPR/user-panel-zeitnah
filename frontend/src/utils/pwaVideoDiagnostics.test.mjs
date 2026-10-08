import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getDisplayMode,
  getNavigatorStandalone,
  isStandalonePwa,
  getUserAgent,
  checkEmeAvailability,
  probeWidevineKeySystem,
  probeFairPlayKeySystem,
  getMediaSourceSupport,
  getServiceWorkerStatus,
  getStorageAvailability,
  getOriginInfo,
  recordOtpStatus,
  recordIframeStatus,
  recordVdoError,
  runPwaVideoDiagnostics,
} from './pwaVideoDiagnostics.js';

describe('PWA Video & DRM Diagnostic Telemetry Engine', () => {
  it('detects standalone display mode via matchMedia', () => {
    const mockWin = {
      matchMedia: (query) => ({
        matches: query === '(display-mode: standalone)',
      }),
    };
    assert.equal(getDisplayMode(mockWin), 'standalone');
    assert.equal(isStandalonePwa(mockWin), true);
  });

  it('detects iOS navigator.standalone', () => {
    const mockWin = {
      matchMedia: () => ({ matches: false }),
      navigator: { standalone: true },
    };
    assert.equal(getNavigatorStandalone(mockWin), true);
    assert.equal(isStandalonePwa(mockWin), true);
  });

  it('detects normal browser tab', () => {
    const mockWin = {
      matchMedia: (query) => ({
        matches: query === '(display-mode: browser)',
      }),
      navigator: { standalone: false },
    };
    assert.equal(getDisplayMode(mockWin), 'browser');
    assert.equal(isStandalonePwa(mockWin), false);
  });

  it('checks EME availability accurately', () => {
    assert.equal(checkEmeAvailability(null), false);
    assert.equal(checkEmeAvailability({ navigator: {} }), false);
    assert.equal(
      checkEmeAvailability({ navigator: { requestMediaKeySystemAccess: () => {} } }),
      true
    );
  });

  it('handles probeWidevineKeySystem rejection gracefully without throwing', async () => {
    const mockWin = {
      navigator: {
        requestMediaKeySystemAccess: async () => {
          const err = new Error('Not supported');
          err.name = 'NotSupportedError';
          throw err;
        },
      },
    };
    const res = await probeWidevineKeySystem(mockWin);
    assert.equal(res.status, 'rejected');
    assert.equal(res.errorName, 'NotSupportedError');
  });

  it('handles probeFairPlayKeySystem support resolution', async () => {
    const mockWin = {
      navigator: {
        requestMediaKeySystemAccess: async (keySystem) => {
          if (keySystem === 'com.apple.fps') {
            return { keySystem: 'com.apple.fps' };
          }
          throw new Error('Unsupported');
        },
      },
    };
    const res = await probeFairPlayKeySystem(mockWin);
    assert.equal(res.status, 'supported');
    assert.equal(res.keySystem, 'com.apple.fps');
  });

  it('inspects MediaSource and ManagedMediaSource presence', () => {
    const mockWin = {
      MediaSource: function () {},
      ManagedMediaSource: function () {},
    };
    const res = getMediaSourceSupport(mockWin);
    assert.equal(res.hasMediaSource, true);
    assert.equal(res.hasManagedMediaSource, true);
  });

  it('inspects ServiceWorker controller state', () => {
    const mockWin = {
      navigator: {
        serviceWorker: {
          controller: { state: 'activated' },
        },
      },
    };
    const res = getServiceWorkerStatus(mockWin);
    assert.equal(res.supported, true);
    assert.equal(res.hasController, true);
    assert.equal(res.state, 'activated');
  });

  it('guarantees recordOtpStatus NEVER exposes raw OTP or playbackInfo secrets', () => {
    const telemetry = recordOtpStatus({
      status: 200,
      hasOtp: true,
      hasPlaybackInfo: true,
      videoSource: 'vdocipher',
    });
    assert.equal(telemetry.event, 'OTP_FETCH_STATUS');
    assert.equal(telemetry.hasOtp, true);
    assert.equal(telemetry.hasPlaybackInfo, true);
    // Explicitly verify no secret keys exist
    assert.equal(Object.prototype.hasOwnProperty.call(telemetry, 'otp'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(telemetry, 'playbackInfo'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(telemetry, 'authorization'), false);
  });

  it('redacts tokens and signatures in recordVdoError', () => {
    const mockErr = {
      code: 4,
      message: 'DRM license error with token 1234567890abcdef1234567890abcdef failed',
    };
    const telemetry = recordVdoError(mockErr);
    assert.equal(telemetry.code, 4);
    assert.ok(!telemetry.sanitizedMessage.includes('1234567890abcdef1234567890abcdef'));
    assert.ok(telemetry.sanitizedMessage.includes('[TOKEN_REDACTED]'));
  });

  it('executes full runPwaVideoDiagnostics without error', async () => {
    const mockWin = {
      matchMedia: () => ({ matches: false }),
      navigator: {
        standalone: false,
        userAgent: 'MockAgent/1.0',
        cookieEnabled: true,
        requestMediaKeySystemAccess: async () => ({ keySystem: 'com.widevine.alpha' }),
      },
      location: { origin: 'https://zeitnahacademy.com', protocol: 'https:' },
      isSecureContext: true,
      MediaSource: function () {},
      localStorage: {
        setItem: () => {},
        removeItem: () => {},
      },
      sessionStorage: {
        setItem: () => {},
        removeItem: () => {},
      },
    };

    const report = await runPwaVideoDiagnostics(mockWin);
    assert.ok(report);
    assert.equal(report.origin, 'https://zeitnahacademy.com');
    assert.equal(report.isSecureContext, true);
    assert.equal(report.widevine.status, 'supported');
  });
});
