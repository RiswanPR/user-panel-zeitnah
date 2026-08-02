const sanitizeHtml = require('sanitize-html');

export function sanitizeUrl(url?: string): string {
  if (!url) return '';
  const clean = sanitizeHtml(url, {
    allowedTags: [],
    allowedAttributes: {},
  }).trim();

  if (!clean) return '';
  if (/^https?:\/\//i.test(clean)) {
    return clean;
  }
  return `https://${clean}`;
}
