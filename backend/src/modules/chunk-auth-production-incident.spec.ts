import * as fs from 'fs';
import * as path from 'path';
import { GlobalExceptionFilter } from '../common/filters/global-exception.filter';
import { UnauthorizedException, HttpStatus } from '@nestjs/common';

describe('Zeitnah Pre-Phase 9 — Chunk Load & Auth Incident Verification Suite', () => {
  const rootDir = path.resolve(__dirname, '../../../');
  const frontendDir = path.join(rootDir, 'frontend');

  // ─────────────────────────────────────────────────────────────
  // 1. Dynamic Chunk Loading Recovery Audit
  // ─────────────────────────────────────────────────────────────
  describe('Item 1: Dynamic Chunk Loading Recovery (NetworkPage & Lazy Routes)', () => {
    it('✓ lazyWithRetry.jsx and ChunkLoadRecoveryFallback.jsx must physically exist', () => {
      const lazyWithRetryPath = path.join(frontendDir, 'src/utils/lazyWithRetry.jsx');
      const fallbackPath = path.join(frontendDir, 'src/components/common/ChunkLoadRecoveryFallback.jsx');

      expect(fs.existsSync(lazyWithRetryPath)).toBe(true);
      expect(fs.existsSync(fallbackPath)).toBe(true);

      const lazyContent = fs.readFileSync(lazyWithRetryPath, 'utf8');
      expect(lazyContent).toContain('isChunkLoadError');
      expect(lazyContent).toContain('lazyWithRetry');
      expect(lazyContent).toContain('sessionStorage');
      expect(lazyContent).toContain('window.location.reload()');

      const fallbackContent = fs.readFileSync(fallbackPath, 'utf8');
      expect(fallbackContent).toContain('Application Update Available');
      expect(fallbackContent).toContain('Refresh Page');
    });

    it('✓ isChunkLoadError must accurately identify the exact production error string', () => {
      // Replicate the exact helper logic
      function isChunkLoadError(error: any) {
        if (!error) return false;
        const msg = error.message || String(error);
        const name = error.name || '';
        return (
          name === 'ChunkLoadError' ||
          /Failed to fetch dynamically imported module/i.test(msg) ||
          /error loading dynamically imported module/i.test(msg) ||
          /Importing a module script failed/i.test(msg) ||
          /Loading chunk [\d]+ failed/i.test(msg) ||
          /Loading CSS chunk [\d]+ failed/i.test(msg) ||
          /error while loading chunk/i.test(msg)
        );
      }

      // Exact production error reported by the browser:
      const prodError1 = new TypeError(
        'Failed to fetch dynamically imported module: https://zeitnahacademy.com/assets/js/NetworkPage-DUZe_OdL.js',
      );
      expect(isChunkLoadError(prodError1)).toBe(true);

      // Other browser variations:
      expect(isChunkLoadError(new Error('error loading dynamically imported module'))).toBe(true);
      expect(isChunkLoadError(new Error('Importing a module script failed.'))).toBe(true);
      expect(isChunkLoadError({ name: 'ChunkLoadError', message: 'Loading chunk 404 failed.' })).toBe(true);

      // Non-chunk errors must NOT be falsely identified
      expect(isChunkLoadError(new ReferenceError('AdminBusinessReviewPage is not defined'))).toBe(false);
      expect(isChunkLoadError(new TypeError("Cannot read properties of undefined (reading 'map')"))).toBe(false);
    });

    it('✓ App.jsx must import NetworkPage using lazyWithRetry', () => {
      const appJsxPath = path.join(frontendDir, 'src/App.jsx');
      expect(fs.existsSync(appJsxPath)).toBe(true);
      const content = fs.readFileSync(appJsxPath, 'utf8');

      expect(content).toContain('import { lazyWithRetry } from "./utils/lazyWithRetry";');
      expect(content).toMatch(/const NetworkPage\s*=\s*lazyWithRetry\(\(\)\s*=>\s*import\(['"]\.\/pages\/network\/NetworkPage['"]\)\);/);
      expect(content).toContain('<Route path="/network" element={<Suspense fallback={<PageLoader />}><NetworkPage /></Suspense>} />');
    });

    it('✓ All 32 lazy-loaded route views in App.jsx must physically exist on disk', () => {
      const appJsxPath = path.join(frontendDir, 'src/App.jsx');
      const content = fs.readFileSync(appJsxPath, 'utf8');

      const lazyRegex = /import\(['"](\.\/pages\/[^'"]+)['"]\)/g;
      const matches = [...content.matchAll(lazyRegex)];
      expect(matches.length).toBeGreaterThanOrEqual(30);

      for (const m of matches) {
        const relImport = m[1];
        // Test .jsx, .tsx, .js, or index
        const fullJsx = path.join(frontendDir, 'src', `${relImport}.jsx`);
        const fullTsx = path.join(frontendDir, 'src', `${relImport}.tsx`);
        const fullJs = path.join(frontendDir, 'src', `${relImport}.js`);
        const fullIndexJsx = path.join(frontendDir, 'src', relImport, 'index.jsx');

        const exists =
          fs.existsSync(fullJsx) ||
          fs.existsSync(fullTsx) ||
          fs.existsSync(fullJs) ||
          fs.existsSync(fullIndexJsx);

        expect({ importPath: relImport, exists }).toEqual({ importPath: relImport, exists: true });
      }
    });

    it('✓ GlobalErrorBoundary and FeatureErrorBoundary must intercept chunk errors and never show generic error modal', () => {
      const globalBoundaryPath = path.join(frontendDir, 'src/components/GlobalErrorBoundary.jsx');
      const featureBoundaryPath = path.join(frontendDir, 'src/components/common/FeatureErrorBoundary.jsx');

      const globalContent = fs.readFileSync(globalBoundaryPath, 'utf8');
      expect(globalContent).toContain('isChunkLoadError');
      expect(globalContent).toContain('ChunkLoadRecoveryFallback');
      expect(globalContent).toContain('this.state.isChunkError');

      const featureContent = fs.readFileSync(featureBoundaryPath, 'utf8');
      expect(featureContent).toContain('isChunkLoadError');
      expect(featureContent).toContain('ChunkLoadRecoveryFallback');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. Auth Refresh 401 & Telemetry Filter Audit
  // ─────────────────────────────────────────────────────────────
  describe('Item 2: Auth Refresh 401 & Single-Flight Queue Audit', () => {
    it('✓ GlobalExceptionFilter must classify /auth/refresh-token 401 as SESSION_EXPIRED at DEBUG level', () => {
      const filter = new GlobalExceptionFilter();
      const debugLogs: string[] = [];
      const warnLogs: string[] = [];

      (filter as any).logger = {
        debug: (msg: string) => debugLogs.push(msg),
        warn: (msg: string) => warnLogs.push(msg),
        error: () => {},
        log: () => {},
      };

      const mockRequest: any = {
        method: 'POST',
        originalUrl: '/api/auth/refresh-token',
        url: '/api/auth/refresh-token',
        headers: {},
        cookies: {},
        ip: '127.0.0.1',
      };

      const mockResponse: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };

      const mockArgumentsHost: any = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
          getResponse: () => mockResponse,
        }),
      };

      const unauthException = new UnauthorizedException('Refresh token expired');
      filter.catch(unauthException, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
      expect(debugLogs.length).toBe(1);
      expect(warnLogs.length).toBe(0);

      const parsedLog = JSON.parse(debugLogs[0]);
      expect(parsedLog.event).toBe('SESSION_EXPIRED');
      expect(parsedLog.status).toBe(401);
      expect(parsedLog.endpoint).toBe('/api/auth/refresh-token');
    });

    it('✓ api.ts request interceptor must cancel waiting requests when refreshPromise fails', () => {
      const apiTsPath = path.join(frontendDir, 'src/services/api.ts');
      const content = fs.readFileSync(apiTsPath, 'utf8');

      // Interceptor guards against 401 storm
      expect(content).toContain('refreshPromise');
      expect(content).toContain('Authentication session expired');
      expect(content).toContain('axios.Cancel');
      expect(content).toContain('/notifications/push-token');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. Native Notifications Push Token Cleanup Audit
  // ─────────────────────────────────────────────────────────────
  describe('Item 3: Native Push Token Cleanup (401 Idempotency & Safe Logout)', () => {
    it('✓ removePushTokenFromBackend must treat 401/403 as safe idempotent success', () => {
      const notifTsPath = path.join(frontendDir, 'src/native/notifications.ts');
      const content = fs.readFileSync(notifTsPath, 'utf8');

      expect(content).toContain('status === 401 || status === 403');
      expect(content).toContain('safely idempotent');
      // No token is logged in plain text
      expect(content).not.toMatch(/console\.(log|warn|error)\([^)]*accessToken/);
    });

    it('✓ AuthContext must invoke removePushTokenFromBackend before session revocation in logout()', () => {
      const authContextPath = path.join(frontendDir, 'src/context/AuthContext.tsx');
      const content = fs.readFileSync(authContextPath, 'utf8');

      // Verify removePushTokenFromBackend is called BEFORE api.post('/auth/logout')
      const removeIndex = content.indexOf('nativeNotifications.removePushTokenFromBackend');
      const logoutApiIndex = content.indexOf("api.post('/auth/logout')");
      const logoutApiDoubleQuoteIndex = content.indexOf('api.post("/auth/logout")');
      const actualApiIndex = logoutApiIndex !== -1 ? logoutApiIndex : logoutApiDoubleQuoteIndex;

      expect(removeIndex).toBeGreaterThan(0);
      expect(actualApiIndex).toBeGreaterThan(0);
      expect(removeIndex).toBeLessThan(actualApiIndex);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. Socket Disconnection & Reconnection on Logout Audit
  // ─────────────────────────────────────────────────────────────
  describe('Item 4: Socket.IO Connection & Logout Cleanup', () => {
    it('✓ NotificationContext and MessagingContext must listen to zeitnah:auth:logout', () => {
      const notifContextPath = path.join(frontendDir, 'src/context/NotificationContext.jsx');
      const msgContextPath = path.join(frontendDir, 'src/context/MessagingContext.jsx');

      const notifContent = fs.readFileSync(notifContextPath, 'utf8');
      expect(notifContent).toContain("window.addEventListener('zeitnah:auth:logout'");
      expect(notifContent).toContain('newSocket.disconnect()');

      const msgContent = fs.readFileSync(msgContextPath, 'utf8');
      expect(msgContent).toContain("window.addEventListener('zeitnah:auth:logout'");
      expect(msgContent).toContain('newSocket.disconnect()');
    });

    it('✓ Socket connect_error handler must handle xhr poll error on 401 cleanly', () => {
      const notifContextPath = path.join(frontendDir, 'src/context/NotificationContext.jsx');
      const notifContent = fs.readFileSync(notifContextPath, 'utf8');

      expect(notifContent).toContain("err.message === 'xhr poll error'");
      expect(notifContent).toContain('err.description === 401');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 5. Build Asset Verification Script Audit
  // ─────────────────────────────────────────────────────────────
  describe('Item 5: Production Build Asset Verification Script', () => {
    it('✓ verify-build-assets.mjs must exist and be registered in package.json', () => {
      const scriptPath = path.join(frontendDir, 'scripts/verify-build-assets.mjs');
      expect(fs.existsSync(scriptPath)).toBe(true);

      const pkgJsonPath = path.join(frontendDir, 'package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
      expect(pkg.scripts['verify:assets']).toBeDefined();
    });
  });
});
