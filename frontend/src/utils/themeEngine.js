/**
 * ZEITNAH THEME PREFERENCE ENGINE — PURE UTILITIES
 *
 * Provides deterministic, isolated, and testable pure helpers for:
 * 1. Preference validation and normalization ('system' | 'light' | 'dark').
 * 2. Device 'prefers-color-scheme' detection.
 * 3. Effective theme resolution.
 * 4. Fault-tolerant storage persistence using dedicated key 'zn_theme_preference_v1'.
 * 5. Root document 'data-theme' synchronization.
 */

export const THEME_PREFERENCES = Object.freeze({
  SYSTEM: 'system',
  LIGHT: 'light',
  DARK: 'dark',
});

export const EFFECTIVE_THEMES = Object.freeze({
  LIGHT: 'light',
  DARK: 'dark',
});

export const THEME_STORAGE_KEY = 'zn_theme_preference_v1';
export const DEFAULT_PREFERENCE = THEME_PREFERENCES.SYSTEM;
export const FALLBACK_EFFECTIVE_THEME = EFFECTIVE_THEMES.DARK;

export const THEME_OPTIONS = Object.freeze([
  {
    id: THEME_PREFERENCES.SYSTEM,
    value: THEME_PREFERENCES.SYSTEM,
    label: 'System',
    badge: 'Automatic',
    description: 'Matches your operating system appearance and dynamically updates with device shifts.',
  },
  {
    id: THEME_PREFERENCES.LIGHT,
    value: THEME_PREFERENCES.LIGHT,
    label: 'Light',
    badge: 'High Contrast',
    description: 'Crisp slate-50 canvas with high-contrast text and deep emerald accents for daylight focus.',
  },
  {
    id: THEME_PREFERENCES.DARK,
    value: THEME_PREFERENCES.DARK,
    label: 'Dark',
    badge: 'Signature',
    description: 'Zeitnah signature deep navy background with mint accents, engineered for reduced eye strain.',
  },
]);

/**
 * Validates whether a value is an allowed user preference ('system' | 'light' | 'dark').
 * @param {unknown} value
 * @returns {boolean}
 */
export function isValidPreference(value) {
  return (
    value === THEME_PREFERENCES.SYSTEM ||
    value === THEME_PREFERENCES.LIGHT ||
    value === THEME_PREFERENCES.DARK
  );
}

/**
 * Normalizes any input to a valid preference. Unknown or missing values fall back to 'system'.
 * @param {unknown} value
 * @returns {'system' | 'light' | 'dark'}
 */
export function normalizePreference(value) {
  if (isValidPreference(value)) {
    return /** @type {'system' | 'light' | 'dark'} */ (value);
  }
  return DEFAULT_PREFERENCE;
}

/**
 * Inspects device-level color scheme preference using matchMedia.
 * Fails safely to 'dark' (preserving existing default appearance) if window or matchMedia is missing.
 * @param {((query: string) => { matches: boolean }) | null} [customMatchMedia] Optional mock for testing.
 * @returns {'light' | 'dark'}
 */
export function getDeviceThemePreference(customMatchMedia) {
  try {
    const matchMediaFn =
      customMatchMedia ||
      (typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia.bind(window)
        : null);

    if (!matchMediaFn) {
      return FALLBACK_EFFECTIVE_THEME;
    }

    const mq = matchMediaFn('(prefers-color-scheme: dark)');
    return mq && mq.matches ? EFFECTIVE_THEMES.DARK : EFFECTIVE_THEMES.LIGHT;
  } catch {
    return FALLBACK_EFFECTIVE_THEME;
  }
}

/**
 * Pure function: Resolves the effective theme ('light' | 'dark') from a user preference
 * and the current device theme.
 *
 * Rules:
 * - 'light' always resolves to 'light'.
 * - 'dark' always resolves to 'dark'.
 * - 'system' (or any invalid/unknown preference) resolves to deviceTheme.
 *
 * @param {unknown} preference User's saved or selected preference.
 * @param {'light' | 'dark'} [deviceTheme] Current device preference (defaults to 'dark').
 * @returns {'light' | 'dark'} Effective theme applied to the document.
 */
export function resolveEffectiveTheme(preference, deviceTheme = FALLBACK_EFFECTIVE_THEME) {
  const normalizedPref = normalizePreference(preference);
  const normalizedDevice =
    deviceTheme === EFFECTIVE_THEMES.LIGHT ? EFFECTIVE_THEMES.LIGHT : EFFECTIVE_THEMES.DARK;

  if (normalizedPref === THEME_PREFERENCES.LIGHT) {
    return EFFECTIVE_THEMES.LIGHT;
  }
  if (normalizedPref === THEME_PREFERENCES.DARK) {
    return EFFECTIVE_THEMES.DARK;
  }

  return normalizedDevice;
}

/**
 * Safely reads the stored theme preference from the storage abstraction or localStorage.
 * Guaranteed never to throw; safely returns 'system' on any error, missing key, or invalid data.
 * @param {{ getItem: (key: string) => string | null } | null} [storageImpl] Storage implementation.
 * @returns {'system' | 'light' | 'dark'}
 */
export function readStoredThemePreference(storageImpl) {
  try {
    const impl =
      storageImpl ||
      storage ||
      (typeof window !== 'undefined' && window.localStorage ? window.localStorage : null);

    if (!impl || typeof impl.getItem !== 'function') {
      return DEFAULT_PREFERENCE;
    }

    const raw = impl.getItem(THEME_STORAGE_KEY);
    return normalizePreference(raw);
  } catch {
    return DEFAULT_PREFERENCE;
  }
}

/**
 * Safely writes the theme preference to storage.
 * Does not write the resolved theme as a manual choice.
 * @param {unknown} preference User preference to store ('system' | 'light' | 'dark').
 * @param {{ setItem: (key: string, value: string) => void } | null} [storageImpl] Storage implementation.
 * @returns {boolean} Whether writing succeeded without throwing.
 */
export function writeStoredThemePreference(preference, storageImpl) {
  try {
    const normalized = normalizePreference(preference);
    const impl =
      storageImpl ||
      storage ||
      (typeof window !== 'undefined' && window.localStorage ? window.localStorage : null);

    if (!impl || typeof impl.setItem !== 'function') {
      return false;
    }

    impl.setItem(THEME_STORAGE_KEY, normalized);
    return true;
  } catch {
    return false;
  }
}

/**
 * Applies the effective theme ('light' | 'dark') to the root documentElement
 * via the Phase 1 'data-theme' attribute.
 *
 * Preserves all unrelated existing classes, styles, and attributes.
 * Updates meta theme-color and color-scheme where present.
 *
 * @param {unknown} effectiveTheme Must resolve to 'light' or 'dark'.
 * @param {HTMLElement | null} [targetElement] Element to apply to (defaults to document.documentElement).
 * @returns {'light' | 'dark'} The theme applied.
 */
export function applyThemeToRoot(effectiveTheme, targetElement) {
  const safeTheme =
    effectiveTheme === EFFECTIVE_THEMES.LIGHT ? EFFECTIVE_THEMES.LIGHT : EFFECTIVE_THEMES.DARK;

  try {
    const el =
      targetElement ||
      (typeof document !== 'undefined' ? document.documentElement : null);

    if (el && typeof el.setAttribute === 'function') {
      el.setAttribute('data-theme', safeTheme);
    }

    // Update <meta name="theme-color"> if present in the document
    if (typeof document !== 'undefined') {
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor && typeof metaThemeColor.setAttribute === 'function') {
        metaThemeColor.setAttribute(
          'content',
          safeTheme === EFFECTIVE_THEMES.LIGHT ? '#F8FAFC' : '#070B14'
        );
      }

      const metaColorScheme = document.querySelector('meta[name="color-scheme"]');
      if (metaColorScheme && typeof metaColorScheme.setAttribute === 'function') {
        metaColorScheme.setAttribute('content', safeTheme);
      }
    }
  } catch {
    // Non-blocking in non-browser environments
  }

  return safeTheme;
}
