/**
 * Format relative time safely and concisely for Community posts & comments.
 *
 * @param {string|Date|null|undefined} dateStr
 * @returns {string} Formatted relative time (e.g. 'Just now', '5m', '2h', '3d')
 */
export function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString();
}

/**
 * Truncate long post body text with ellipsis.
 *
 * @param {string} text
 * @param {number} limit
 * @returns {{ isLong: boolean, text: string }}
 */
export function truncateContent(text, limit = 260) {
  if (!text) return { isLong: false, text: '' };
  const lineCount = text.split('\n').length;
  const isLong = text.length > limit || lineCount > 4;
  return {
    isLong,
    text: isLong ? `${text.slice(0, limit).trim()}...` : text,
  };
}

/**
 * Clean hashtag string removing leading hashes and spaces.
 *
 * @param {string} tag
 * @returns {string}
 */
export function sanitizeTag(tag) {
  if (!tag || typeof tag !== 'string') return '';
  return tag.trim().replace(/^#+/, '').toLowerCase();
}

/**
 * Validate and normalize feed filter string.
 * Falls back to 'all' if invalid.
 *
 * @param {string|null|undefined} filterParam
 * @returns {'all'|'following'|'cohort'}
 */
export function normalizeFeedFilter(filterParam) {
  const allowed = ['all', 'following', 'cohort', 'trending', 'saved'];
  if (filterParam && allowed.includes(filterParam.toLowerCase())) {
    return filterParam.toLowerCase();
  }
  return 'all';
}

/**
 * Extract real trending topics from active posts deterministically.
 * Extracts tags, hashtags array, and #mentions from content text.
 * Returns unique topics sorted by real post frequency without fake counts.
 *
 * @param {Array<Object>} posts
 * @param {number} limit
 * @returns {Array<{ tag: string, count: number }>}
 */
export function extractTrendingTopics(posts = [], limit = 6) {
  if (!Array.isArray(posts) || posts.length === 0) return [];

  const counts = new Map();

  for (const post of posts) {
    if (!post) continue;
    const postTags = new Set();

    // 1. Explicit tags array
    if (Array.isArray(post.tags)) {
      post.tags.forEach((t) => {
        const clean = sanitizeTag(t);
        if (clean && clean.length > 1) postTags.add(clean);
      });
    }

    // 2. Explicit hashtags array
    if (Array.isArray(post.hashtags)) {
      post.hashtags.forEach((h) => {
        const clean = sanitizeTag(h);
        if (clean && clean.length > 1) postTags.add(clean);
      });
    }

    // 3. Regex #tag matches in content
    if (typeof post.content === 'string') {
      const matches = post.content.match(/#([a-zA-Z0-9_]+)/g);
      if (matches) {
        matches.forEach((m) => {
          const clean = sanitizeTag(m);
          if (clean && clean.length > 1) postTags.add(clean);
        });
      }
    }

    // Count 1 per post for fairness
    for (const tag of postTags) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, limit);
}
