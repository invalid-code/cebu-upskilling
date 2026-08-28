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
 * All files are stored in Cloudflare R2 — returned URLs are absolute https://.../key.
 * Legacy root-relative "/uploads/..." values (pre-R2-only mode) are still supported
 * opportunistically by prefixing the API origin so old links do not break.
 */
export function resolveFileUrl(url) {
  if (!url || typeof url !== 'string') return url;
  if (/^(https?:)?\/\//i.test(url)) return url;
  if (!url.startsWith('/')) return url;
  const origin = apiOrigin();
  return origin ? `${origin}${url}` : url;
}
