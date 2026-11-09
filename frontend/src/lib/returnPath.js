import { canAccessPath } from './navItems';
import { getDashboardPath } from '../context/AuthContext';

/** Builds the `/login?returnTo=` URL preserving the visitor's path and query. */
export function loginUrlFor(location) {
  const back = `${location?.pathname || '/'}${location?.search || ''}`;
  return back === '/' ? '/login' : `/login?returnTo=${encodeURIComponent(back)}`;
}

/**
 * Where to send a user after sign-in. The `returnTo` value is honoured only when it is an
 * in-app path (no scheme / protocol-relative) that the user's role is allowed to open;
 * otherwise the role dashboard is used.
 */
export function resolvePostLoginPath(user, search = '') {
  const dashboard = getDashboardPath(user);
  let returnTo = null;
  try {
    returnTo = new URLSearchParams(search).get('returnTo');
  } catch {
    returnTo = null;
  }
  if (!returnTo || !returnTo.startsWith('/') || returnTo.startsWith('//') || returnTo.includes('\\')) {
    return dashboard;
  }
  const pathname = returnTo.split(/[?#]/)[0];
  return canAccessPath(user, pathname) ? returnTo : dashboard;
}
