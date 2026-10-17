import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  THEME_PREFERENCES,
  EFFECTIVE_THEMES,
  THEME_STORAGE_KEY,
  DEFAULT_PREFERENCE,
  FALLBACK_EFFECTIVE_THEME,
  isValidPreference,
  normalizePreference,
  getDeviceThemePreference,
  resolveEffectiveTheme,
  readStoredThemePreference,
  writeStoredThemePreference,
  applyThemeToRoot,
} from './themeEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const INDEX_HTML_PATH = path.resolve(__dirname, '../../index.html');
const MAIN_JSX_PATH = path.resolve(__dirname, '../main.jsx');
const APP_JSX_PATH = path.resolve(__dirname, '../App.jsx');

describe('Zeitnah — Phase 2: Theme Preference Engine Unit Tests', () => {
  // ── TEST 1: Missing preference defaults to system ──
  it('1. missing preference in storage defaults to "system"', () => {
    const mockStorage = {
      getItem: (key) => {
        assert.equal(key, THEME_STORAGE_KEY);
        return null;
      },
    };
    const preference = readStoredThemePreference(mockStorage);
    assert.equal(preference, THEME_PREFERENCES.SYSTEM);
    assert.equal(preference, DEFAULT_PREFERENCE);
  });

  // ── TEST 2: Valid light preference resolves to light ──
  it('2. valid light preference resolves to "light"', () => {
    const effective = resolveEffectiveTheme(THEME_PREFERENCES.LIGHT, 'dark');
    assert.equal(effective, EFFECTIVE_THEMES.LIGHT);
  });

  // ── TEST 3: Valid dark preference resolves to dark ──
  it('3. valid dark preference resolves to "dark"', () => {
    const effective = resolveEffectiveTheme(THEME_PREFERENCES.DARK, 'light');
    assert.equal(effective, EFFECTIVE_THEMES.DARK);
  });

  // ── TEST 4: System resolves correctly when device prefers light ──
  it('4. system preference resolves to "light" when the device prefers light', () => {
    const effective = resolveEffectiveTheme(THEME_PREFERENCES.SYSTEM, EFFECTIVE_THEMES.LIGHT);
    assert.equal(effective, EFFECTIVE_THEMES.LIGHT);
  });

  // ── TEST 5: System resolves correctly when device prefers dark ──
  it('5. system preference resolves to "dark" when the device prefers dark', () => {
    const effective = resolveEffectiveTheme(THEME_PREFERENCES.SYSTEM, EFFECTIVE_THEMES.DARK);
    assert.equal(effective, EFFECTIVE_THEMES.DARK);
  });

  // ── TEST 6: Invalid preference falls back to system ──
  it('6. invalid or unknown preference values safely fall back to "system"', () => {
    const invalidValues = ['blue', 'neon', 'auto', '', 123, null, undefined, {}, []];
    for (const val of invalidValues) {
      assert.equal(
        normalizePreference(val),
        THEME_PREFERENCES.SYSTEM,
        `Expected ${JSON.stringify(val)} to normalize to "system"`
      );
      // When normalized to system with a light device, resolves to light
      assert.equal(resolveEffectiveTheme(val, 'light'), EFFECTIVE_THEMES.LIGHT);
      // When normalized to system with a dark device, resolves to dark
      assert.equal(resolveEffectiveTheme(val, 'dark'), EFFECTIVE_THEMES.DARK);
    }
  });

  // ── TEST 7: Manual light preference remains light when system preference changes ──
  it('7. manual light preference remains "light" regardless of device changes', () => {
    // When device starts dark
    assert.equal(resolveEffectiveTheme(THEME_PREFERENCES.LIGHT, 'dark'), EFFECTIVE_THEMES.LIGHT);
    // When device flips to light
    assert.equal(resolveEffectiveTheme(THEME_PREFERENCES.LIGHT, 'light'), EFFECTIVE_THEMES.LIGHT);
    // When device flips back to dark
    assert.equal(resolveEffectiveTheme(THEME_PREFERENCES.LIGHT, 'dark'), EFFECTIVE_THEMES.LIGHT);
  });

  // ── TEST 8: Manual dark preference remains dark when system preference changes ──
  it('8. manual dark preference remains "dark" regardless of device changes', () => {
    // When device starts light
    assert.equal(resolveEffectiveTheme(THEME_PREFERENCES.DARK, 'light'), EFFECTIVE_THEMES.DARK);
    // When device flips to dark
    assert.equal(resolveEffectiveTheme(THEME_PREFERENCES.DARK, 'dark'), EFFECTIVE_THEMES.DARK);
    // When device flips back to light
    assert.equal(resolveEffectiveTheme(THEME_PREFERENCES.DARK, 'light'), EFFECTIVE_THEMES.DARK);
  });

  // ── TEST 9: Switching to system resumes following system preference ──
  it('9. switching back to "system" resumes tracking device preference changes', () => {
    let userPref = THEME_PREFERENCES.DARK;
    assert.equal(resolveEffectiveTheme(userPref, 'light'), EFFECTIVE_THEMES.DARK);

    // User switches to system
    userPref = THEME_PREFERENCES.SYSTEM;
    // With device light
    assert.equal(resolveEffectiveTheme(userPref, 'light'), EFFECTIVE_THEMES.LIGHT);
    // With device dark
    assert.equal(resolveEffectiveTheme(userPref, 'dark'), EFFECTIVE_THEMES.DARK);
  });

  // ── TEST 10: Storage failures do not crash the resolver ──
  it('10. storage read and write failures do not crash the resolver or application', () => {
    const throwingReader = {
      getItem: () => {
        throw new Error('SecurityError: Access denied to localStorage');
      },
    };
    // Must not throw, returns default 'system'
    assert.doesNotThrow(() => {
      const pref = readStoredThemePreference(throwingReader);
      assert.equal(pref, THEME_PREFERENCES.SYSTEM);
    });

    const throwingWriter = {
      setItem: () => {
        throw new Error('QuotaExceededError: Storage quota exceeded');
      },
    };
    // Must not throw, returns false
    assert.doesNotThrow(() => {
      const ok = writeStoredThemePreference(THEME_PREFERENCES.LIGHT, throwingWriter);
      assert.equal(ok, false);
    });

    // Null or undefined storage
    assert.equal(readStoredThemePreference(null), THEME_PREFERENCES.SYSTEM);
    assert.equal(writeStoredThemePreference(THEME_PREFERENCES.LIGHT, null), false);
  });

  // ── TEST 11: Root theme application uses only 'light' or 'dark' ──
  it('11. root theme application uses only strictly "light" or "dark"', () => {
    const mockEl = {
      attributes: {},
      setAttribute(name, val) {
        this.attributes[name] = val;
      },
      getAttribute(name) {
        return this.attributes[name];
      },
    };

    applyThemeToRoot('light', mockEl);
    assert.equal(mockEl.getAttribute('data-theme'), 'light');

    applyThemeToRoot('dark', mockEl);
    assert.equal(mockEl.getAttribute('data-theme'), 'dark');

    // Invalid values fall back to 'dark' (preserving default appearance)
    applyThemeToRoot('system', mockEl);
    assert.equal(mockEl.getAttribute('data-theme'), 'dark');

    applyThemeToRoot('invalid-theme', mockEl);
    assert.equal(mockEl.getAttribute('data-theme'), 'dark');
  });

  // ── TEST 12: Existing unrelated root attributes remain intact ──
  it('12. existing unrelated root attributes and classes remain intact when applying theme', () => {
    const mockEl = {
      attributes: {
        lang: 'en',
        class: 'custom-user-root-class font-feature-loaded',
        'data-version': '1.0.0',
      },
      setAttribute(name, val) {
        this.attributes[name] = val;
      },
      getAttribute(name) {
        return this.attributes[name];
      },
    };

    applyThemeToRoot('light', mockEl);

    // data-theme must be applied
    assert.equal(mockEl.getAttribute('data-theme'), 'light');
    // Pre-existing attributes must not be deleted or overwritten
    assert.equal(mockEl.getAttribute('lang'), 'en');
    assert.equal(mockEl.getAttribute('class'), 'custom-user-root-class font-feature-loaded');
    assert.equal(mockEl.getAttribute('data-version'), '1.0.0');
  });

  // ── ADDITIONAL TESTS: Storage Key Versioning & Dedicated Keys ──
  it('verifies dedicated versioned storage key "zn_theme_preference_v1" is used', () => {
    assert.equal(THEME_STORAGE_KEY, 'zn_theme_preference_v1');

    const store = new Map();
    const mockStorage = {
      getItem: (k) => store.get(k) || null,
      setItem: (k, v) => store.set(k, v),
    };

    // Does not write resolved system as manual choice
    writeStoredThemePreference('system', mockStorage);
    assert.equal(store.get(THEME_STORAGE_KEY), 'system');

    writeStoredThemePreference('light', mockStorage);
    assert.equal(store.get(THEME_STORAGE_KEY), 'light');
  });

  // ── ADDITIONAL TESTS: matchMedia fallback behavior ──
  it('verifies getDeviceThemePreference queries matchMedia safely', () => {
    const mockLightMatchMedia = (query) => {
      assert.equal(query, '(prefers-color-scheme: dark)');
      return { matches: false };
    };
    assert.equal(getDeviceThemePreference(mockLightMatchMedia), 'light');

    const mockDarkMatchMedia = (query) => {
      assert.equal(query, '(prefers-color-scheme: dark)');
      return { matches: true };
    };
    assert.equal(getDeviceThemePreference(mockDarkMatchMedia), 'dark');

    // Missing matchMedia falls back to dark (existing default appearance)
    assert.equal(getDeviceThemePreference(null), 'dark');
  });

  // ── ADDITIONAL TESTS: index.html early anti-FOUC script inspection ──
  it('verifies index.html has early anti-FOUC script and light critical styles', () => {
    const indexHtml = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

    // Must use the dedicated versioned key
    assert.ok(indexHtml.includes('zn_theme_preference_v1'));
    // Must set data-theme attribute
    assert.ok(indexHtml.includes("setAttribute('data-theme'"));
    // Must handle exceptions safely
    assert.ok(indexHtml.includes('catch (e)'));
    // Must contain critical light background style
    assert.ok(indexHtml.includes('html[data-theme="light"]'));
    assert.ok(indexHtml.includes('#F8FAFC'));
  });

  // ── ADDITIONAL TESTS: main.jsx ThemeProvider mounting ──
  it('verifies ThemeProvider is mounted at the root in main.jsx', () => {
    const mainJsx = fs.readFileSync(MAIN_JSX_PATH, 'utf8');
    assert.ok(mainJsx.includes('import { ThemeProvider } from "./context/ThemeContext";'));
    assert.ok(mainJsx.includes('<ThemeProvider>'));
  });

  // ── ADDITIONAL TESTS: Strict exclusions boundary check ──
  it('verifies strict exclusions: no Settings selector or page redesign introduced prematurely', () => {
    const appJsx = fs.readFileSync(APP_JSX_PATH, 'utf8');
    // Must not add theme selector or toggle components
    assert.doesNotMatch(appJsx, /ThemeSelector/);
    assert.doesNotMatch(appJsx, /ThemeToggle/);
  });
});
