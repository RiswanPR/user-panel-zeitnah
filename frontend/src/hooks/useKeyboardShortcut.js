import { useEffect, useCallback } from 'react';

/**
 * Register a global keyboard shortcut.
 * @param {string} key – The key to listen for (e.g. 'k')
 * @param {Function} callback – Callback to fire on keydown
 * @param {{ ctrl?: boolean, meta?: boolean, shift?: boolean, alt?: boolean }} modifiers
 */
export function useKeyboardShortcut(key, callback, { ctrl, meta, shift, alt } = {}) {
  const handler = useCallback((e) => {
    const needsMeta = meta ?? false;
    const needsCtrl = ctrl ?? false;
    const needsShift = shift ?? false;
    const needsAlt = alt ?? false;

    // Match the key case-insensitively
    if (e.key.toLowerCase() !== key.toLowerCase()) return;

    // Check modifiers
    if (needsMeta && !e.metaKey) return;
    if (needsCtrl && !e.ctrlKey) return;
    if (needsShift && !e.shiftKey) return;
    if (needsAlt && !e.altKey) return;

    // Don't fire when user is typing in an input/textarea
    const tag = document.activeElement?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

    e.preventDefault();
    callback(e);
  }, [key, callback, ctrl, meta, shift, alt]);

  useEffect(() => {
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [handler]);
}

export default useKeyboardShortcut;
