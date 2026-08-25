const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

let cachedOrigin = null;

function apiOrigin() {
  if (cachedOrigin !== null) return cachedOrigin;
  if (/^https?:\/\//i.test(API_BASE)) {
    try {
      cachedOrigin = new URL(API_BASE).origin;
    } catch {
      cachedOrigin = '';
    }
  } else {
    // Same-origin deployments rely on a reverse proxy/dev proxy forwarding
    // both /api and /uploads, so relative file URLs must stay as-is.
    cachedOrigin = '';
  }
  return cachedOrigin;
}

/**
 * Returns a browser-openable URL for a stored application document.
 * - Absolute http(s) URLs (e.g. Cloudflare R2 public URLs) pass through untouched.
 * - Root-relative URLs from the backend's local-disk fallback ("/uploads/...") are
 *   prefixed with the API origin so links resolve against the server that serves them.
 */
export function resolveFileUrl(url) {
  if (!url || typeof url !== 'string') return url;
  if (/^(https?:)?\/\//i.test(url)) return url;
  if (!url.startsWith('/')) return url;
  const origin = apiOrigin();
  return origin ? `${origin}${url}` : url;
}
