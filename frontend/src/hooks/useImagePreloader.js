import { useEffect, useRef } from 'react';

/**
 * Preloads an array of image URLs in the background using `new Image()`.
 * This warms the browser cache so images appear instantly when scrolled into view.
 *
 * @param {string[]} urls – Array of image URLs to preload (falsy values are filtered out)
 */
export function useImagePreloader(urls) {
  const loadedRef = useRef(new Set());

  useEffect(() => {
    if (!urls || urls.length === 0) return;

    const validUrls = urls.filter(Boolean);

    for (const url of validUrls) {
      // Skip already-preloaded URLs
      if (loadedRef.current.has(url)) continue;

      const img = new Image();
      img.decoding = 'async';
      img.src = url;
      loadedRef.current.add(url);
    }
  }, [urls]);
}
