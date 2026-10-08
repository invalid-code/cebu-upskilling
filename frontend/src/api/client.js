// NOTE: This client intentionally uses XMLHttpRequest instead of fetch().
// A browser extension (injectScriptAdjust.js) patches window.fetch and rewrites
// outgoing URLs to http://localhost:5179, breaking API calls. XHR is not
// patched by that extension, so requests reach the server untouched.
const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

import { isTokenExpired } from '../lib/jwt';

function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
}

function getRefreshToken() {
  try {
    return localStorage.getItem('refreshToken');
  } catch {
    return null;
  }
}

// Paths that must never trigger a refresh attempt (avoids retry loops).
function isRefreshExempt(path) {
  return path === '/auth/refresh' || path === '/auth/logout';
}

// Single-flight refresh: concurrent 401s share one /auth/refresh call.
let refreshPromise = null;
function refreshSession() {
  if (refreshPromise) return refreshPromise;
  const rt = getRefreshToken();
  if (!rt) return Promise.resolve(null);
  refreshPromise = new Promise((resolve) => {
    let settled = false;
    const done = (data) => {
      if (!settled) {
        settled = true;
        resolve(data);
      }
    };
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE}/auth/refresh`);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            if (data && data.token) localStorage.setItem('token', data.token);
            if (data && data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
            if (data && (data.userId || data.emailAddress)) {
              try {
                localStorage.setItem('user', JSON.stringify(data));
              } catch {
                // storage full/blocked: access token is still usable
              }
            }
            done(data);
          } catch {
            done(null);
          }
        } else {
          clearSession();
          redirectToLogin();
          done(null);
        }
      };
      xhr.onerror = () => {
        clearSession();
        redirectToLogin();
        done(null);
      };
      xhr.onabort = () => done(null);
      xhr.send(JSON.stringify({ refreshToken: rt }));
    } catch {
      done(null);
    }
  }).finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

// Redirect to /login after the session is cleared, unless already there
// (avoids a redirect loop when the login page itself gets a 401).
function redirectToLogin() {
  try {
    if (typeof window !== 'undefined' && window.location?.pathname !== '/login') {
      window.location.href = '/login';
    }
  } catch {
    // non-browser environment (tests): ignore
  }
}

// console.debug is chatty in production; keep warn/error which carry signal.
const debug = import.meta.env?.DEV ? console.debug.bind(console) : () => {};

// ---- GET response cache (memory + session) ----
// Dedupes double renders and polling storms without touching any page.
// Memory (20s TTL) with in-flight coalescing; slow-moving catalog endpoints
// additionally persist to sessionStorage (5min, tab-scoped) so reloads paint
// instantly. Keys embed the session token, so users never share entries.
// Successful mutations and logout evict everything (blast radius is one TTL
// window of extra fetches). The server applies its own X-Cache layer too.
const GET_CACHE_TTL_MS = 20000;
const GET_CACHE_MAX_ENTRIES = 200;
const SESSION_CACHE_TTL_MS = 5 * 60 * 1000;
const SESSION_CACHE_PREFIX = 'api-cache:v1:';
// Slow-moving reads worth persisting across reloads. Write-heavy personal
// lists (enrollments, applications, notes, discussions) are excluded: a
// reload must not resurrect pre-mutation state.
const SESSION_CACHE_ALLOWLIST = [
  '/posts',
  '/courses',
  '/coursespage',
  '/skills',
  '/markettrends',
  '/skillgaps',
  '/learningpathways',
  '/stats/week',
];
const getCache = new Map();
const inflightGets = new Map();

function tokenScope(token) {
  return token ? `t:${String(token).slice(-12)}` : 'anon';
}

function getCacheKey(path, token) {
  return `${tokenScope(token)} ${path}`;
}

function isCacheBypass(options) {
  if (options?.cache === 'no-store' || options?.bypassCache === true) return true;
  const header = options?.headers?.['Cache-Control'] ?? options?.headers?.['cache-control'];
  return typeof header === 'string' && /no-(cache|store)/i.test(header);
}

function isAuthPath(path) {
  return path === '/auth' || path.startsWith('/auth/');
}

function isSessionCacheable(path) {
  const clean = path.split('?')[0];
  return SESSION_CACHE_ALLOWLIST.some((p) => clean === p || clean.startsWith(`${p}/`));
}

function readGetCache(key) {
  const entry = getCache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiry) {
    getCache.delete(key);
    return undefined;
  }
  return entry.data;
}

function writeGetCache(key, data) {
  getCache.set(key, { expiry: Date.now() + GET_CACHE_TTL_MS, data });
  while (getCache.size > GET_CACHE_MAX_ENTRIES) {
    getCache.delete(getCache.keys().next().value);
  }
}

function readSessionCache(key) {
  try {
    if (typeof sessionStorage === 'undefined') return undefined;
    const raw = sessionStorage.getItem(SESSION_CACHE_PREFIX + key);
    if (!raw) return undefined;
    const entry = JSON.parse(raw);
    if (!entry || typeof entry.expiry !== 'number' || Date.now() > entry.expiry) {
      sessionStorage.removeItem(SESSION_CACHE_PREFIX + key);
      return undefined;
    }
    return entry.data;
  } catch {
    return undefined;
  }
}

function writeSessionCache(key, data) {
  try {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem(
      SESSION_CACHE_PREFIX + key,
      JSON.stringify({ expiry: Date.now() + SESSION_CACHE_TTL_MS, data }),
    );
  } catch {
    // Quota or private mode: the memory cache still applies.
  }
}

function evictSessionCache() {
  try {
    if (typeof sessionStorage === 'undefined') return;
    const keys = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(SESSION_CACHE_PREFIX)) keys.push(k);
    }
    keys.forEach((k) => sessionStorage.removeItem(k));
  } catch {
    // ignore unavailable storage
  }
}

function evictClientCache() {
  getCache.clear();
  evictSessionCache();
}

function request(path, options = {}) {
  const { _retried, ...rest } = options;
  // Proactive rotation stays synchronous on the fast path (valid/missing token)
  // so callers — and the XHR test fakes — observe the request immediately.
  // Only an expired access token with a refresh token available goes async.
  const token = localStorage.getItem('token');
  if (token && isTokenExpired(token)) {
    if (getRefreshToken()) {
      return refreshSession().then(() => request(path, { ...rest, _retried }));
    }
    clearSession();
    return sendWithToken(null, path, rest, _retried);
  }
  return sendWithToken(token, path, rest, _retried);
}

function sendWithToken(token, path, rest, _retried) {
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...rest.headers,
  };

  const method = rest.method || 'GET';
  debug(`[API] ${method} ${path}`);

  if (method === 'GET' && !isAuthPath(path) && !isCacheBypass(rest)) {
    const key = getCacheKey(path, token);
    const cached = readGetCache(key);
    if (cached !== undefined) {
      debug(`[API] GET ${path} (memory HIT)`);
      return Promise.resolve(cached);
    }
    if (isSessionCacheable(path)) {
      const persisted = readSessionCache(key);
      if (persisted !== undefined) {
        debug(`[API] GET ${path} (session HIT)`);
        writeGetCache(key, persisted);
        return Promise.resolve(persisted);
      }
    }
    // A shared promise ignores later callers' abort signals; the originating
    // request still honours its own signal.
    const pending = inflightGets.get(key);
    if (pending) {
      debug(`[API] GET ${path} (coalesced)`);
      return pending;
    }
    const promise = sendRequest(path, { ...rest, _retried }, headers, method, {
      key,
      persist: isSessionCacheable(path),
    });
    inflightGets.set(key, promise);
    promise.then(
      () => inflightGets.delete(key),
      () => inflightGets.delete(key),
    );
    return promise;
  }
  return sendRequest(path, { ...rest, _retried }, headers, method, null);
}

function sendRequest(path, options, headers, method, cacheInfo) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, `${API_BASE}${path}`);
    for (const [key, value] of Object.entries(headers)) {
      xhr.setRequestHeader(key, value);
    }

    const signal = options.signal;
    if (signal) {
      if (signal.aborted) {
        reject(new DOMException('Aborted', 'AbortError'));
        return;
      }
      const onAbort = () => xhr.abort();
      signal.addEventListener('abort', onAbort, { once: true });
      xhr.addEventListener('loadend', () => signal.removeEventListener('abort', onAbort));
    }

    xhr.onload = () => {
      if (xhr.status === 401) {
        // If a token exists, the session expired/invalidated → try one silent
        // refresh before giving up. If no token exists, this is a failed login
        // attempt (e.g. wrong password) → fall through to the normal error path
        // so the error message can display.
        if (localStorage.getItem('token') || getRefreshToken()) {
          if (!options._retried && getRefreshToken() && !isRefreshExempt(path)) {
            refreshSession().then((data) => {
              if (data && localStorage.getItem('token')) {
                request(path, { ...options, _retried: true }).then(resolve, reject);
              } else {
                // Refresh failed: session already cleared + redirect issued.
                resolve(null);
              }
            });
            return;
          }
          console.warn(`[API] ${method} ${path} → 401: session expired, clearing token`);
          clearSession();
          redirectToLogin();
          resolve(null);
          return;
        }
      }

      if (xhr.status < 200 || xhr.status >= 300) {
        let message = `HTTP ${xhr.status}`;
        try {
          const data = JSON.parse(xhr.responseText);
          if (data && data.error) message = data.error;
        } catch {
          // ignore non-JSON error bodies
        }
        // Map common failing states to friendly, actionable messages
        if (xhr.status === 429) {
          message = message.includes('429') || message.startsWith('HTTP') ? 'Too many requests — please wait a moment and try again' : message;
        } else if (xhr.status === 403) {
          message = message.startsWith('HTTP') ? 'You don’t have permission to do that' : message;
        } else if (xhr.status === 404) {
          message = message.startsWith('HTTP') ? 'Not found — the item may have been removed' : message;
        } else if (xhr.status >= 500) {
          message = message.startsWith('HTTP') ? 'Server error — please try again in a moment' : message;
        } else if (!message || message.startsWith('HTTP')) {
          message = 'Request failed — please try again';
        }
        console.warn(`[API] ${method} ${path} → ${xhr.status}: ${message}`);
        const err = new Error(message);
        err.status = xhr.status;
        reject(err);
        return;
      }

      if (xhr.status === 204) {
        debug(`[API] ${method} ${path} → 204 No Content`);
        if (method !== 'GET') evictClientCache();
        resolve(null);
        return;
      }

      debug(`[API] ${method} ${path} → ${xhr.status}`);
      let data;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        data = xhr.responseText;
      }
      if (cacheInfo) {
        writeGetCache(cacheInfo.key, data);
        if (cacheInfo.persist) writeSessionCache(cacheInfo.key, data);
      } else if (method !== 'GET') {
        evictClientCache();
      }
      resolve(data);
    };

    xhr.onerror = () => {
      console.error(`[API] ${method} ${path} → network error`);
      const err = new Error('Network error — check your connection and try again');
      err.status = 0;
      reject(err);
    };

    xhr.onabort = () => {
      reject(new DOMException('Aborted', 'AbortError'));
    };

    xhr.send(options.body);
  });
}

/** Sends multipart/form-data (XHR, no JSON Content-Type). */
function postForm(path, formData, internal = {}) {
  const token = localStorage.getItem('token');
  if (token && isTokenExpired(token)) {
    if (getRefreshToken()) {
      return refreshSession().then(() => postForm(path, formData, internal));
    }
    clearSession();
    return sendForm(null, path, formData, internal);
  }
  return sendForm(token, path, formData, internal);
}

function sendForm(token, path, formData, internal) {
  const method = 'POST';
  debug(`[API] ${method} ${path} (form)`);

  return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(method, `${API_BASE}${path}`);
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      xhr.onload = () => {
        if (xhr.status === 401 && (localStorage.getItem('token') || getRefreshToken())) {
          if (!internal._retried && getRefreshToken() && !isRefreshExempt(path)) {
            refreshSession().then((data) => {
              if (data && localStorage.getItem('token')) {
                postForm(path, formData, { _retried: true }).then(resolve, reject);
              } else {
                resolve(null);
              }
            });
            return;
          }
          clearSession();
          redirectToLogin();
          resolve(null);
          return;
        }
      if (xhr.status < 200 || xhr.status >= 300) {
        let message = `HTTP ${xhr.status}`;
        try {
          const data = JSON.parse(xhr.responseText);
          if (data && data.error) message = data.error;
        } catch {
          // ignore non-JSON error bodies
        }
        if (xhr.status === 429) {
          message = message.includes('429') || message.startsWith('HTTP') ? 'Too many requests — please wait a moment and try again' : message;
        } else if (xhr.status === 413) {
          message = 'File too large — must be ≤ 10 MB';
        } else if (xhr.status >= 500) {
          message = message.startsWith('HTTP') ? 'Server error — please try again in a moment' : message;
        } else if (!message || message.startsWith('HTTP')) {
          message = 'Request failed — please try again';
        }
        console.warn(`[API] ${method} ${path} → ${xhr.status}: ${message}`);
        const err = new Error(message);
        err.status = xhr.status;
        reject(err);
        return;
      }
      debug(`[API] ${method} ${path} → ${xhr.status}`);
      try {
        resolve(JSON.parse(xhr.responseText));
      } catch {
        resolve(xhr.responseText);
      }
      evictClientCache();
    };

    xhr.onerror = () => {
      console.error(`[API] ${method} ${path} → network error`);
      const err = new Error('Network error — check your connection and try again');
      err.status = 0;
      reject(err);
    };

    xhr.onabort = () => {
      reject(new DOMException('Aborted', 'AbortError'));
    };

    xhr.send(formData);
  });
}

/** Uploads a file via multipart/form-data (XHR so the fetch patch does not interfere). */
function upload(path, file, internal = {}) {
  const token = localStorage.getItem('token');
  if (token && isTokenExpired(token)) {
    if (getRefreshToken()) {
      return refreshSession().then(() => upload(path, file, internal));
    }
    clearSession();
    return sendUpload(null, path, file, internal);
  }
  return sendUpload(token, path, file, internal);
}

function sendUpload(token, path, file, internal) {
  const method = 'POST';
  debug(`[API] ${method} ${path}`);

  return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(method, `${API_BASE}${path}`);
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      xhr.onload = () => {
        if (xhr.status === 401 && (localStorage.getItem('token') || getRefreshToken())) {
          if (!internal._retried && getRefreshToken() && !isRefreshExempt(path)) {
            refreshSession().then((data) => {
              if (data && localStorage.getItem('token')) {
                upload(path, file, { _retried: true }).then(resolve, reject);
              } else {
                resolve(null);
              }
            });
            return;
          }
          clearSession();
          redirectToLogin();
          resolve(null);
          return;
        }
      if (xhr.status < 200 || xhr.status >= 300) {
        let message = `HTTP ${xhr.status}`;
        try {
          const data = JSON.parse(xhr.responseText);
          if (data && data.error) message = data.error;
        } catch {
          // ignore non-JSON error bodies
        }
        if (xhr.status === 429) {
          message = message.includes('429') || message.startsWith('HTTP') ? 'Too many requests — please wait a moment and try again' : message;
        } else if (xhr.status === 413) {
          message = 'File too large — must be ≤ 10 MB';
        } else if (xhr.status >= 500) {
          message = message.startsWith('HTTP') ? 'Server error — please try again in a moment' : message;
        }
        const err = new Error(message);
        err.status = xhr.status;
        reject(err);
        return;
      }
      let data = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        data = null;
      }
      if (!data || typeof data.url !== 'string' || !data.url) {
        console.warn(`[API] ${method} ${path} → ${xhr.status}: response missing file url`);
        reject(new Error('Upload did not complete — the server did not confirm the file. Please try again.'));
        return;
      }
      debug(`[API] ${method} ${path} → ${xhr.status} url=${data.url}`);
      evictClientCache();
      resolve(data);
    };
    xhr.onerror = () => {
      const err = new Error('Network error — check your connection, file was not uploaded');
      err.status = 0;
      reject(err);
    };

    const form = new FormData();
    form.append('file', file);
    xhr.send(form);
  });
}

export const api = {
  get: (path, options) => request(path, options),
  post: (path, body, options) =>
    request(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body), ...options }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: 'DELETE' }),
  upload: (path, file) => upload(path, file),
  postForm: (path, formData) => postForm(path, formData),
  /** Test/support hook: drops the memory + session GET caches. */
  _clearCache: () => {
    evictClientCache();
    inflightGets.clear();
  },
  /** Test hook: drops the memory cache only (session persistence stays). */
  _clearMemoryCache: () => {
    getCache.clear();
    inflightGets.clear();
  },
};