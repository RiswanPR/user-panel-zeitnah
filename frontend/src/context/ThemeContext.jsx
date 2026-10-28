import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import {
  THEME_PREFERENCES,
  DEFAULT_PREFERENCE,
  readStoredThemePreference,
  writeStoredThemePreference,
  getDeviceThemePreference,
  resolveEffectiveTheme,
  applyThemeToRoot,
} from '../utils/themeEngine';

export const ThemeContext = createContext({
  preference: DEFAULT_PREFERENCE,
  effectiveTheme: 'dark',
  setPreference: () => {},
  isSystem: false,
});

/**
 * Global Theme Provider.
 * Maintains synchronized theme preference and effective theme state at the root of the React tree.
 * Listens to device 'prefers-color-scheme' changes dynamically and cleans up listeners on unmount.
 */
export function ThemeProvider({ children }) {
  // 1. Initial preference from storage (fails gracefully to 'system')
  const [preference, setPreferenceState] = useState(() => readStoredThemePreference());

  // 2. Initial device preference from media query
  const [deviceTheme, setDeviceTheme] = useState(() => getDeviceThemePreference());

  // 3. Compute effective theme strictly ('light' or 'dark')
  const effectiveTheme = useMemo(
    () => resolveEffectiveTheme(preference, deviceTheme),
    [preference, deviceTheme]
  );

  // 4. Synchronize root element 'data-theme' whenever effectiveTheme changes
  useEffect(() => {
    applyThemeToRoot(effectiveTheme);
  }, [effectiveTheme]);

  // 5. Single, clean media-query listener for system theme changes
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    try {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e) => {
        setDeviceTheme(e.matches ? 'dark' : 'light');
      };

      if (mq.addEventListener) {
        mq.addEventListener('change', handleChange);
        return () => mq.removeEventListener('change', handleChange);
      } else if (mq.addListener) {
        mq.addListener(handleChange);
        return () => mq.removeListener(handleChange);
      }
    } catch {
      // Non-blocking in environments without matchMedia
    }
  }, []);

  // 6. Preference setter with persistence
  const setPreference = useCallback((nextPreference) => {
    const success = writeStoredThemePreference(nextPreference);
    setPreferenceState(nextPreference);
    return success;
  }, []);

  const value = useMemo(
    () => ({
      preference,
      effectiveTheme,
      setPreference,
      isSystem: preference === THEME_PREFERENCES.SYSTEM,
    }),
    [preference, effectiveTheme, setPreference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Hook to consume the ThemeContext.
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
