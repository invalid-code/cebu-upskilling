import posthog from 'posthog-js';

let initialized = false;

function config() {
  return {
    key: import.meta.env.VITE_PUBLIC_POSTHOG_KEY,
    host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
  };
}

export function isAnalyticsConfigured() {
  return Boolean(config().key);
}

// Initializes PostHog in opt-out mode. Call optIn() only after the user
// accepts cookie consent (see cookieConsentStore).
export function initAnalytics() {
  if (initialized || !isAnalyticsConfigured()) return;
  posthog.init(config().key, {
    api_host: config().host,
    opt_out_capturing_by_default: true,
    capture_pageview: false,
    autocapture: false,
    disable_session_recording: true,
  });
  initialized = true;
}

export function setAnalyticsConsented(consented) {
  if (!initialized) return;
  if (consented) posthog.opt_in_capturing();
  else posthog.opt_out_capturing();
}

export function identifyUser(user) {
  if (!initialized || !user) return;
  // Distinct ID matches the backend (UserId Guid string) so server-side
  // events merge into the same PostHog person. No email/PII is attached.
  const id = user.userId ?? user.UserId ?? user.id;
  if (id) posthog.identify(String(id), { role: user.role ?? user.Role });
}

export function resetAnalytics() {
  if (!initialized) return;
  posthog.reset();
}

export function trackEvent(event, properties) {
  if (!initialized) return;
  posthog.capture(event, properties);
}

export function trackPageview(path) {
  if (!initialized) return;
  posthog.capture('$pageview', { $current_url: path });
}
