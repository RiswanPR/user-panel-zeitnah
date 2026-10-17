import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MAIN_LAYOUT_PATH = path.resolve(__dirname, '../layouts/MainLayout.jsx');
const MAIN_NAVBAR_PATH = path.resolve(__dirname, '../components/navigation/MainNavbar.jsx');
const MOBILE_MORE_DRAWER_PATH = path.resolve(__dirname, '../components/navigation/MobileMoreDrawer.jsx');
const FOOTER_PATH = path.resolve(__dirname, '../components/navigation/Footer.jsx');
const PROFILE_NAV_PATH = path.resolve(__dirname, '../components/profile/ProfileNav.jsx');
const ACCOUNT_NAV_PATH = path.resolve(__dirname, '../components/profile/AccountNav.jsx');
const QUICK_SEARCH_MODAL_PATH = path.resolve(__dirname, '../components/navigation/QuickSearchModal.jsx');
const COOKIE_BANNER_PATH = path.resolve(__dirname, '../components/common/CookieConsentBanner.jsx');
const PROFILE_SWITCHER_PATH = path.resolve(__dirname, '../components/navigation/ProfileSwitcher.jsx');
const INDEX_CSS_PATH = path.resolve(__dirname, '../index.css');

describe('Zeitnah — Phase 4A: Shared Layout and Navigation Theme Migration Unit Tests', () => {
  // ── TEST 1: MainLayout root canvas and mobile bottom nav use semantic tokens ──
  it('1. MainLayout uses semantic tokens for canvas text and mobile bottom navigation', () => {
    const content = fs.readFileSync(MAIN_LAYOUT_PATH, 'utf8');

    // Canvas must use semantic bg and text tokens, not hardcoded text-white on root
    assert.ok(content.includes('bg-bg-base'), 'MainLayout must use bg-bg-base for root canvas');
    assert.ok(content.includes('text-text-primary'), 'MainLayout must use text-text-primary for root canvas');
    assert.doesNotMatch(
      content,
      /<div className="min-h-screen bg-bg-base text-white/,
      'MainLayout root canvas must not force text-white'
    );

    // Mobile bottom nav must use semantic surface and border tokens
    assert.ok(content.includes('bg-surface/95'), 'Mobile bottom nav must use bg-surface/95');
    assert.ok(content.includes('border-border'), 'Mobile bottom nav must use border-border');
    assert.doesNotMatch(
      content,
      /bg-\[#0B111E\]\/95 border border-white\/\[0\.1\]/,
      'Mobile bottom nav must not have hardcoded dark colors'
    );
  });

  // ── TEST 2: MainNavbar uses semantic tokens for surfaces, text, links, and dropdowns ──
  it('2. MainNavbar header, brand, links, search, and dropdowns use semantic tokens', () => {
    const content = fs.readFileSync(MAIN_NAVBAR_PATH, 'utf8');

    // Header container
    assert.ok(
      content.includes('background: "var(--color-surface)"'),
      'MainNavbar header must use var(--color-surface)'
    );
    assert.ok(
      content.includes('borderBottom: "1px solid var(--color-border)"'),
      'MainNavbar header must use var(--color-border)'
    );

    // Monogram logo frame & Wordmark
    assert.ok(
      content.includes('background: "var(--color-surface-elevated)"'),
      'Logo frame must use var(--color-surface-elevated)'
    );
    assert.ok(
      content.includes('text-text-primary group-hover:text-brand-mint'),
      'Wordmark must use text-text-primary'
    );

    // Primary nav links
    assert.ok(
      content.includes('text-text-primary'),
      'Primary links active state must use text-text-primary'
    );
    assert.ok(
      content.includes('text-text-muted hover:text-text-primary'),
      'Primary links inactive state must use text-text-muted hover:text-text-primary'
    );

    // More command surface & Profile dropdown surface
    assert.ok(
      content.includes('background: "var(--color-surface-card)"'),
      'Dropdown surfaces must use var(--color-surface-card)'
    );
    assert.ok(
      content.includes('border: "1px solid var(--color-border)"'),
      'Dropdown borders must use var(--color-border)'
    );

    // Search button
    assert.ok(
      content.includes('bg-surface-elevated/50 hover:bg-surface-elevated border border-border text-text-muted hover:text-text-secondary'),
      'Search button must use theme-aware semantic classes'
    );

    // Connected hub (messages & leaderboard)
    assert.ok(
      content.includes('messagesActive\n                      ? "text-text-primary bg-surface-elevated"') ||
      content.includes('messagesActive ? "text-text-primary bg-surface-elevated" : "text-text-muted hover:text-text-primary hover:bg-surface-elevated"'),
      'Messages button must use semantic text and surface tokens'
    );
    assert.ok(
      content.includes('bg-surface-elevated/40 hover:bg-amber-400/5 border border-border'),
      'Leaderboard capsule must use semantic surface and border tokens'
    );
  });

  // ── TEST 3: MobileMoreDrawer uses semantic tokens ──
  it('3. MobileMoreDrawer uses semantic tokens for drawer sheet, identity, and navigation items', () => {
    const content = fs.readFileSync(MOBILE_MORE_DRAWER_PATH, 'utf8');

    // Drawer container
    assert.ok(
      content.includes('background: "var(--color-surface-card)"'),
      'Drawer sheet must use var(--color-surface-card)'
    );
    assert.ok(
      content.includes('borderTop: "1px solid var(--color-border)"'),
      'Drawer top border must use var(--color-border)'
    );
    assert.doesNotMatch(
      content,
      /background: "rgba\(8,13,25,0\.99\)"/,
      'Drawer must not use hardcoded rgba(8,13,25,0.99)'
    );

    // Identity card & buttons
    assert.ok(
      content.includes('background: "var(--color-surface-elevated)"'),
      'Identity card must use var(--color-surface-elevated)'
    );
    assert.ok(
      content.includes('text-text-primary truncate'),
      'User name must use text-text-primary'
    );
    assert.ok(
      content.includes('text-text-muted truncate'),
      'User handle must use text-text-muted'
    );

    // Group items
    assert.ok(
      content.includes('color: "var(--color-text-faint)"'),
      'Group title must use var(--color-text-faint)'
    );
    assert.ok(
      content.includes('background: "var(--color-border)"'),
      'Group divider must use var(--color-border)'
    );
  });

  // ── TEST 4: Footer uses semantic tokens ──
  it('4. Footer uses semantic tokens for canvas, brand, links, and vision card', () => {
    const content = fs.readFileSync(FOOTER_PATH, 'utf8');

    // Canvas
    assert.ok(content.includes('border-t border-border'), 'Footer canvas must use border-t border-border');
    assert.ok(content.includes('bg-surface/90'), 'Footer canvas must use bg-surface/90');
    assert.ok(content.includes('text-text-primary'), 'Footer canvas must use text-text-primary');
    assert.doesNotMatch(
      content,
      /border-white\/\[0\.08\] bg-\[#070B14\]\/90 text-white/,
      'Footer must not use hardcoded dark colors'
    );

    // Logo & links
    assert.ok(
      content.includes('border-border bg-surface-elevated'),
      'Logo container must use border-border and bg-surface-elevated'
    );
    assert.ok(
      content.includes('text-text-primary group-hover:text-brand-mint'),
      'Brand wordmark must use text-text-primary'
    );
    assert.ok(
      content.includes('text-text-muted hover:text-text-primary transition-colors'),
      'Footer links must hover to text-text-primary'
    );
    assert.ok(
      content.includes('border border-border bg-surface-elevated/40'),
      'Vision capsule must use border-border and bg-surface-elevated/40'
    );
  });

  // ── TEST 5: ProfileNav and AccountNav use semantic tokens ──
  it('5. ProfileNav and AccountNav segmented controls use semantic tokens', () => {
    const profileNavContent = fs.readFileSync(PROFILE_NAV_PATH, 'utf8');
    const accountNavContent = fs.readFileSync(ACCOUNT_NAV_PATH, 'utf8');

    // ProfileNav
    assert.ok(
      profileNavContent.includes('border border-border bg-surface/85'),
      'ProfileNav must use border-border and bg-surface/85'
    );
    assert.ok(
      profileNavContent.includes('text-text-primary font-bold'),
      'ProfileNav active tab must use text-text-primary'
    );
    assert.ok(
      profileNavContent.includes('text-text-muted hover:text-text-secondary hover:bg-surface-elevated/50'),
      'ProfileNav inactive tab must use semantic text and elevated surface tokens'
    );
    assert.doesNotMatch(
      profileNavContent,
      /border-white\/\[0\.08\] bg-\[#070B14\]\/80/,
      'ProfileNav must not use hardcoded dark background'
    );

    // AccountNav
    assert.ok(
      accountNavContent.includes('border border-border bg-surface/85'),
      'AccountNav must use border-border and bg-surface/85'
    );
    assert.ok(
      accountNavContent.includes('text-text-primary font-bold'),
      'AccountNav active tab must use text-text-primary'
    );
    assert.ok(
      accountNavContent.includes('text-text-muted hover:text-text-secondary hover:bg-surface-elevated/50'),
      'AccountNav inactive tab must use semantic text and elevated surface tokens'
    );
    assert.doesNotMatch(
      accountNavContent,
      /border-white\/\[0\.08\] bg-\[#070B14\]\/90/,
      'AccountNav must not use hardcoded dark background'
    );
  });

  // ── TEST 6: Shared modals use semantic tokens ──
  it('6. QuickSearchModal and CookieConsentBanner use semantic tokens', () => {
    const searchModalContent = fs.readFileSync(QUICK_SEARCH_MODAL_PATH, 'utf8');
    const cookieBannerContent = fs.readFileSync(COOKIE_BANNER_PATH, 'utf8');

    // QuickSearchModal
    assert.ok(
      searchModalContent.includes('bg-surface-card border border-border'),
      'QuickSearchModal must use bg-surface-card and border-border'
    );
    assert.doesNotMatch(
      searchModalContent,
      /from-\[#0F1728\] via-\[#0B111E\] to-\[#070B14\]/,
      'QuickSearchModal must not use hardcoded dark gradient'
    );
    assert.ok(
      searchModalContent.includes('text-text-primary placeholder-text-muted'),
      'Search input must use text-text-primary'
    );

    // CookieConsentBanner
    assert.ok(
      cookieBannerContent.includes('border border-border bg-surface-card/95'),
      'Cookie banner must use border-border and bg-surface-card'
    );
    assert.ok(
      cookieBannerContent.includes('border border-border bg-surface-card p-6'),
      'Cookie preferences modal must use border-border and bg-surface-card'
    );
    assert.ok(
      cookieBannerContent.includes('text-sm font-heading font-bold text-text-primary'),
      'Cookie title must use text-text-primary'
    );
  });

  // ── TEST 7: ProfileSwitcher uses semantic tokens ──
  it('7. ProfileSwitcher uses semantic tokens for profile items, text, and active indicators', () => {
    const content = fs.readFileSync(PROFILE_SWITCHER_PATH, 'utf8');

    assert.ok(content.includes('text-text-muted'), 'Header must use text-text-muted');
    assert.ok(content.includes('text-text-faint'), 'Profile count must use text-text-faint');
    assert.ok(content.includes('isPersonalMode ? \'text-text-primary font-semibold\' : \'text-text-secondary group-hover:text-text-primary\''));
    assert.ok(content.includes('isSelected ? \'text-text-primary font-semibold\' : \'text-text-secondary group-hover:text-text-primary\''));
    assert.ok(content.includes('border: isPersonalMode ? \'1.5px solid rgba(159,213,178,0.5)\' : \'1px solid var(--color-border)\''));
  });

  // ── TEST 8: index.css token definitions and aliases remain intact ──
  it('8. index.css retains root, dark, and light theme tokens and compatibility aliases', () => {
    const css = fs.readFileSync(INDEX_CSS_PATH, 'utf8');

    // Core tokens exist in theme block
    assert.ok(css.includes('--color-page-bg: var(--zn-token-page-bg);'));
    assert.ok(css.includes('--color-surface: var(--zn-token-surface);'));
    assert.ok(css.includes('--color-surface-card: var(--zn-token-surface-card);'));
    assert.ok(css.includes('--color-surface-elevated: var(--zn-token-surface-elevated);'));
    assert.ok(css.includes('--color-border: var(--zn-token-border);'));
    assert.ok(css.includes('--color-text-primary: var(--zn-token-text-primary);'));
    assert.ok(css.includes('--color-text-secondary: var(--zn-token-text-secondary);'));
    assert.ok(css.includes('--color-text-muted: var(--zn-token-text-muted);'));

    // Dark theme token set
    assert.ok(css.includes('[data-theme="dark"]'));
    assert.ok(css.includes('--zn-token-page-bg: #070B14;'));
    assert.ok(css.includes('--zn-token-text-primary: #FFFFFF;'));

    // Light theme token set
    assert.ok(css.includes('[data-theme="light"]'));
    assert.ok(css.includes('--zn-token-page-bg: #F8FAFC;'));
    assert.ok(css.includes('--zn-token-surface: #FFFFFF;'));
    assert.ok(css.includes('--zn-token-text-primary: #0A0F1D;'));
  });

  // ── TEST 9: Preserves navigation routes, roles, and functional contracts ──
  it('9. preserves all routing destinations and permission checks unchanged', () => {
    const layoutContent = fs.readFileSync(MAIN_LAYOUT_PATH, 'utf8');
    const navbarContent = fs.readFileSync(MAIN_NAVBAR_PATH, 'utf8');

    // MainLayout routes
    assert.ok(layoutContent.includes('to="/courses"'));
    assert.ok(layoutContent.includes('to="/community"'));
    assert.ok(layoutContent.includes('to="/network"'));
    assert.ok(layoutContent.includes('careerItem.path'));

    // MainNavbar routes
    assert.ok(navbarContent.includes('getPrimaryNavLinks'));
    assert.ok(navbarContent.includes('getMoreNavSections'));
    assert.ok(navbarContent.includes('to="/messages"'));
    assert.ok(navbarContent.includes('to="/leaderboard"'));

    // No permission changes
    assert.ok(navbarContent.includes('normalizeUserRole'));
  });
});
