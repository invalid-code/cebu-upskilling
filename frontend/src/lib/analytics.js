// posthog-js is loaded with a dynamic import so it stays out of the initial landing
// bundle (Req 23.4). Calls made while it loads are queued and flushed after init.
let posthog = null;
let loading = false;
const queue = [];
let initialized = false;
// Once consent is withdrawn, no PostHog request may be made for the rest of
// the session, even if consent is granted again.
let withdrawn = false;

function config() {
  return {
    key: import.meta.env.VITE_PUBLIC_POSTHOG_KEY,
    host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
  };
}

export function isAnalyticsConfigured() {
  return Boolean(config().key);
}

function active() {
  return (initialized || loading) && !withdrawn;
}

// Runs fn(posthog) now if loaded, or queues it until the module has loaded.
function withPosthog(fn) {
  if (!active()) return;
  if (!posthog) {
    if (queue.length < 50) queue.push(fn);
    return;
  }
  try {
    fn(posthog);
  } catch {
    // ignore: analytics must never break the app
  }
}

// Initializes PostHog. Must only be called after cookie consent is granted:
// posthog.init itself loads remote config, so calling it earlier would make a
// network request to the PostHog host before consent. Never throws: adblockers
// and privacy extensions routinely break analytics scripts, and a white
// screen over telemetry is never acceptable.
export function initAnalytics() {
  if (initialized || loading || withdrawn || !isAnalyticsConfigured()) return;
  loading = true;
  import('posthog-js')
    .then((mod) => {
      // Consent may have been withdrawn while the chunk was loading.
      if (withdrawn) return;
      const ph = mod.default;
      ph.init(config().key, {
        api_host: config().host,
        capture_pageview: false,
        autocapture: false,
        disable_session_recording: true,
      });
      posthog = ph;
      initialized = true;
      for (const fn of queue.splice(0)) {
        try {
          fn(ph);
        } catch {
          // ignore
        }
      }
    })
    .catch(() => {
      initialized = false;
    })
    .finally(() => {
      loading = false;
      queue.length = 0;
    });
}

// Single entry point driven by the consent state. Granting consent initialises
// PostHog (first time only); withdrawing it stops capture immediately and
// permanently for this session.
export function setAnalyticsConsented(consented) {
  if (consented) {
    if (withdrawn) return;
    initAnalytics();
    return;
  }
  if (!initialized && !loading) return;
  withdrawn = true;
  queue.length = 0;
  if (!posthog) return; // still loading: init is skipped once the chunk arrives
  try {
    posthog.opt_out_capturing();
    posthog.reset();
  } catch {
    // extension interference: nothing is sent anyway
  }
}

export function identifyUser(user) {
  if (!user) return;
  // Distinct ID matches the backend (UserId Guid string) so server-side
  // events merge into the same PostHog person. No email/PII is attached.
  const id = user.userId ?? user.UserId ?? user.id;
  if (id) withPosthog((ph) => ph.identify(String(id), { role: user.role ?? user.Role }));
}

export function resetAnalytics() {
  withPosthog((ph) => ph.reset());
}

export function trackEvent(event, properties) {
  withPosthog((ph) => ph.capture(event, properties));
}

export function trackPageview(path) {
  withPosthog((ph) => ph.capture('$pageview', { $current_url: path }));
}

// Test helper.
export function _resetAnalyticsForTests() {
  initialized = false;
  withdrawn = false;
  loading = false;
  posthog = null;
  queue.length = 0;
}
