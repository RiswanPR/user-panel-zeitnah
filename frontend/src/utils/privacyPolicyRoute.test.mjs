import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Zeitnah LMS Privacy Policy Production Integrity Suite', () => {
  const appJsxPath = path.resolve('src/App.jsx');
  const privacyPagePath = path.resolve('src/pages/privacy/PrivacyPolicyPage.jsx');
  const cookieBannerPath = path.resolve('src/components/common/CookieConsentBanner.jsx');
  const footerPath = path.resolve('src/components/navigation/Footer.jsx');
  const indexHtmlPath = path.resolve('index.html');

  it('verifies App.jsx registers the public /privacy-policy and /privacy routes without ProtectedRoute', () => {
    assert.ok(fs.existsSync(appJsxPath), 'src/App.jsx must exist');
    const content = fs.readFileSync(appJsxPath, 'utf8');

    // Lazy import
    assert.match(content, /const PrivacyPolicyPage = lazyWithRetry\(/);

    // Public route under MainLayout without ProtectedRoute
    assert.match(content, /path=["']\/privacy-policy["']/);
    assert.match(content, /<PrivacyPolicyPage\s*\/>/);

    // Alias redirect
    assert.match(content, /path=["']\/privacy["']/);
    assert.match(content, /to=["']\/privacy-policy["']/);

    // Make sure /privacy-policy is NOT inside ProtectedRoute
    const protectedIndex = content.indexOf('<ProtectedRoute>');
    const privacyIndex = content.indexOf('path="/privacy-policy"');
    assert.ok(privacyIndex > 0, 'Privacy policy route must exist');
    assert.ok(privacyIndex < protectedIndex, 'Privacy policy route must be public before ProtectedRoute');
  });

  it('verifies PrivacyPolicyPage.jsx exists and contains all 14 mandatory legal and technical sections', () => {
    assert.ok(fs.existsSync(privacyPagePath), 'src/pages/privacy/PrivacyPolicyPage.jsx must exist');
    const content = fs.readFileSync(privacyPagePath, 'utf8');

    const expectedSectionIds = [
      'introduction',
      'information-collected',
      'how-we-use-information',
      'cookies-analytics',
      'educational-content-drm',
      'notifications-communications',
      'third-party-service-providers',
      'information-sharing',
      'data-storage-security',
      'user-rights-account-deletion',
      'children-privacy',
      'international-transfers',
      'changes-to-policy',
      'contact-information',
    ];

    expectedSectionIds.forEach((id) => {
      // Must exist in SECTIONS table of contents
      assert.match(content, new RegExp(`id:\\s*["']${id}["']`), `TOC must contain section id "${id}"`);
      // Must exist as an anchor section in semantic DOM
      assert.match(content, new RegExp(`id=["']${id}["']`), `DOM must contain <section id="${id}">`);
    });
  });

  it('verifies Apple App Store Guideline 5.1.1(v) account deletion instructions are implemented', () => {
    const content = fs.readFileSync(privacyPagePath, 'utf8');

    // Apple App Store reference
    assert.match(content, /Apple App Store Guideline 5\.1\.1\(v\)/);
    assert.match(content, /com\.zeitnahacademy\.app/);

    // In-app deletion path
    assert.match(content, /Profile\s*&gt;\s*Account\s*&gt;\s*Security/);

    // Email request path
    assert.match(content, /Account Deletion Request/);
  });

  it('verifies verified third-party service providers are explicitly disclosed', () => {
    const content = fs.readFileSync(privacyPagePath, 'utf8');

    assert.match(content, /Amazon Web Services \(AWS\)/);
    assert.match(content, /zeitnahacademy-production/);
    assert.match(content, /ap-south-1/);
    assert.match(content, /VdoCipher/);
    assert.match(content, /Resend/);
    assert.match(content, /Upstash/);
    assert.match(content, /Apple APNs/);
  });

  it('verifies forensic dynamic video watermarking disclosure is accurate', () => {
    const content = fs.readFileSync(privacyPagePath, 'utf8');

    assert.match(content, /Forensic Watermark/);
    assert.match(content, /Digital Rights Management/i);
    assert.match(content, /VdoCipher/);
  });

  it('verifies zero advertising tracking disclosure is stated', () => {
    const content = fs.readFileSync(privacyPagePath, 'utf8');

    assert.match(content, /No Ad Tracking/i);
    assert.match(content, /never sold and will never sell personal information/i);
  });

  it('verifies verified legal entity, business constitution, and principal address are stated', () => {
    const content = fs.readFileSync(privacyPagePath, 'utf8');

    assert.match(content, /ZEITNAH INSTITUTE OF SURVEY LLP/);
    assert.match(content, /Limited Liability Partnership/);
    assert.match(content, /Babil Complex, Kovilakam Road, Mankavu, Kozhikode, Kerala 673007, India/);
    assert.match(content, /\[Placeholder: privacy@zeitnahacademy\.com/);
  });

  it('verifies CookieConsentBanner.jsx and Footer.jsx link to /privacy-policy', () => {
    const cookieContent = fs.readFileSync(cookieBannerPath, 'utf8');
    assert.match(cookieContent, /to=["']\/privacy-policy["']/);

    const footerContent = fs.readFileSync(footerPath, 'utf8');
    assert.match(footerContent, /to=["']\/privacy-policy["']/);
  });

  it('verifies index.html provides a semantic noscript fallback for non-JS environments', () => {
    const indexContent = fs.readFileSync(indexHtmlPath, 'utf8');

    assert.match(indexContent, /<noscript>/);
    assert.match(indexContent, /Zeitnah LMS — Privacy Policy/);
    assert.match(indexContent, /Apple Guideline 5\.1\.1\(v\)/);
  });
});
