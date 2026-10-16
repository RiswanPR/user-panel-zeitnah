import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Zeitnah LMS Terms of Service Production Integrity Suite', () => {
  const appJsxPath = path.resolve('src/App.jsx');
  const termsPagePath = path.resolve('src/pages/legal/TermsOfServicePage.jsx');
  const footerPath = path.resolve('src/components/navigation/Footer.jsx');

  it('verifies App.jsx registers the public /terms-of-service and /terms routes without ProtectedRoute', () => {
    assert.ok(fs.existsSync(appJsxPath), 'src/App.jsx must exist');
    const content = fs.readFileSync(appJsxPath, 'utf8');

    // Lazy import
    assert.match(content, /const TermsOfServicePage = lazyWithRetry\(/);

    // Public route under MainLayout without ProtectedRoute
    assert.match(content, /path=["']\/terms-of-service["']/);
    assert.match(content, /<TermsOfServicePage\s*\/>/);

    // Alias redirect: /terms -> /terms-of-service
    assert.match(content, /path=["']\/terms["']/);
    assert.match(content, /to=["']\/terms-of-service["']/);

    // Make sure /terms-of-service is NOT inside ProtectedRoute
    const protectedIndex = content.indexOf('<ProtectedRoute>');
    const termsIndex = content.indexOf('path="/terms-of-service"');
    assert.ok(termsIndex > 0, 'Terms route must exist');
    assert.ok(termsIndex < protectedIndex, 'Terms route must be publicly accessible before ProtectedRoute');
  });

  it('verifies TermsOfServicePage.jsx exists and contains all 13 mandatory sections', () => {
    assert.ok(fs.existsSync(termsPagePath), 'src/pages/legal/TermsOfServicePage.jsx must exist');
    const content = fs.readFileSync(termsPagePath, 'utf8');

    const expectedSectionIds = [
      'acceptance',
      'account-registration',
      'educational-services',
      'intellectual-property',
      'user-conduct',
      'admissions-fees',
      'user-contributions',
      'third-party-services',
      'disclaimers',
      'limitation-liability',
      'termination',
      'governing-law',
      'modifications-contact',
    ];

    expectedSectionIds.forEach((id) => {
      assert.match(content, new RegExp(`id:\\s*["']${id}["']`), `TOC must contain section id "${id}"`);
      assert.match(content, new RegExp(`id=["']${id}["']`), `DOM must contain <section id="${id}">`);
    });
  });

  it('verifies verified legal entity name, business constitution, and principal address are stated', () => {
    const content = fs.readFileSync(termsPagePath, 'utf8');

    assert.match(content, /ZEITNAH INSTITUTE OF SURVEY LLP/);
    assert.match(content, /Limited Liability Partnership/);
    assert.match(content, /Babil Complex, Kovilakam Road, Mankavu, Kozhikode, Kerala 673007, India/);
  });

  it('verifies Apple App Store Guideline 5.1.1(v) account deletion pathways are stated', () => {
    const content = fs.readFileSync(termsPagePath, 'utf8');

    // Apple App Store reference
    assert.match(content, /Apple App Store Guideline 5\.1\.1\(v\)/);

    // In-app deletion path
    assert.match(content, /Profile\s*&gt;\s*Account\s*&gt;\s*Security|Profile > Account > Security/);

    // Written email request path
    assert.match(content, /Account Deletion Request/);
  });

  it('verifies digital rights management (DRM) and forensic watermarking terms are stated', () => {
    const content = fs.readFileSync(termsPagePath, 'utf8');

    assert.match(content, /Digital Rights Management/i);
    assert.match(content, /VdoCipher/);
    assert.match(content, /Forensic Dynamic Watermark|forensic watermark/i);
  });

  it('verifies Indian governing law and Kozhikode exclusive jurisdiction are stated', () => {
    const content = fs.readFileSync(termsPagePath, 'utf8');

    assert.match(content, /laws of\s*(<strong[^>]*>)?India/i);
    assert.match(content, /Kozhikode/i);
  });

  it('verifies cross-linking with Privacy Policy and Support Portal', () => {
    const content = fs.readFileSync(termsPagePath, 'utf8');

    assert.match(content, /to=["']\/privacy-policy["']/);
    assert.match(content, /to=["']\/support["']/);
  });

  it('verifies Footer.jsx links to /terms-of-service', () => {
    const footerContent = fs.readFileSync(footerPath, 'utf8');
    assert.match(footerContent, /to=["']\/terms-of-service["']/);
  });
});
