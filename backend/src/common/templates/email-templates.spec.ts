import {
  escapeHtml,
  sanitizeUrl,
  wrapInEmailBase,
  generateOtpEmailHtml,
  generateOtpEmailText,
  generateSuspiciousLoginEmailHtml,
  generateSuspiciousLoginEmailText,
  generateSupportTicketEmailHtml,
  generateSupportTicketEmailText,
  generateCourseEnquiryNotificationEmailHtml,
  generateCourseEnquiryNotificationEmailText,
  generateTroubleshootEmailHtml,
  generateTroubleshootEmailText,
  generateProductionErrorReportEmailHtml,
  generateProductionErrorReportEmailText,
} from './email-templates';
import {
  renderAllTemplatePreviews,
  SYNTHETIC_FIXTURES,
} from './preview-fixtures';
import { buildGalleryHtml } from './generate-preview-gallery';

describe('Zeitnah Premium Email Experience — Templates & Security', () => {
  describe('escapeHtml()', () => {
    it('escapes &, <, >, ", and \' characters correctly', () => {
      const malicious = '<script>alert("XSS") & \'foo\'</script>';
      const escaped = escapeHtml(malicious);

      expect(escaped).toBe(
        '&lt;script&gt;alert(&quot;XSS&quot;) &amp; &#039;foo&#039;&lt;/script&gt;',
      );
      expect(escaped).not.toContain('<script>');
      expect(escaped).not.toContain('"');
      expect(escaped).not.toContain("'");
    });

    it('handles null, undefined, and empty string safely', () => {
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
      expect(escapeHtml('')).toBe('');
    });

    it('safely converts numbers to strings', () => {
      expect(escapeHtml(123456 as any)).toBe('123456');
    });

    it('prevents double-escaping when ampersands are escaped first', () => {
      const input = 'Fish & Chips <br>';
      const escaped = escapeHtml(input);
      expect(escaped).toBe('Fish &amp; Chips &lt;br&gt;');
      expect(escaped).not.toContain('&amp;amp;');
    });
  });

  describe('sanitizeUrl()', () => {
    it('permits valid HTTPS and HTTP URLs', () => {
      expect(sanitizeUrl('https://zeitnahacademy.com/login')).toBe(
        'https://zeitnahacademy.com/login',
      );
      expect(sanitizeUrl('http://localhost:3000/dashboard')).toBe(
        'http://localhost:3000/dashboard',
      );
    });

    it('neutralizes dangerous pseudo-protocols like javascript: and data:', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBe('https://zeitnahacademy.com');
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe(
        'https://zeitnahacademy.com',
      );
      expect(sanitizeUrl('vbscript:msgbox(1)')).toBe('https://zeitnahacademy.com');
      expect(sanitizeUrl('file:///etc/passwd')).toBe('https://zeitnahacademy.com');
    });

    it('rejects URLs containing quotes or whitespace to prevent attribute breakout', () => {
      const hostileUrl = 'https://zeitnahacademy.com/login" onmouseover="alert(1)';
      const sanitized = sanitizeUrl(hostileUrl);
      expect(sanitized).toBe('https://zeitnahacademy.com');
    });

    it('falls back to default or custom fallback when given empty or null', () => {
      expect(sanitizeUrl(null)).toBe('https://zeitnahacademy.com');
      expect(sanitizeUrl('', 'https://custom-fallback.com')).toBe(
        'https://custom-fallback.com',
      );
    });
  });

  describe('wrapInEmailBase()', () => {
    it('renders Light variant by default with 600px table container and navy header', () => {
      const html = wrapInEmailBase('<p>Hello World</p>', 'Preview Text', 'light');

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('table, td, div, p, a, span');
      expect(html).toContain('background-color: #f4f7f8');
      expect(html).toContain('max-width: 600px');
      expect(html).toContain('ZEITNAH');
      expect(html).toContain('SEE THE UNSEEN');
      expect(html).toContain('Hello World');
      expect(html).toContain('To build the best global civil community');
      expect(html).toContain('support@zeitnahacademy.com');
    });

    it('renders Dark variant for security alerts with slate canvas and container', () => {
      const html = wrapInEmailBase('<p>Security Alert</p>', 'Urgent', 'dark');

      expect(html).toContain('background-color: #0b0f19');
      expect(html).toContain('background-color: #0f172a');
      expect(html).toContain('Security Alert');
    });
  });

  describe('T1 & T2: OTP Verification Email Templates (Registration & Login)', () => {
    it('renders Registration OTP with solid card, 3-minute notice, and tap-to-select CSS', () => {
      const html = generateOtpEmailHtml('482910', 'Registration');
      const text = generateOtpEmailText('482910', 'Registration');

      expect(html).toContain('Welcome to Zeitnah');
      expect(html).toContain('482910');
      expect(html).toContain('border: 1px solid #cbd5e1'); // solid subtle border, no dashed coupon borders
      expect(html).toContain('-webkit-user-select: all'); // tap-to-select ergonomic styling
      expect(html).toContain('Valid for 3 minutes only');
      expect(html).toContain('Never share this code with anyone');

      expect(text).toContain('Welcome to Zeitnah');
      expect(text).toContain('482910');
      expect(text).toContain('Valid for 3 minutes only');
      expect(text).toContain('Security Reminder: Never share this code with anyone');
    });

    it('renders Login OTP with 3-minute notice and clean plain text', () => {
      const html = generateOtpEmailHtml('839201', 'Login');
      const text = generateOtpEmailText('839201', 'Login');

      expect(html).toContain('Login Verification');
      expect(html).toContain('839201');
      expect(html).toContain('Valid for 3 minutes only');

      expect(text).toContain('Login Verification');
      expect(text).toContain('839201');
      expect(text).toContain('Valid for 3 minutes only');
    });
  });

  describe('T3: Suspicious Login Security Alert', () => {
    it('escapes user email, session details, and flagged detection triggers', () => {
      const html = generateSuspiciousLoginEmailHtml(
        'student<script>@zeitnah.com',
        {
          deviceType: 'MacBook Pro <script>',
          browser: 'Safari "onfocus="alert(1)',
          os: 'macOS',
          ip: '192.168.1.1',
          location: 'Frankfurt & Munich',
        },
        ['<script>alert("trigger")</script>', 'Operating system changed'],
      );
      const text = generateSuspiciousLoginEmailText(
        'student<script>@zeitnah.com',
        {
          deviceType: 'MacBook Pro <script>',
          browser: 'Safari',
          os: 'macOS',
          ip: '192.168.1.1',
          location: 'Frankfurt & Munich',
        },
        ['Operating system changed'],
      );

      expect(html).not.toContain('<script>alert');
      expect(html).toContain('&lt;script&gt;alert(&quot;trigger&quot;)&lt;/script&gt;');
      expect(html).toContain('student&lt;script&gt;@zeitnah.com');
      expect(html).toContain('Frankfurt &amp; Munich');
      expect(html).toContain('Was this you?');
      expect(html).toContain("Wasn't you?");

      expect(text).toContain('Security Alert: Suspicious login attempt');
      expect(text).toContain('Operating system changed');
      expect(text).toContain('Was this you?');
    });
  });

  describe('T4: Support Ticket Email Template', () => {
    it('renders support notification in Light theme, converts newlines to <br />, and escapes content', () => {
      const ticket = {
        ticketNumber: 'ZN-SUP-9999-2026',
        name: 'John <script>alert(1)</script>',
        email: 'john@example.com',
        category: 'VIDEO_PLAYBACK',
        subject: 'Video Issue & Question "Quote"',
        message: 'Line 1\nLine 2\r\nLine 3 with <img src=x onerror=1>',
      };

      const html = generateSupportTicketEmailHtml(ticket);
      const text = generateSupportTicketEmailText(ticket);

      expect(html).not.toContain('<script>');
      expect(html).not.toContain('<img src=x');
      expect(html).toContain('John &lt;script&gt;alert(1)&lt;/script&gt;');
      expect(html).toContain('Video Issue &amp; Question &quot;Quote&quot;');
      expect(html).toContain('Line 1<br />Line 2<br />Line 3 with &lt;img src=x onerror=1&gt;');

      expect(text).toContain('New Support Ticket: ZN-SUP-9999-2026');
      expect(text).toContain('Line 1\nLine 2\r\nLine 3');
    });
  });

  describe('T5: Course Enquiry Notification Email Template', () => {
    it('escapes student name, course name, telephone, and student message', () => {
      const data = {
        courseName: 'AI & Machine Learning <script>alert(1)</script>',
        name: 'John & Jane "Doe"',
        email: 'john@example.com',
        phone: '+91 9999999999',
        message: 'Interested in cohort <img src=x onerror=alert(2) />',
      };

      const html = generateCourseEnquiryNotificationEmailHtml(data);
      const text = generateCourseEnquiryNotificationEmailText(data);

      expect(html).not.toContain('<script>');
      expect(html).not.toContain('<img src=x');
      expect(html).toContain('AI &amp; Machine Learning &lt;script&gt;alert(1)&lt;/script&gt;');
      expect(html).toContain('John &amp; Jane &quot;Doe&quot;');
      expect(html).toContain('href="tel:+91 9999999999"');
      expect(html).toContain('Interested in cohort &lt;img src=x onerror=alert(2) /&gt;');

      expect(text).toContain('Course: AI & Machine Learning <script>alert(1)</script>');
      expect(text).toContain('Student: John & Jane "Doe"');
      expect(text).toContain('Phone: +91 9999999999');
    });

    it('handles omission of optional message cleanly', () => {
      const data = {
        courseName: 'Cloud Computing',
        name: 'Alice',
        email: 'alice@example.com',
        phone: '+1 555-0100',
      };

      const html = generateCourseEnquiryNotificationEmailHtml(data);
      const text = generateCourseEnquiryNotificationEmailText(data);

      expect(html).not.toContain("Student's Message / Notes");
      expect(text).not.toContain('Message:');
    });
  });

  describe('T6: Troubleshoot Incident Report Email Template', () => {
    it('renders structured tables for console and network errors with proper escaping', () => {
      const report = {
        _id: 'rep_123',
        title: 'Player Crash on Safari <script>',
        severity: 'critical',
        pageUrl: 'https://zeitnahacademy.com/class/1',
        description: 'Crash occurred during fullscreen switch <img src=x onerror=1>',
        consoleErrors: [
          { type: 'error', message: 'DRM error: Key not found <script>', timestamp: '12:00:00' },
        ],
        networkErrors: [
          { method: 'POST', url: '/api/token?q="xss"', status: 500, message: 'Server error' },
        ],
        browserInfo: {
          browser: 'Safari',
          os: 'macOS',
          screenSize: '1920x1080',
        },
      };

      const html = generateTroubleshootEmailHtml(report, 'student@example.com', {
        label: 'CRITICAL',
        color: '#ef4444',
        emoji: '🔴',
      });
      const text = generateTroubleshootEmailText(report, 'student@example.com', {
        label: 'CRITICAL',
      });

      expect(html).not.toContain('<script>');
      expect(html).not.toContain('<img src=x');
      expect(html).toContain('Player Crash on Safari &lt;script&gt;');
      expect(html).toContain('DRM error: Key not found &lt;script&gt;');
      expect(html).toContain('/api/token?q=&quot;xss&quot;');
      expect(html).toContain('CRITICAL SEVERITY');

      expect(text).toContain('[CRITICAL] Troubleshoot Incident Report');
      expect(text).toContain('Title: Player Crash on Safari <script>');
      expect(text).toContain('Console Errors: 1');
      expect(text).toContain('Network Failures: 1');
    });
  });

  describe('T7: Production Error Incident Report Email Template', () => {
    it('renders incident report with correlation ID, monospace error details, and safe admin button', () => {
      const report = {
        source: 'AuthWorker <script>',
        correlationId: 'corr-9988-safe',
        errorDetails: 'NullPointerException at SessionManager:42 <script>alert(1)</script>',
        feedback: { whatHappened: 'User clicked login <img src=x onerror=1>' },
        adminUrl: 'https://zeitnahacademy.com/admin/incidents/123" onmouseover="alert(1)',
      };

      const html = generateProductionErrorReportEmailHtml(report);
      const text = generateProductionErrorReportEmailText(report);

      expect(html).not.toContain('<script>');
      expect(html).not.toContain('<img src=x');
      expect(html).toContain('AuthWorker &lt;script&gt;');
      expect(html).toContain('corr-9988-safe');
      expect(html).toContain('NullPointerException at SessionManager:42 &lt;script&gt;alert(1)&lt;/script&gt;');
      expect(html).toContain('User clicked login &lt;img src=x onerror=1&gt;');
      expect(html).not.toContain('onmouseover='); // attribute injection prevented

      expect(text).toContain('[CRITICAL] Production Error Report');
      expect(text).toContain('Source: AuthWorker <script>');
      expect(text).toContain('Correlation ID: corr-9988-safe');
    });
  });

  describe('Phase 4: Preview Gallery & Synthetic Fixtures Verification', () => {
    it('renders all 11 active email templates with complete synthetic fixtures', () => {
      const items = renderAllTemplatePreviews();

      expect(items).toHaveLength(11);

      const templateIds = items.map((i) => i.id);
      expect(templateIds).toEqual([
        'T1',
        'T2',
        'T3',
        'T4',
        'T5',
        'T6',
        'T7',
        'T8',
        'T9',
        'T10',
        'T11',
      ]);

      items.forEach((item) => {
        expect(item.name).toBeTruthy();
        expect(item.trigger).toBeTruthy();
        expect(item.recipient).toBeTruthy();
        expect(item.subject).toBeTruthy();
        expect(item.html).toBeTruthy();
        expect(item.text).toBeTruthy();
        expect(item.html.length).toBeGreaterThan(200);
        expect(item.text.length).toBeGreaterThan(50);
        expect(['light', 'dark']).toContain(item.variant);

        // Assert all preview recipients use RFC 2606 safe example domains
        expect(item.recipient).toMatch(/(@.*\.example\.test|@zeitnahacademy\.com)/);

        // Assert zero-dispatch guarantee: previews must never contain real production credentials
        expect(item.html).not.toContain('re_live_');
        expect(item.html).not.toContain('sk_live_');
      });
    });

    it('builds interactive HTML gallery containing iframe, controls, and responsive toggles', () => {
      const items = renderAllTemplatePreviews();
      const galleryHtml = buildGalleryHtml(items);

      expect(galleryHtml).toContain('<!DOCTYPE html>');
      expect(galleryHtml).toContain('Zeitnah • Premium Email Experience Preview Gallery');
      expect(galleryHtml).toContain('Desktop (600px)');
      expect(galleryHtml).toContain('Mobile (375px)');
      expect(galleryHtml).toContain('previewIframe');
      expect(galleryHtml).toContain('plaintextContent');
      expect(galleryHtml).toContain('Zero-Dispatch Guaranteed (Synthetic)');
      expect(galleryHtml).toContain('T1');
      expect(galleryHtml).toContain('T11');
    });
  });
});
