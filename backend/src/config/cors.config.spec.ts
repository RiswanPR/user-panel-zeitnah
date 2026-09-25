import {
  isOriginAllowed,
  corsOriginDelegate,
  socketCorsConfig,
  getAllowedOrigins,
} from './cors.config';

describe('CORS Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('isOriginAllowed', () => {
    it('allows production web origins if listed in CLIENT_URL', () => {
      process.env.CLIENT_URL =
        'https://zeitnah.academy,https://app.zeitnah.academy';
      expect(isOriginAllowed('https://zeitnah.academy')).toBe(true);
      expect(isOriginAllowed('https://app.zeitnah.academy')).toBe(true);
    });

    it('rejects disallowed web origins', () => {
      process.env.CLIENT_URL = 'https://zeitnah.academy';
      expect(isOriginAllowed('https://malicious-site.com')).toBe(false);
      expect(isOriginAllowed('https://zeitnah.academy.attacker.com')).toBe(
        false,
      );
      expect(isOriginAllowed('http://zeitnah.academy')).toBe(false);
    });

    it('allows localhost development origins in non-production', () => {
      process.env.NODE_ENV = 'development';
      expect(isOriginAllowed('http://localhost:5173')).toBe(true);
      expect(isOriginAllowed('http://localhost:3000')).toBe(true);
      expect(isOriginAllowed('http://127.0.0.1:5173')).toBe(true);
    });

    it('blocks localhost development origins when in production mode unless explicitly listed', () => {
      process.env.NODE_ENV = 'production';
      process.env.CLIENT_URL = 'https://zeitnah.academy';
      expect(isOriginAllowed('http://localhost:5173')).toBe(false);
    });

    it('allows mobile/Capacitor origins', () => {
      expect(isOriginAllowed('capacitor://localhost')).toBe(true);
      expect(isOriginAllowed('http://localhost')).toBe(true);
    });

    it('allows null/undefined origin for non-browser mobile native requests or server-to-server', () => {
      expect(isOriginAllowed(undefined)).toBe(true);
    });
  });

  describe('corsOriginDelegate', () => {
    it('calls callback with null, true for allowed origin', (done) => {
      process.env.CLIENT_URL = 'https://zeitnah.academy';
      corsOriginDelegate('https://zeitnah.academy', (err, allow) => {
        expect(err).toBeNull();
        expect(allow).toBe(true);
        done();
      });
    });

    it('calls callback with error or false for disallowed origin', (done) => {
      process.env.CLIENT_URL = 'https://zeitnah.academy';
      corsOriginDelegate('https://evil.com', (err, allow) => {
        expect(allow).toBe(false);
        done();
      });
    });
  });

  describe('socketCorsConfig', () => {
    it('has credentials set to true', () => {
      expect(socketCorsConfig.credentials).toBe(true);
    });

    it('has origin validator function', () => {
      expect(typeof socketCorsConfig.origin).toBe('function');
    });
  });

  describe('getAllowedOrigins', () => {
    it('returns an array of unique origins including default mobile and configured web URLs', () => {
      process.env.FRONTEND_URL = 'https://portal.zeitnah.academy';
      const origins = getAllowedOrigins();
      expect(Array.isArray(origins)).toBe(true);
      expect(origins).toContain('https://portal.zeitnah.academy');
      expect(origins).toContain('capacitor://localhost');
    });
  });
});
