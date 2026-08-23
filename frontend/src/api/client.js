// NOTE: This client intentionally uses XMLHttpRequest instead of fetch().
// A browser extension (injectScriptAdjust.js) patches window.fetch and rewrites
// outgoing URLs to http://localhost:5179, breaking API calls. XHR is not
// patched by that extension, so requests reach the server untouched.
const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

import { isTokenExpired } from '../lib/jwt';

function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

function request(path, options = {}) {
  let token = localStorage.getItem('token');
  if (token && isTokenExpired(token)) {
    clearSession();
    token = null;
  }
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const method = options.method || 'GET';
  console.debug(`[API] ${method} ${path}`);

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
        // If a token exists, the session expired/invalidated → clear and redirect.
        // If no token exists, this is a failed login attempt (e.g. wrong password) →
        // fall through to the normal error path so the error message can display.
        if (localStorage.getItem('token')) {
          console.warn(`[API] ${method} ${path} → 401: session expired, clearing token`);
          clearSession();
          window.location.href = '/login';
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
        console.warn(`[API] ${method} ${path} → ${xhr.status}: ${message}`);
        reject(new Error(message));
        return;
      }

      if (xhr.status === 204) {
        console.debug(`[API] ${method} ${path} → 204 No Content`);
        resolve(null);
        return;
      }

      console.debug(`[API] ${method} ${path} → ${xhr.status}`);
      try {
        resolve(JSON.parse(xhr.responseText));
      } catch {
        resolve(xhr.responseText);
      }
    };

    xhr.onerror = () => {
      console.error(`[API] ${method} ${path} → network error`);
      reject(new Error('Network error'));
    };

    xhr.onabort = () => {
      reject(new DOMException('Aborted', 'AbortError'));
    };

    xhr.send(options.body);
  });
}

/** Uploads a file via multipart/form-data (XHR so the fetch patch does not interfere). */
function upload(path, file) {
  let token = localStorage.getItem('token');
  if (token && isTokenExpired(token)) {
    clearSession();
    token = null;
  }
  const method = 'POST';
  console.debug(`[API] ${method} ${path}`);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, `${API_BASE}${path}`);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.onload = () => {
      if (xhr.status === 401 && localStorage.getItem('token')) {
        clearSession();
        window.location.href = '/login';
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
        reject(new Error(message));
        return;
      }
      try {
        resolve(JSON.parse(xhr.responseText));
      } catch {
        resolve(xhr.responseText);
      }
    };
    xhr.onerror = () => reject(new Error('Network error'));

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
};