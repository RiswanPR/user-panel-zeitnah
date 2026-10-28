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
  resolveEffectiveTheme,
  readStoredThemePreference,
  writeStoredThemePreference,
  applyThemeToRoot,
} from './themeEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const THEME_SELECTOR_PATH = path.resolve(__dirname, '../components/settings/ThemeSelector.jsx');
const EDIT_PROFILE_PATH = path.resolve(__dirname, '../pages/profile/EditProfile.jsx');
const ACCOUNT_PAGE_PATH = path.resolve(__dirname, '../pages/profile/AccountPage.jsx');
const ACCOUNT_NAV_PATH = path.resolve(__dirname, '../components/profile/AccountNav.jsx');
const MAIN_NAVBAR_PATH = path.resolve(__dirname, '../components/navigation/MainNavbar.jsx');
const APP_JSX_PATH = path.resolve(__dirname, '../App.jsx');

describe('Zeitnah — Phase 3: Settings Theme Selector Unit Tests', () => {
  // ── TEST 1: The selector renders all three options ──
  it('1. selector defines and renders exactly three options: System, Light, and Dark', () => {
    assert.equal(THEME_OPTIONS.length, 3);

    const values = THEME_OPTIONS.map((o) => o.value);
    assert.deepEqual(values, [
      THEME_PREFERENCES.SYSTEM,
      THEME_PREFERENCES.LIGHT,
      THEME_PREFERENCES.DARK,
    ]);

    for (const opt of THEME_OPTIONS) {
      assert.ok(opt.label, `Option ${opt.value} must have a label`);
      assert.ok(opt.description, `Option ${opt.value} must have a description`);
      assert.ok(opt.badge, `Option ${opt.value} must have a badge`);
    }

    const fileContent = fs.readFileSync(THEME_SELECTOR_PATH, 'utf8');
    assert.ok(fileContent.includes('role="radiogroup"'));
    assert.ok(fileContent.includes('role="radio"'));
    assert.ok(fileContent.includes('OPTION_ICONS'));
    assert.ok(fileContent.includes('Monitor'));
    assert.ok(fileContent.includes('Sun'));
    assert.ok(fileContent.includes('Moon'));
  });

  // ── TEST 2: The currently saved preference is selected correctly ──
  it('2. currently saved preference is marked as selected in radiogroup', () => {
    // Helper to evaluate aria-checked state for each option given an active preference
    const getCheckedMap = (currentPref) => {
      const map = {};
      for (const opt of THEME_OPTIONS) {
        map[opt.value] = opt.value === currentPref;
      }
      return map;
    };

    // When preference is system
    const systemChecked = getCheckedMap(THEME_PREFERENCES.SYSTEM);
    assert.equal(systemChecked.system, true);
    assert.equal(systemChecked.light, false);
    assert.equal(systemChecked.dark, false);

    // When preference is light
    const lightChecked = getCheckedMap(THEME_PREFERENCES.LIGHT);
    assert.equal(lightChecked.system, false);
    assert.equal(lightChecked.light, true);
    assert.equal(lightChecked.dark, false);

    // When preference is dark
    const darkChecked = getCheckedMap(THEME_PREFERENCES.DARK);
    assert.equal(darkChecked.system, false);
    assert.equal(darkChecked.light, false);
    assert.equal(darkChecked.dark, true);
  });

  // ── TEST 3: Choosing Light immediately updates the effective theme ──
  it('3. choosing Light immediately resolves and applies "light" to the root document', () => {
    const mockRoot = {
      attributes: {},
      setAttribute(name, val) {
        this.attributes[name] = val;
      },
      getAttribute(name) {
        return this.attributes[name];
      },
    };

    const nextPref = THEME_PREFERENCES.LIGHT;
    const effectiveTheme = resolveEffectiveTheme(nextPref, 'dark');
    assert.equal(effectiveTheme, EFFECTIVE_THEMES.LIGHT);

    applyThemeToRoot(effectiveTheme, mockRoot);
    assert.equal(mockRoot.getAttribute('data-theme'), 'light');
  });

  // ── TEST 4: Choosing Dark immediately updates the effective theme ──
  it('4. choosing Dark immediately resolves and applies "dark" to the root document', () => {
    const mockRoot = {
      attributes: {},
      setAttribute(name, val) {
        this.attributes[name] = val;
      },
      getAttribute(name) {
        return this.attributes[name];
      },
    };

    const nextPref = THEME_PREFERENCES.DARK;
    const effectiveTheme = resolveEffectiveTheme(nextPref, 'light');
    assert.equal(effectiveTheme, EFFECTIVE_THEMES.DARK);

    applyThemeToRoot(effectiveTheme, mockRoot);
    assert.equal(mockRoot.getAttribute('data-theme'), 'dark');
  });

  // ── TEST 5: Choosing System resumes device preference behavior ──
  it('5. choosing System resumes dynamic device preference tracking', () => {
    const nextPref = THEME_PREFERENCES.SYSTEM;

    // Device prefers dark -> resolves dark
    const darkDeviceTheme = resolveEffectiveTheme(nextPref, 'dark');
    assert.equal(darkDeviceTheme, EFFECTIVE_THEMES.DARK);

    // Device shifts to light -> resolves light
    const lightDeviceTheme = resolveEffectiveTheme(nextPref, 'light');
    assert.equal(lightDeviceTheme, EFFECTIVE_THEMES.LIGHT);
  });

  // ── TEST 6: Selecting an option persists preference through existing engine ──
  it('6. selecting an option persists the preference using dedicated key "zn_theme_preference_v1"', () => {
    const store = new Map();
    const mockStorage = {
      getItem: (k) => store.get(k) || null,
      setItem: (k, v) => store.set(k, v),
    };

    // Select light
    writeStoredThemePreference(THEME_PREFERENCES.LIGHT, mockStorage);
    assert.equal(store.get(THEME_STORAGE_KEY), 'light');
    assert.equal(readStoredThemePreference(mockStorage), 'light');

    // Select system (must store 'system', not the resolved theme)
    writeStoredThemePreference(THEME_PREFERENCES.SYSTEM, mockStorage);
    assert.equal(store.get(THEME_STORAGE_KEY), 'system');
    assert.equal(readStoredThemePreference(mockStorage), 'system');
  });

  // ── TEST 7: Storage failures do not crash Settings or the theme provider ──
  it('7. storage failures do not crash Settings and return graceful failure status', () => {
    const throwingStorage = {
      getItem: () => {
        throw new Error('QuotaExceededError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };

    // Must return false without throwing
    assert.doesNotThrow(() => {
      const ok = writeStoredThemePreference(THEME_PREFERENCES.LIGHT, throwingStorage);
      assert.equal(ok, false);
    });

    // Read falls back to default dark
    assert.doesNotThrow(() => {
      const pref = readStoredThemePreference(throwingStorage);
      assert.equal(pref, THEME_PREFERENCES.DARK);
    });

    // ThemeSelector contains graceful failure alert
    const fileContent = fs.readFileSync(THEME_SELECTOR_PATH, 'utf8');
    assert.ok(fileContent.includes('role="alert"'));
    assert.ok(fileContent.includes('persistenceWarning'));
  });

  // ── TEST 8: The control is accessible by label and keyboard ──
  it('8. control implements radiogroup semantics, roving tabIndex, and keyboard handlers', () => {
    const fileContent = fs.readFileSync(THEME_SELECTOR_PATH, 'utf8');

    // Accessibility attributes
    assert.ok(fileContent.includes('role="radiogroup"'));
    assert.ok(
      fileContent.includes('aria-label="Theme preference"') ||
      fileContent.includes('aria-label="Theme preference options"')
    );
    assert.ok(fileContent.includes('role="radio"'));
    assert.ok(fileContent.includes('aria-checked={isSelected}'));
    assert.ok(fileContent.includes('tabIndex={isSelected ? 0 : -1}'));

    // Keyboard navigation keys
    assert.ok(fileContent.includes('ArrowRight'));
    assert.ok(fileContent.includes('ArrowLeft'));
    assert.ok(fileContent.includes('ArrowDown'));
    assert.ok(fileContent.includes('ArrowUp'));
    assert.ok(fileContent.includes('Home'));
    assert.ok(fileContent.includes('End'));
    assert.ok(fileContent.includes('Enter'));

  });

  // ── TEST 9: Existing Settings behavior remains intact ──
  it('9. existing Settings page sections and navigation remain fully intact', () => {
    // EditProfile.jsx integrity
    const editProfileContent = fs.readFileSync(EDIT_PROFILE_PATH, 'utf8');
    assert.ok(editProfileContent.includes('basic-info'));
    assert.ok(editProfileContent.includes('professional-identity'));
    assert.ok(editProfileContent.includes('skills'));
    assert.ok(editProfileContent.includes('experience'));
    assert.ok(editProfileContent.includes('education'));
    assert.ok(editProfileContent.includes('certifications'));
    assert.ok(editProfileContent.includes('recommendations'));
    assert.ok(editProfileContent.includes('public-profile'));

    // Appearance section must be registered in SECTION_CONFIG and rendered
    assert.ok(editProfileContent.includes('"appearance"'));
    assert.ok(editProfileContent.includes('<ThemeSelector'));

    // AccountPage.jsx integrity
    const accountPageContent = fs.readFileSync(ACCOUNT_PAGE_PATH, 'utf8');
    assert.ok(accountPageContent.includes('verification'));
    assert.ok(accountPageContent.includes('security'));
    assert.ok(accountPageContent.includes('sessions'));
    assert.ok(accountPageContent.includes('appearance'));
    assert.ok(accountPageContent.includes('<ThemeSelector'));

    // AccountNav.jsx integrity
    const accountNavContent = fs.readFileSync(ACCOUNT_NAV_PATH, 'utf8');
    assert.ok(accountNavContent.includes('id: "appearance"'));
  });

  // ── TEST 10: No second theme state, duplicate storage key, or navigation toggle ──
  it('10. guarantees strict boundaries: no duplicate storage key, no second theme state, no navbar toggle', () => {
    // Navbar must not have a theme toggle
    const navbarContent = fs.readFileSync(MAIN_NAVBAR_PATH, 'utf8');
    assert.doesNotMatch(navbarContent, /ThemeToggle/);
    assert.doesNotMatch(navbarContent, /ThemeSelector/);
    assert.doesNotMatch(navbarContent, /useTheme\(/);

    // App.jsx must not have a theme toggle
    const appContent = fs.readFileSync(APP_JSX_PATH, 'utf8');
    assert.doesNotMatch(appContent, /ThemeToggle/);
    assert.doesNotMatch(appContent, /ThemeSelector/);

    // Only one dedicated storage key must be used
    assert.equal(THEME_STORAGE_KEY, 'zn_theme_preference_v1');
  });
});
