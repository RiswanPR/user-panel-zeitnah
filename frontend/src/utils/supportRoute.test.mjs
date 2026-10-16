import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Zeitnah LMS Support Page Production Integrity Suite', () => {
  const appJsxPath = path.resolve('src/App.jsx');
  const supportPagePath = path.resolve('src/pages/support/SupportPage.jsx');
  const supportServicePath = path.resolve('src/services/supportService.js');
  const footerPath = path.resolve('src/components/navigation/Footer.jsx');

  it('verifies App.jsx registers the public /support and /help routes without ProtectedRoute', () => {
    assert.ok(fs.existsSync(appJsxPath), 'src/App.jsx must exist');
    const content = fs.readFileSync(appJsxPath, 'utf8');

    // Lazy import
    assert.match(content, /const SupportPage = lazyWithRetry\(/);

    // Public route under MainLayout without ProtectedRoute
    assert.match(content, /path=["']\/support["']/);
    assert.match(content, /<SupportPage\s*\/>/);

    // Alias redirect: /help -> /support
    assert.match(content, /path=["']\/help["']/);
    assert.match(content, /to=["']\/support["']/);

    // Make sure /support is NOT inside ProtectedRoute
    const protectedIndex = content.indexOf('<ProtectedRoute>');
    const supportIndex = content.indexOf('path="/support"');
    assert.ok(supportIndex > 0, 'Support route must exist');
    assert.ok(supportIndex < protectedIndex, 'Support route must be publicly accessible before ProtectedRoute');
  });

  it('verifies SupportPage.jsx exists and contains all 9 verified platform support categories', () => {
    assert.ok(fs.existsSync(supportPagePath), 'src/pages/support/SupportPage.jsx must exist');
    const content = fs.readFileSync(supportPagePath, 'utf8');

    const expectedCategories = [
      'ACCOUNT_LOGIN',
      'ACCOUNT_RECOVERY',
      'COURSE_ACCESS',
      'VIDEO_PLAYBACK',
      'PAYMENTS_ENROLLMENT',
      'PROFILE_SETTINGS',
      'NOTIFICATIONS',
      'TECHNICAL_ISSUE',
      'ACCOUNT_DELETION',
    ];

    expectedCategories.forEach((catId) => {
      assert.match(content, new RegExp(`id:\\s*["']${catId}["']`), `CATEGORIES must contain category id "${catId}"`);
      assert.match(content, new RegExp(`value=["']${catId}["']`), `Select dropdown must contain option value "${catId}"`);
    });
  });

  it('verifies practical FAQs are defined and based on verified platform behavior', () => {
    const content = fs.readFileSync(supportPagePath, 'utf8');

    // Key verified platform FAQs
    assert.match(content, /faq-login-otp/);
    assert.match(content, /faq-account-recovery/);
    assert.match(content, /faq-video-watermark/);
    assert.match(content, /faq-video-download/);
    assert.match(content, /faq-device-limit/);
    assert.match(content, /faq-course-enrollment/);
    assert.match(content, /faq-account-deletion/);

    // Check forensic watermark rationale
    assert.match(content, /forensic watermark/i);
    assert.match(content, /VdoCipher/);
  });

  it('verifies Apple App Store Guideline 5.1.1(v) account deletion pathways are implemented', () => {
    const content = fs.readFileSync(supportPagePath, 'utf8');

    // Apple App Store reference
    assert.match(content, /Apple App Store Guideline 5\.1\.1\(v\)/);

    // In-app deletion path
    assert.match(content, /Profile\s*&gt;\s*Account\s*&gt;\s*Security|Profile > Account > Security/);

    // Link to privacy policy
    assert.match(content, /to=["']\/privacy-policy["']/);
  });

  it('verifies verified contact details and clearly marked placeholders', () => {
    const content = fs.readFileSync(supportPagePath, 'utf8');

    // Verified transactional email sender
    assert.match(content, /noreply@zeitnahacademy\.com/);

    // Marked configurable support email placeholder
    assert.match(content, /\[Placeholder: support@zeitnahacademy\.com/);
    assert.match(content, /\[Placeholder: privacy@zeitnahacademy\.com/);

    // Verified Operating Legal Entity
    assert.match(content, /ZEITNAH INSTITUTE OF SURVEY LLP/);
    assert.match(content, /Mankavu, Kozhikode, Kerala 673007, India/);
  });

  it('verifies interactive support ticket form with validation and honeypot spam protection', () => {
    const content = fs.readFileSync(supportPagePath, 'utf8');

    // Form fields
    assert.match(content, /id="support-name"/);
    assert.match(content, /id="support-email"/);
    assert.match(content, /id="support-category"/);
    assert.match(content, /id="support-subject"/);
    assert.match(content, /id="support-message"/);
    assert.match(content, /id="websiteUrl"/); // Honeypot field

    // State handling
    assert.match(content, /handleSubmitTicket/);
    assert.match(content, /submissionSuccess/);
    assert.match(content, /supportService\.submitTicket/);
  });

  it('verifies practical troubleshooting diagnostics are provided', () => {
    const content = fs.readFileSync(supportPagePath, 'utf8');

    // Troubleshooting issues
    assert.match(content, /OTP Login Verification Code Not Received/);
    assert.match(content, /Video Player Buffering or Stall/);
    assert.match(content, /Session Expired or Multi-Device Conflict/);
    assert.match(content, /Browser Compatibility & Hardware Acceleration/);
  });

  it('verifies supportService.js handles ticket submission via /api/support/ticket', () => {
    assert.ok(fs.existsSync(supportServicePath), 'src/services/supportService.js must exist');
    const content = fs.readFileSync(supportServicePath, 'utf8');

    assert.match(content, /\/support\/ticket/);
    assert.match(content, /submitTicket/);
  });

  it('verifies Footer.jsx links to /support', () => {
    const footerContent = fs.readFileSync(footerPath, 'utf8');
    assert.match(footerContent, /to=["']\/support["']/);
  });
});
