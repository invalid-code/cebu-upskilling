const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5179/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  let body = options.body;
  if (!(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    if (body != null) {
      body = JSON.stringify(body);
    }
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers, body, signal: options.signal });

  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    return;
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  get: (path, { signal } = {}) => request(path, { signal }),
  post: (path, body) => request(path, { method: 'POST', body }),
  postMultipart: (path, formData) => request(path, { method: 'POST', body: formData }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
};
