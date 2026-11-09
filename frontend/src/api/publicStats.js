// Public (unauthenticated) landing-page statistics.
//
// The backend does not expose a public stats endpoint today (`/api/stats/*` is role-gated, see docs/API.md).
// This function targets the intended path `GET /api/stats/public` and resolves to `null` for every failure mode
// (404, network error, timeout, malformed payload) so callers can simply omit the stats section.
// XMLHttpRequest is used on purpose; see the note at the top of client.js.

const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export const PUBLIC_STATS_TIMEOUT_MS = 5000;

function isCount(value) {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

/**
 * Validate a decoded payload. Returns `{ jobCount, courseCount }` only when both are non-negative integers.
 * @param {unknown} payload
 * @returns {{ jobCount: number, courseCount: number } | null}
 */
export function parsePublicStats(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const { jobCount, courseCount } = payload;
  if (!isCount(jobCount) || !isCount(courseCount)) return null;
  return { jobCount, courseCount };
}

/**
 * Fetch the public Cebu job and course counts. Never rejects.
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<{ jobCount: number, courseCount: number } | null>}
 */
export function fetchPublicStats({ signal } = {}) {
  return new Promise((resolve) => {
    let settled = false;
    let xhr;
    let timer;

    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      resolve(value);
    };
    function onAbort() {
      try {
        xhr?.abort();
      } catch {
        // ignore
      }
      finish(null);
    }

    if (signal?.aborted) {
      finish(null);
      return;
    }
    signal?.addEventListener('abort', onAbort, { once: true });

    try {
      xhr = new XMLHttpRequest();
      xhr.open('GET', `${API_BASE}/stats/public`);
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.timeout = PUBLIC_STATS_TIMEOUT_MS;
      xhr.onload = () => {
        if (xhr.status < 200 || xhr.status >= 300) return finish(null);
        try {
          finish(parsePublicStats(JSON.parse(xhr.responseText)));
        } catch {
          finish(null);
        }
      };
      xhr.onerror = () => finish(null);
      xhr.ontimeout = () => finish(null);
      xhr.onabort = () => finish(null);
      // Hard stop in case the environment ignores xhr.timeout.
      timer = setTimeout(() => {
        try {
          xhr.abort();
        } catch {
          // ignore
        }
        finish(null);
      }, PUBLIC_STATS_TIMEOUT_MS);
      xhr.send();
    } catch {
      finish(null);
    }
  });
}
