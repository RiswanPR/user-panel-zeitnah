import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INDEX_CSS_PATH = path.resolve(__dirname, '../index.css');
const ACCOUNT_PAGE_PATH = path.resolve(__dirname, '../pages/profile/AccountPage.jsx');
const VERIFICATION_PAGE_PATH = path.resolve(__dirname, '../pages/profile/VerificationCenterPage.jsx');
const AUDIT_LOGS_PATH = path.resolve(__dirname, '../pages/audit/AuditLogs.jsx');
const EDIT_PROFILE_PATH = path.resolve(__dirname, '../pages/profile/EditProfile.jsx');
const LOGIN_PAGE_PATH = path.resolve(__dirname, '../pages/auth/Login.jsx');

describe('Zeitnah — Phase 10B: Account, Profile Studio & Authentication Polish Unit Tests', () => {
  // ── TEST 1: Account Page Hero Whitespace & Segmented Tabs ──
  it('1. verifies /profile/account hero vertical whitespace reduction and responsive container', () => {
    const content = fs.readFileSync(ACCOUNT_PAGE_PATH, 'utf8');

    // Container tightened from max-w-7xl to max-w-5xl
    assert.ok(content.includes('max-w-5xl mx-auto'), 'AccountPage must use max-w-5xl container');
    assert.ok(content.includes('space-y-5 sm:space-y-6'), 'AccountPage must use refined vertical spacing');

    // Hero padding reduced to eliminate dead space
    assert.ok(content.includes('rounded-2xl bg-surface-card border border-border p-4 sm:p-5'), 'AccountPage hero must use rounded-2xl and compact p-4 sm:p-5 padding');

    // Preserves all sections
    assert.ok(content.includes('VALID_SECTIONS = ["verification", "security", "sessions", "appearance"]'), 'AccountPage must preserve all valid sections');
    assert.ok(content.includes('<ProfileNav />'), 'AccountPage must render ProfileNav');
    assert.ok(content.includes('<AccountNav'), 'AccountPage must render AccountNav');
  });

  // ── TEST 2: VerificationCenterPage secondary actions & hero refinement ──
  it('2. verifies VerificationCenterPage "View Profile" secondary action and refined hero', () => {
    const content = fs.readFileSync(VERIFICATION_PAGE_PATH, 'utf8');

    // Hero section padding tightened
    assert.ok(content.includes('rounded-2xl bg-surface-card border border-border p-5 sm:p-6'), 'VerificationCenterPage hero must use refined p-5 sm:p-6 padding');

    // "View Profile" link uses approved secondary button class and focus-ring
    assert.ok(content.includes('to="/profile"'), 'VerificationCenterPage must link to /profile');
    assert.ok(content.includes('zn-btn-secondary text-xs sm:text-sm py-2 px-4 focus-ring'), 'View Profile must use zn-btn-secondary with focus-ring');

    // "Request Verification" uses primary CTA class with focus-ring
    assert.ok(content.includes('zn-btn-primary text-xs sm:text-sm py-2 px-5 flex items-center gap-2 cursor-pointer shadow-sm focus-ring'), 'Request Verification must use zn-btn-primary with focus-ring');
  });

  // ── TEST 3: Filter Chips Visually Distinct from Navigation Tabs ──
  it('3. verifies AuditLogs filter chips use distinct chip geometry and focus states', () => {
    const content = fs.readFileSync(AUDIT_LOGS_PATH, 'utf8');

    // Filter chips use rounded-lg (8px chip radius) rather than segmented nav pills
    assert.ok(content.includes('px-3 py-1.5 rounded-lg border text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer focus-ring'), 'Filter chips must use rounded-lg and focus-ring');
    assert.ok(content.includes('border-border bg-surface-elevated/40 text-text-muted hover:text-text-primary hover:border-border-accent'), 'Inactive filter chips must use discrete elevated surface');
    assert.ok(content.includes('bg-brand-mint/15 border-brand-mint/40 text-brand-mint shadow-sm font-bold'), 'Active filter chips must have high contrast');
  });

  // ── TEST 4: Profile Studio Section Audit & Contrast Safety ──
  it('4. audits all 9 Profile Studio sections and confirms elimination of low-contrast amber text', () => {
    const content = fs.readFileSync(EDIT_PROFILE_PATH, 'utf8');

    // All 9 sections defined in SECTION_CONFIG
    assert.ok(content.includes('id: "basic-info"'), 'Section 1 basic-info must be present');
    assert.ok(content.includes('id: "professional-identity"'), 'Section 2 professional-identity must be present');
    assert.ok(content.includes('id: "skills"'), 'Section 3 skills must be present');
    assert.ok(content.includes('id: "experience"'), 'Section 4 experience must be present');
    assert.ok(content.includes('id: "education"'), 'Section 5 education must be present');
    assert.ok(content.includes('id: "certifications"'), 'Section 6 certifications must be present');
    assert.ok(content.includes('id: "recommendations"'), 'Section 7 recommendations must be present');
    assert.ok(content.includes('id: "public-profile"'), 'Section 8 public-profile must be present');
    assert.ok(content.includes('id: "appearance"'), 'Section 9 appearance must be present');

    // No low-contrast amber text or borders in EditProfile
    assert.doesNotMatch(content, /text-amber-300/, 'EditProfile must not contain low-contrast text-amber-300');
    assert.doesNotMatch(content, /text-amber-400/, 'EditProfile must not contain low-contrast text-amber-400');
    assert.doesNotMatch(content, /border-amber-500/, 'EditProfile must not contain border-amber-500');

    // Honors badge uses semantic token text-brand-yellow and bg-brand-yellow/10
    assert.ok(content.includes('bg-brand-yellow/10 border border-brand-yellow/20 text-xs font-semibold text-brand-yellow'), 'Honors badge must use semantic brand-yellow tokens');

    // Preserves 8 sectional headers
    assert.match(content, /SECTION 01 OF 08/);
    assert.match(content, /SECTION 02 OF 08/);
    assert.match(content, /SECTION 03 OF 08/);
    assert.match(content, /SECTION 04 OF 08/);
    assert.match(content, /SECTION 05 OF 08/);
    assert.match(content, /SECTION 06 OF 08/);
    assert.match(content, /SECTION 07 OF 08/);
    assert.match(content, /SECTION 08 OF 08/);
  });

  // ── TEST 5: Profile Studio Avatar and Cover Framing ──
  it('5. verifies avatar and cover banner framing and crop behaviors in EditProfile', () => {
    const content = fs.readFileSync(EDIT_PROFILE_PATH, 'utf8');

    // Cover banner framing
    assert.ok(content.includes('h-44 w-full rounded-2xl border border-border overflow-hidden bg-surface-elevated flex items-center justify-center group shadow-inner'), 'Cover banner must have fixed aspect ratio framing');
    assert.ok(content.includes('className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"'), 'Cover banner image must use object-cover');

    // Avatar framing
    assert.ok(content.includes('w-20 h-20 rounded-2xl overflow-hidden border-2 border-brand-mint/40 bg-surface-elevated flex items-center justify-center shadow-lg ring-4 ring-brand-mint/10'), 'Avatar must have rounded-2xl framing with brand ring');
    assert.ok(content.includes('className="w-full h-full object-cover"'), 'Avatar image must use object-cover');

    // Preserves image editor modal
    assert.ok(content.includes('Image Editor Modal for Avatar & Banner'), 'Image editor modal must be retained');
  });

  // ── TEST 6: /login Mobile Safe Area Clearance ──
  it('6. verifies /login mobile safe area clearance without desktop regression', () => {
    const content = fs.readFileSync(LOGIN_PAGE_PATH, 'utf8');

    // Safe area clearance applied to auth section
    assert.ok(
      content.includes('pt-[max(1.5rem,env(safe-area-inset-top))] pb-8 sm:py-8 sm:px-8'),
      'Login auth section must use safe-area-aware padding'
    );

    // Preserves authentication logic and validation
    assert.ok(content.includes('handleSendOtp'), 'Login must preserve handleSendOtp');
    assert.ok(content.includes('/verify-login-otp'), 'Login must navigate to /verify-login-otp');
    assert.ok(content.includes('login-email'), 'Login must preserve email input');
  });

  // ── TEST 7: CSS Focus Rings & Light Mode Segmented Navigation ──
  it('7. verifies index.css button focus rings and light mode segmented control styles', () => {
    const css = fs.readFileSync(INDEX_CSS_PATH, 'utf8');

    // Button focus-visible rules
    assert.ok(css.includes('.btn-primary:focus-visible'), 'CSS must define .btn-primary:focus-visible');
    assert.ok(css.includes('.zn-btn-primary:focus-visible'), 'CSS must define .zn-btn-primary:focus-visible');
    assert.ok(css.includes('.zn-btn-secondary:focus-visible'), 'CSS must define .zn-btn-secondary:focus-visible');
    assert.ok(css.includes('[data-theme="light"] .zn-btn-secondary:focus-visible'), 'CSS must define light mode button focus indicator');

    // Segmented tab active pill light mode treatment
    assert.ok(css.includes('[data-theme="light"] [role="tablist"] [layoutid="account-nav-active-pill"]'), 'CSS must define light mode account-nav-active-pill');
    assert.ok(css.includes('[data-theme="light"] [role="tablist"] [layoutid="profile-nav-active-pill"]'), 'CSS must define light mode profile-nav-active-pill');

    // Brand yellow light mode contrast tokens
    assert.ok(css.includes('[data-theme="light"] .text-brand-yellow'), 'CSS must protect text-brand-yellow in light mode');
    assert.ok(css.includes('[data-theme="light"] .bg-brand-yellow\\/15'), 'CSS must protect bg-brand-yellow/15 in light mode');
    assert.ok(css.includes('[data-theme="light"] .border-brand-yellow\\/30'), 'CSS must protect border-brand-yellow/30 in light mode');
  });
});
