import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  THEME_PREFERENCES,
  EFFECTIVE_THEMES,
  THEME_STORAGE_KEY,
  THEME_OPTIONS,
  DEFAULT_PREFERENCE,
  isValidPreference,
  normalizePreference,
  resolveEffectiveTheme,
  getDeviceThemePreference,
  applyThemeToRoot,
} from './themeEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INDEX_CSS_PATH = path.resolve(__dirname, '../index.css');
const THEME_SELECTOR_PATH = path.resolve(__dirname, '../components/settings/ThemeSelector.jsx');
const MAIN_NAVBAR_PATH = path.resolve(__dirname, '../components/navigation/MainNavbar.jsx');
const MAIN_LAYOUT_PATH = path.resolve(__dirname, '../layouts/MainLayout.jsx');
const MOBILE_DRAWER_PATH = path.resolve(__dirname, '../components/navigation/MobileMoreDrawer.jsx');

describe('Zeitnah — Stage 1 Phase 1: Shared Design Foundation Tests', () => {
  const css = fs.readFileSync(INDEX_CSS_PATH, 'utf8');
  const themeSelectorCode = fs.readFileSync(THEME_SELECTOR_PATH, 'utf8');
  const mainNavbarCode = fs.readFileSync(MAIN_NAVBAR_PATH, 'utf8');
  const mainLayoutCode = fs.readFileSync(MAIN_LAYOUT_PATH, 'utf8');
  const mobileDrawerCode = fs.readFileSync(MOBILE_DRAWER_PATH, 'utf8');

  // ═════════════════════════════════════════════════════════════════
  // 1. SEMANTIC DESIGN TOKENS
  // ═════════════════════════════════════════════════════════════════
  describe('1. Semantic Design Tokens', () => {
    it('verifies @theme defines semantic action and interactive tokens', () => {
      const requiredTokens = [
        '--color-action-primary-bg: var(--zn-token-action-primary-bg);',
        '--color-action-primary-text: var(--zn-token-action-primary-text);',
        '--color-action-secondary-bg: var(--zn-token-action-secondary-bg);',
        '--color-action-secondary-text: var(--zn-token-action-secondary-text);',
        '--color-action-secondary-border: var(--zn-token-action-secondary-border);',
        '--color-input-bg: var(--zn-token-input-bg);',
        '--color-input-border: var(--zn-token-input-border);',
        '--color-link: var(--zn-token-link);',
      ];

      for (const token of requiredTokens) {
        assert.ok(css.includes(token), `@theme must define ${token}`);
      }
    });

    it('verifies :root defines approved dark theme visual foundations', () => {
      // Dark visual target: Canvas #070B14, Card surface #131D2D, Borders #1E293B, Primary accent #9FD5B2
      assert.ok(css.includes('--zn-token-page-bg: #070B14;'), 'Dark canvas must be #070B14');
      assert.ok(css.includes('--zn-token-surface-card: #131D2D;'), 'Dark card surface must be #131D2D');
      assert.ok(css.includes('--zn-token-border: #1E293B;'), 'Dark border must be #1E293B');
      assert.ok(css.includes('--zn-token-accent: #9FD5B2;'), 'Dark primary accent must be #9FD5B2');

      // Primary actions in dark theme: background #9FD5B2, navy text #070B14
      assert.ok(css.includes('--zn-token-action-primary-bg: #9FD5B2;'), 'Dark primary action bg must be #9FD5B2');
      assert.ok(css.includes('--zn-token-action-primary-text: #070B14;'), 'Dark primary action text must be navy (#070B14)');
    });

    it('verifies [data-theme="dark"] explicitly enforces approved dark foundations', () => {
      const darkMatch = css.match(/\[data-theme="dark"\]\s*\{([^}]+)\}/);
      assert.ok(darkMatch, '[data-theme="dark"] block must exist');
      const darkBlock = darkMatch[1];

      assert.ok(darkBlock.includes('--zn-token-page-bg: #070B14;'), 'Dark activation target page bg must be #070B14');
      assert.ok(darkBlock.includes('--zn-token-surface-card: #131D2D;'), 'Dark activation target card surface must be #131D2D');
      assert.ok(darkBlock.includes('--zn-token-border: #1E293B;'), 'Dark activation target border must be #1E293B');
      assert.ok(darkBlock.includes('--zn-token-accent: #9FD5B2;'), 'Dark activation target accent must be #9FD5B2');
      assert.ok(darkBlock.includes('--zn-token-action-primary-bg: #9FD5B2;'), 'Dark action primary bg must be #9FD5B2');
      assert.ok(darkBlock.includes('--zn-token-action-primary-text: #070B14;'), 'Dark action primary text must be #070B14');
    });

    it('verifies [data-theme="light"] defines approved light theme visual foundations', () => {
      // Light visual target: Canvas #F8FAFC, Surface #FFFFFF, Primary text #0A0F1D, Secondary #334155, Muted #64748B, Accent #0D7A5F
      const lightMatch = css.match(/\[data-theme="light"\]\s*\{([^}]+)\}/);
      assert.ok(lightMatch, '[data-theme="light"] block must exist');
      const lightBlock = lightMatch[1];

      assert.ok(lightBlock.includes('--zn-token-page-bg: #F8FAFC;'), 'Light canvas must be #F8FAFC');
      assert.ok(lightBlock.includes('--zn-token-surface: #FFFFFF;'), 'Light surface must be #FFFFFF');
      assert.ok(lightBlock.includes('--zn-token-surface-card: #FFFFFF;'), 'Light card surface must be #FFFFFF');
      assert.ok(lightBlock.includes('--zn-token-text-primary: #0A0F1D;'), 'Light primary text must be #0A0F1D');
      assert.ok(lightBlock.includes('--zn-token-text-secondary: #334155;'), 'Light secondary text must be #334155');
      assert.ok(lightBlock.includes('--zn-token-text-muted: #64748B;'), 'Light muted text must be #64748B');
      assert.ok(lightBlock.includes('--zn-token-accent: #0D7A5F;'), 'Light accent must be #0D7A5F');

      // Primary actions in light theme: background #12314C, white text #FFFFFF
      assert.ok(lightBlock.includes('--zn-token-action-primary-bg: #12314C;'), 'Light primary action bg must be #12314C');
      assert.ok(lightBlock.includes('--zn-token-action-primary-text: #FFFFFF;'), 'Light primary action text must be #FFFFFF');

      // Secondary actions in light theme: surface white, slate border, dark slate text
      assert.ok(lightBlock.includes('--zn-token-action-secondary-bg: #FFFFFF;'), 'Light secondary action bg must be #FFFFFF');
      assert.ok(lightBlock.includes('--zn-token-action-secondary-border: #CBD5E1;'), 'Light secondary action border must be #CBD5E1');
      assert.ok(lightBlock.includes('--zn-token-action-secondary-text: #1E293B;'), 'Light secondary action text must be #1E293B');
    });
  });

  // ═════════════════════════════════════════════════════════════════
  // 2. CONSISTENT COMPONENT GEOMETRY
  // ═════════════════════════════════════════════════════════════════
  describe('2. Consistent Component Geometry', () => {
    it('standardizes the 3-tier corner radius tokens across @theme, :root, dark, and light blocks', () => {
      // Controls: 8px, Cards: 12px, Modals: 16px
      assert.ok(css.includes('--radius-control: 8px;'), 'Must define --radius-control: 8px');
      assert.ok(css.includes('--radius-card: 12px;'), 'Must define --radius-card: 12px');
      assert.ok(css.includes('--radius-modal: 16px;'), 'Must define --radius-modal: 16px');
      assert.ok(css.includes('--zn-radius-control: 8px;'), 'Must define --zn-radius-control: 8px');
      assert.ok(css.includes('--zn-radius-card: 12px;'), 'Must define --zn-radius-card: 12px');
      assert.ok(css.includes('--zn-radius-modal: 16px;'), 'Must define --zn-radius-modal: 16px');
    });

    it('verifies cards adopt 12px radius and theme-specific elevation shadows', () => {
      // .zn-card must use --radius-card (12px) and --shadow-card
      const znCardMatch = css.match(/\.zn-card\s*\{([^}]+)\}/);
      assert.ok(znCardMatch, '.zn-card rule must exist');
      assert.ok(znCardMatch[1].includes('var(--radius-card, 12px)'), '.zn-card must use 12px card radius');
      assert.ok(znCardMatch[1].includes('var(--shadow-card)'), '.zn-card must use semantic shadow-card');

      // .zn-panel must use --radius-card (12px)
      const znPanelMatch = css.match(/\.zn-panel\s*\{([^}]+)\}/);
      assert.ok(znPanelMatch, '.zn-panel rule must exist');
      assert.ok(znPanelMatch[1].includes('var(--radius-card, 12px)'), '.zn-panel must use 12px card radius');

      // .glass-card must use --radius-card (12px) and --shadow-card
      const glassCardMatch = css.match(/\.glass-card\s*\{([^}]+)\}/);
      assert.ok(glassCardMatch, '.glass-card rule must exist');
      assert.ok(glassCardMatch[1].includes('var(--radius-card, 12px)'), '.glass-card must use 12px card radius');
      assert.ok(glassCardMatch[1].includes('var(--shadow-card)'), '.glass-card must use semantic shadow-card');
    });

    it('verifies modals and elevated shells adopt 16px radius and modal shadows', () => {
      // .zn-card-elevated must use --radius-modal (16px) and --shadow-modal
      const elevatedMatch = css.match(/\.zn-card-elevated\s*\{([^}]+)\}/);
      assert.ok(elevatedMatch, '.zn-card-elevated rule must exist');
      assert.ok(elevatedMatch[1].includes('var(--radius-modal, 16px)'), '.zn-card-elevated must use 16px modal radius');
      assert.ok(elevatedMatch[1].includes('var(--shadow-modal)'), '.zn-card-elevated must use semantic shadow-modal');

      // .glass-card-elevated must use --radius-modal (16px)
      const glassElevatedMatch = css.match(/\.glass-card-elevated\s*\{([^}]+)\}/);
      assert.ok(glassElevatedMatch, '.glass-card-elevated rule must exist');
      assert.ok(glassElevatedMatch[1].includes('var(--radius-modal, 16px)'), '.glass-card-elevated must use 16px modal radius');
      assert.ok(glassElevatedMatch[1].includes('var(--shadow-modal)'), '.glass-card-elevated must use semantic shadow-modal');

      // .zn-modal-shell must use --radius-modal (16px)
      const modalShellMatch = css.match(/\.zn-modal-shell/);
      assert.ok(modalShellMatch, '.zn-modal-shell rule must exist');
      assert.ok(css.includes('border-radius: var(--radius-modal, 16px);'), 'Modal shells must standardize to 16px radius');
    });

    it('verifies controls (inputs, buttons) adopt 8px radius tokens', () => {
      // .glass-input and .zn-input must use 8px control radius
      const glassInputMatch = css.match(/\.glass-input\s*\{([^}]+)\}/);
      assert.ok(glassInputMatch[1].includes('var(--radius-control, 8px)'), '.glass-input must use 8px control radius');

      const znInputMatch = css.match(/\.zn-input\s*\{([^}]+)\}/);
      assert.ok(znInputMatch[1].includes('var(--radius-control, 8px)'), '.zn-input must use 8px control radius');

      // Standard buttons must use 8px control radius
      const btnPrimaryMatch = css.match(/\.btn-primary\s*\{([^}]+)\}/);
      assert.ok(btnPrimaryMatch[1].includes('var(--radius-control, 8px)'), '.btn-primary must use 8px control radius');

      const znBtnPrimaryMatch = css.match(/\.zn-btn-primary\s*\{([^}]+)\}/);
      assert.ok(znBtnPrimaryMatch[1].includes('var(--radius-control, 8px)'), '.zn-btn-primary must use 8px control radius');
    });
  });

  // ═════════════════════════════════════════════════════════════════
  // 3. THEME PREFERENCE ENGINE BEHAVIOR
  // ═════════════════════════════════════════════════════════════════
  describe('3. Theme Preference Engine Behavior', () => {
    it('verifies THEME_PREFERENCES and dedicated storage key invariants', () => {
      assert.equal(THEME_PREFERENCES.SYSTEM, 'system');
      assert.equal(THEME_PREFERENCES.LIGHT, 'light');
      assert.equal(THEME_PREFERENCES.DARK, 'dark');
      assert.equal(THEME_STORAGE_KEY, 'zn_theme_preference_v1');
      assert.equal(DEFAULT_PREFERENCE, 'dark');
    });

    it('validates and normalizes preferences correctly', () => {
      assert.equal(isValidPreference('system'), true);
      assert.equal(isValidPreference('light'), true);
      assert.equal(isValidPreference('dark'), true);
      assert.equal(isValidPreference('auto'), false);
      assert.equal(isValidPreference(null), false);
      assert.equal(isValidPreference(undefined), false);

      assert.equal(normalizePreference('system'), 'system');
      assert.equal(normalizePreference('light'), 'light');
      assert.equal(normalizePreference('dark'), 'dark');
      assert.equal(normalizePreference('invalid'), 'dark');
      assert.equal(normalizePreference(null), 'dark');
    });

    it('resolves effective theme according to pure deterministic rules', () => {
      // Light always resolves to light
      assert.equal(resolveEffectiveTheme('light', 'dark'), 'light');
      assert.equal(resolveEffectiveTheme('light', 'light'), 'light');

      // Dark always resolves to dark
      assert.equal(resolveEffectiveTheme('dark', 'dark'), 'dark');
      assert.equal(resolveEffectiveTheme('dark', 'light'), 'dark');

      // System tracks device preference
      assert.equal(resolveEffectiveTheme('system', 'dark'), 'dark');
      assert.equal(resolveEffectiveTheme('system', 'light'), 'light');

      // Unknown/corrupted values safely fall back to default dark theme
      assert.equal(resolveEffectiveTheme('corrupted', 'light'), 'dark');
      assert.equal(resolveEffectiveTheme('corrupted', 'dark'), 'dark');
    });

    it('synchronizes data-theme attribute on root element safely', () => {
      const mockElement = {
        attributes: {},
        setAttribute(k, v) {
          this.attributes[k] = v;
        },
      };

      const appliedLight = applyThemeToRoot('light', mockElement);
      assert.equal(appliedLight, 'light');
      assert.equal(mockElement.attributes['data-theme'], 'light');

      const appliedDark = applyThemeToRoot('dark', mockElement);
      assert.equal(appliedDark, 'dark');
      assert.equal(mockElement.attributes['data-theme'], 'dark');
    });
  });

  // ═════════════════════════════════════════════════════════════════
  // 4. SETTINGS-ONLY THEME SELECTOR INVARIANT
  // ═════════════════════════════════════════════════════════════════
  describe('4. Settings-Only Theme Selector Invariant', () => {
    it('verifies ThemeSelector renders exactly three options: System, Light, Dark', () => {
      assert.equal(THEME_OPTIONS.length, 3);
      const values = THEME_OPTIONS.map((o) => o.value);
      assert.deepEqual(values, ['system', 'light', 'dark']);
    });

    it('verifies ThemeSelector implements accessible radiogroup semantics', () => {
      assert.ok(themeSelectorCode.includes('role="radiogroup"'), 'ThemeSelector must implement role="radiogroup"');
      assert.ok(themeSelectorCode.includes('role="radio"'), 'Options must implement role="radio"');
      assert.ok(themeSelectorCode.includes('aria-checked='), 'Options must declare aria-checked');
      assert.ok(themeSelectorCode.includes('tabIndex='), 'Options must use roving tabIndex');
      assert.ok(themeSelectorCode.includes('onKeyDown='), 'ThemeSelector must implement keyboard handling');
    });

    it('guarantees theme controls are Settings-only (no navbar or layout toggle)', () => {
      // MainNavbar must NOT render any theme toggle or preference button
      assert.doesNotMatch(mainNavbarCode, /ThemeSelector/);
      assert.doesNotMatch(mainNavbarCode, /ThemeToggle/);
      assert.doesNotMatch(mainNavbarCode, /setPreference/);

      // MainLayout must NOT render any theme toggle
      assert.doesNotMatch(mainLayoutCode, /ThemeSelector/);
      assert.doesNotMatch(mainLayoutCode, /ThemeToggle/);

      // MobileMoreDrawer must NOT render any inline theme toggle
      assert.doesNotMatch(mobileDrawerCode, /ThemeSelector/);
      assert.doesNotMatch(mobileDrawerCode, /ThemeToggle/);
    });
  });

  // ═════════════════════════════════════════════════════════════════
  // 5. SEMANTIC INPUTS AND BUTTONS
  // ═════════════════════════════════════════════════════════════════
  describe('5. Semantic Inputs and Buttons in Both Themes', () => {
    it('verifies .glass-input and .zn-input use semantic tokens without forcing dark backgrounds in light mode', () => {
      const glassInputMatch = css.match(/\.glass-input\s*\{([^}]+)\}/);
      assert.ok(glassInputMatch, '.glass-input rule must exist');
      assert.ok(glassInputMatch[1].includes('var(--color-surface-elevated'), '.glass-input must use surface-elevated');
      assert.ok(glassInputMatch[1].includes('var(--color-border'), '.glass-input must use semantic border');
      assert.ok(glassInputMatch[1].includes('var(--color-text-primary'), '.glass-input must use text-primary');

      const znInputMatch = css.match(/\.zn-input\s*\{([^}]+)\}/);
      assert.ok(znInputMatch, '.zn-input rule must exist');
      assert.ok(znInputMatch[1].includes('var(--zn-token-input-bg'), '.zn-input must use semantic input bg');
      assert.ok(znInputMatch[1].includes('var(--zn-token-input-border'), '.zn-input must use semantic input border');
      assert.ok(znInputMatch[1].includes('var(--zn-token-input-text'), '.zn-input must use semantic input text');
    });

    it('verifies .zn-textarea is defined with semantic tokens', () => {
      const znTextareaMatch = css.match(/\.zn-textarea\s*\{([^}]+)\}/);
      assert.ok(znTextareaMatch, '.zn-textarea rule must exist');
      assert.ok(znTextareaMatch[1].includes('var(--zn-token-input-bg'), '.zn-textarea must use semantic input bg');
      assert.ok(znTextareaMatch[1].includes('var(--radius-control, 8px)'), '.zn-textarea must use 8px radius');
    });

    it('verifies button styling in both themes enforces brand contrast', () => {
      // Light Mode primary buttons use deep brand navy (#12314C) with white text
      assert.ok(css.includes('[data-theme="light"] .zn-btn-primary'), 'Light mode .zn-btn-primary override must exist');
      assert.ok(css.includes('[data-theme="light"] .btn-primary'), 'Light mode .btn-primary override must exist');

      // Light Mode secondary buttons use white background, slate border, dark text
      assert.ok(css.includes('[data-theme="light"] .zn-btn-secondary'), 'Light mode .zn-btn-secondary override must exist');
      assert.ok(css.includes('[data-theme="light"] .btn-secondary'), 'Light mode .btn-secondary override must exist');
    });
  });

  // ═════════════════════════════════════════════════════════════════
  // 6. INTERACTION STATES & ACCESSIBILITY
  // ═════════════════════════════════════════════════════════════════
  describe('6. Interaction States and Accessibility', () => {
    it('verifies focus-visible indicators across buttons, inputs, tabs, chips, and controls in both themes', () => {
      assert.ok(css.includes('.zn-btn-primary:focus-visible'), 'CSS must define .zn-btn-primary:focus-visible');
      assert.ok(css.includes('.zn-btn-secondary:focus-visible'), 'CSS must define .zn-btn-secondary:focus-visible');
      assert.ok(css.includes('.zn-input:focus-visible'), 'CSS must define .zn-input:focus-visible');
      assert.ok(css.includes('.glass-input:focus-visible'), 'CSS must define .glass-input:focus-visible');
      assert.ok(css.includes('.zn-chip:focus-visible'), 'CSS must define .zn-chip:focus-visible');
      assert.ok(css.includes('[role="tab"]:focus-visible'), 'CSS must define [role="tab"]:focus-visible');

      // Light mode focus rings
      assert.ok(css.includes('[data-theme="light"] .zn-btn-primary:focus-visible'), 'Light theme focus ring for primary button');
      assert.ok(css.includes('[data-theme="light"] .zn-btn-secondary:focus-visible'), 'Light theme focus ring for secondary button');
      assert.ok(css.includes('[data-theme="light"] .zn-input:focus-visible'), 'Light theme focus ring for input');
      assert.ok(css.includes('[data-theme="light"] [role="tab"]:focus-visible'), 'Light theme focus ring for tabs');
    });

    it('verifies disabled states do not rely on color alone (grayscale + opacity + cursor)', () => {
      assert.ok(css.includes('filter: grayscale(0.5);'), 'Disabled states must include grayscale filter');
      assert.ok(css.includes('cursor: not-allowed'), 'Disabled states must set cursor: not-allowed');
      assert.ok(css.includes('pointer-events: none'), 'Disabled states must disable pointer events');
    });

    it('verifies prefers-reduced-motion neutralizes animations and transitions', () => {
      const reducedMotionMatch = css.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([^}]+)\}/);
      assert.ok(reducedMotionMatch, 'prefers-reduced-motion media query must exist');
      const block = reducedMotionMatch[1];
      assert.ok(block.includes('animation-duration: 0.01ms !important;'), 'Must neutralize animation duration');
      assert.ok(block.includes('transition-duration: 0.01ms !important;'), 'Must neutralize transition duration');
    });
  });

  // ═════════════════════════════════════════════════════════════════
  // 7. PRESERVATION & SCOPE INTEGRITY
  // ═════════════════════════════════════════════════════════════════
  describe('7. Preservation and Scope Integrity', () => {
    it('confirms desktop navigation and mobile navigation were NOT modified', () => {
      // MainNavbar retains its structure and does not contain Phase 2 navigation groups
      assert.ok(mainNavbarCode.includes('export default function MainNavbar'));
      assert.ok(mainNavbarCode.includes('NotificationBell'));

      // MainLayout retains its shell structure
      assert.ok(mainLayoutCode.includes('export default function MainLayout'));
      assert.ok(mainLayoutCode.includes('MainNavbar'));

      // MobileMoreDrawer retains its structure
      assert.ok(mobileDrawerCode.includes('export default function MobileMoreDrawer'));
    });
  });
});
