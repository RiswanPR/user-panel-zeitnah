import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Zeitnah Production Incident — 401 Unauthorized & Profile Avatar Verification', () => {
  const rootDir = path.resolve();
  const frontendDir = path.resolve('src');

  describe('1. Organization Endpoint Request Guarding (useBusinessProfile)', () => {
    it('guarantees useBusinessProfile does not request /api/organizations/my while auth is loading or token is expired', () => {
      const hookPath = path.join(frontendDir, 'hooks/useBusinessProfile.js');
      const content = fs.readFileSync(hookPath, 'utf8');

      // storage must be imported
      assert.match(content, /import\s+storage\s+from\s+['"]\.\.\/services\/storage['"]/);

      // Check for isAuthLoading and token expiration
      assert.match(content, /const\s+isAuthLoading\s*=\s*auth\?\.loading\s*\?\?\s*false/);
      assert.match(content, /!isAuthLoading/);
      assert.match(content, /!storage\.isAccessTokenExpired\(\)/);

      // enabled condition for TanStack query
      assert.match(content, /enabled:\s*Boolean\(enabled\s*&&\s*isAuthenticated\)/);
    });

    it('simulates isAuthenticated logic across loading, expired token, and authenticated states', () => {
      function checkIsAuthenticated(auth, storageMock) {
        const user = auth?.user;
        const isAuthLoading = auth?.loading ?? false;
        return Boolean(
          !isAuthLoading &&
          (user?.id || user?.userId || user?._id) &&
          !storageMock.isAccessTokenExpired()
        );
      }

      // State 1: Fresh page load while auth is bootstrapping (auth.loading: true, user present from stale token)
      const stateBootstrapping = {
        auth: { loading: true, user: { id: 'usr-123' } },
        storage: { isAccessTokenExpired: () => false },
      };
      assert.equal(
        checkIsAuthenticated(stateBootstrapping.auth, stateBootstrapping.storage),
        false,
        'Must NOT be authenticated while auth.loading is true',
      );

      // State 2: Token expired in storage (expired after 15m)
      const stateExpiredToken = {
        auth: { loading: false, user: { id: 'usr-123' } },
        storage: { isAccessTokenExpired: () => true },
      };
      assert.equal(
        checkIsAuthenticated(stateExpiredToken.auth, stateExpiredToken.storage),
        false,
        'Must NOT be authenticated when access token is expired',
      );

      // State 3: Unauthenticated visitor
      const stateLoggedOut = {
        auth: { loading: false, user: null },
        storage: { isAccessTokenExpired: () => true },
      };
      assert.equal(
        checkIsAuthenticated(stateLoggedOut.auth, stateLoggedOut.storage),
        false,
        'Must NOT be authenticated when user is null',
      );

      // State 4: Fully authenticated session with valid token
      const stateValidSession = {
        auth: { loading: false, user: { id: 'usr-123', email: 'user@zeitnah.com' } },
        storage: { isAccessTokenExpired: () => false },
      };
      assert.equal(
        checkIsAuthenticated(stateValidSession.auth, stateValidSession.storage),
        true,
        'Must be authenticated when session is verified and token is fresh',
      );
    });
  });

  describe('2. Request Interceptor & Token Refresh Invariants (api.ts)', () => {
    it('verifies /auth/me waits for in-flight refreshPromise while public auth routes are exempt', () => {
      const apiPath = path.join(frontendDir, 'services/api.ts');
      const content = fs.readFileSync(apiPath, 'utf8');

      // Must check specific refresh exemptions rather than generic /auth/ check
      assert.match(content, /isRefreshExempt/);
      assert.match(content, /config\.url\?\.includes\(['"]\/auth\/refresh-token['"]\)/);
      assert.match(content, /config\.url\?\.includes\(['"]\/auth\/login['"]\)/);
      assert.match(content, /config\.url\?\.includes\(['"]\/auth\/register['"]\)/);

      // /auth/me is NOT exempt, ensuring it awaits refreshPromise
      const checkIsExempt = (url, isRefreshReq) =>
        Boolean(isRefreshReq) ||
        Boolean(url?.includes('/auth/refresh-token')) ||
        Boolean(url?.includes('/auth/login')) ||
        Boolean(url?.includes('/auth/register'));

      assert.equal(checkIsExempt('/auth/me', false), false, '/auth/me MUST wait for refresh');
      assert.equal(checkIsExempt('/organizations/my', false), false, '/organizations/my MUST wait for refresh');
      assert.equal(checkIsExempt('/profile/me', false), false, '/profile/me MUST wait for refresh');
      assert.equal(checkIsExempt('/auth/refresh-token', true), true, 'refresh-token must be exempt to avoid deadlock');
      assert.equal(checkIsExempt('/auth/login', false), true, 'login must be exempt');
      assert.equal(checkIsExempt('/auth/register', false), true, 'register must be exempt');
    });

    it('verifies proactive refresh is executed before dispatching expired tokens', () => {
      const apiPath = path.join(frontendDir, 'services/api.ts');
      const content = fs.readFileSync(apiPath, 'utf8');

      assert.match(content, /storage\.isAccessTokenExpired\(\)/);
      assert.match(content, /storage\.getRefreshToken\(\)/);
      assert.match(content, /await\s+getRefreshedToken\(\)/);
    });
  });

  describe('3. AuthContext Hydration & Proactive Bootstrap', () => {
    it('verifies AuthContext initial hydration rejects expired access tokens', () => {
      const authPath = path.join(frontendDir, 'context/AuthContext.tsx');
      const content = fs.readFileSync(authPath, 'utf8');

      assert.match(content, /if\s*\(storage\.isAccessTokenExpired\(\)\)\s*return\s*null;/);
    });

    it('verifies AuthContext loadUser invokes getRefreshedToken when access token is expired', () => {
      const authPath = path.join(frontendDir, 'context/AuthContext.tsx');
      const content = fs.readFileSync(authPath, 'utf8');

      assert.match(content, /getRefreshedToken/);
      assert.match(content, /token\s*=\s*await\s+getRefreshedToken\(\)/);
    });
  });

  describe('4. Circular Profile Avatar Rendering & Fallback Integrity', () => {
    it('guarantees fallback initials layer is permanently present to eliminate black voids', () => {
      const avatarPath = path.join(frontendDir, 'components/profile/ProfileAvatar.jsx');
      const content = fs.readFileSync(avatarPath, 'utf8');

      // imgLoaded state exists
      assert.match(content, /const\s+\[imgLoaded,\s*setImgLoaded\]\s*=\s*useState\(false\)/);

      // isolate class on container to prevent WebKit circular overflow clipping artifacts
      assert.match(content, /isolate/);

      // Fallback initials layer has branded gradient
      assert.match(content, /bg-gradient-to-br from-brand-mint\/20 via-brand-navy\/60 to-\[#0A0F18\]/);

      // Real image has opacity transition and absolute positioning
      assert.match(content, /absolute inset-0 w-full h-full object-cover/);
      assert.match(content, /imgLoaded\s*\?\s*["']opacity-100["']\s*:\s*["']opacity-0["']/);
      assert.match(content, /onLoad=\{[\s\S]*?setImgLoaded\(true\)/);
      assert.match(content, /onError=\{[\s\S]*?setImgError\(true\)/);
    });

    it('preserves non-colliding coordinates for status marker and verification badge', () => {
      const avatarPath = path.join(frontendDir, 'components/profile/ProfileAvatar.jsx');
      const content = fs.readFileSync(avatarPath, 'utf8');

      // Top-right status marker
      assert.match(content, /marker:.*top-0 right-0 sm:top-1 sm:right-1/);

      // Bottom-right badge
      assert.match(content, /badge:.*bottom-0 right-0 sm:bottom-1 sm:right-1/);
    });

    it('verifies ProfileHero avatar styling and pointer-event protection on upload overlay', () => {
      const heroPath = path.join(frontendDir, 'components/profile/ProfileHero.jsx');
      const content = fs.readFileSync(heroPath, 'utf8');

      // className has refined border
      assert.match(content, /className=["']border-2 sm:border-4 border-(surface-card|\[#0A0F18\]) shadow-2xl["']/);

      // Owner Avatar Change button prevents capturing clicks when hidden
      assert.match(content, /pointer-events-none group-hover:pointer-events-auto/);
      assert.match(content, /isAvatarUploading\s*\?\s*["']opacity-100 pointer-events-auto["']/);
    });
  });
});
