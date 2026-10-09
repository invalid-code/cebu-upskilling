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
// accepts cookie consent (see cookieConsentStore). Never throws: adblockers
// and privacy extensions routinely break analytics scripts, and a white
// screen over telemetry is never acceptable.
export function initAnalytics() {
  if (initialized || !isAnalyticsConfigured()) return;
  try {
    posthog.init(config().key, {
      api_host: config().host,
      opt_out_capturing_by_default: true,
      capture_pageview: false,
      autocapture: false,
      disable_session_recording: true,
    });
    initialized = true;
  } catch {
    initialized = false;
  }
}

export function setAnalyticsConsented(consented) {
  if (!initialized) return;
  try {
    if (consented) posthog.opt_in_capturing();
    else posthog.opt_out_capturing();
  } catch {
    // extension interference: stay opted out
  }
}

export function identifyUser(user) {
  if (!initialized || !user) return;
  try {
    // Distinct ID matches the backend (UserId Guid string) so server-side
    // events merge into the same PostHog person. No email/PII is attached.
    const id = user.userId ?? user.UserId ?? user.id;
    if (id) posthog.identify(String(id), { role: user.role ?? user.Role });
  } catch {
    // ignore: analytics must never break auth flows
  }
}

export function resetAnalytics() {
  if (!initialized) return;
  try {
    posthog.reset();
  } catch {
    // ignore
  }
}

export function trackEvent(event, properties) {
  if (!initialized) return;
  try {
    posthog.capture(event, properties);
  } catch {
    // ignore
  }
}

export function trackPageview(path) {
  if (!initialized) return;
  try {
    posthog.capture('$pageview', { $current_url: path });
  } catch {
    // ignore
  }
}
