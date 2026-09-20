/**
 * Escapes regex special characters to prevent ReDoS and invalid regex syntax errors.
 * Clamps input to a safe max length.
 */
export function escapeRegex(str: string, maxLength = 100): string {
  if (!str || typeof str !== 'string') return '';
  return str.slice(0, maxLength).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
