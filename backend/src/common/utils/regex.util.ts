/**
 * Escapes regex special characters to prevent ReDoS and invalid regex syntax errors.
 * Clamps input to a safe max length.
 */
export function escapeRegex(str: string, maxLength = 100): string {
  if (!str || typeof str !== 'string') return '';
  return str.slice(0, maxLength).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '')
    .trim();
}
