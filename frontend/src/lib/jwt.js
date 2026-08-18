// Decode a JWT and return its payload, or null if it can't be parsed.
export function decodeJwt(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const decoded =
      typeof atob === 'function'
        ? atob(payload)
        : Buffer.from(payload, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

// A token is considered expired only if it carries an `exp` claim whose
// value (seconds since epoch) is at or before now. Tokens without an `exp`
// claim are treated as non-expiring (the server remains the authority and
// will reject them with 401 if they are invalid).
export function isTokenExpired(token, leewaySeconds = 0) {
  const payload = decodeJwt(token);
  if (!payload || typeof payload.exp !== 'number') return false;
  const nowSeconds = Date.now() / 1000;
  return payload.exp <= nowSeconds - leewaySeconds;
}

// Returns true unless a stored token exists and is expired. A missing token
// is treated as a valid (non-expired) session so callers can decide based on
// the presence of `user` instead. If an expired token is found it is cleared.
export function hasValidSession() {
  const token = localStorage.getItem('token');
  if (token && isTokenExpired(token)) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return false;
  }
  return true;
}
