import { nativeApp } from './app';

export interface DeepLinkRoute {
  path: string;
  params?: Record<string, string>;
}

/**
 * Parses deep link URLs (e.g. zeitnah://courses/class/123 or https://beta.zeitnahacademy.com/community/messages/456)
 * and returns the internal SPA route.
 */
export function parseDeepLink(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    // Return relative path + query + hash
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    // If not a standard URL, try custom scheme parsing: zeitnah://...
    if (rawUrl.startsWith('zeitnah://')) {
      const path = rawUrl.replace('zeitnah://', '/');
      return path.startsWith('/') ? path : `/${path}`;
    }
    return null;
  }
}

/**
 * Initializes deep link listener and routes to React Router navigate function
 */
export function initDeepLinks(navigate: (path: string) => void): () => void {
  return nativeApp.onAppUrlOpen((url) => {
    const internalPath = parseDeepLink(url);
    if (internalPath) {
      console.log(`[DeepLink] Routing to: ${internalPath}`);
      navigate(internalPath);
    }
  });
}
