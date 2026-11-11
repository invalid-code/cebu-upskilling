import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('posthog-js', () => ({
  default: {
    init: vi.fn(),
    capture: vi.fn(),
    identify: vi.fn(),
    reset: vi.fn(),
    opt_out_capturing: vi.fn(),
  },
}));

import posthog from 'posthog-js';
import {
  initAnalytics,
  setAnalyticsConsented,
  trackEvent,
  trackPageview,
  identifyUser,
  _resetAnalyticsForTests,
} from './analytics';

describe('analytics consent gating', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_PUBLIC_POSTHOG_KEY', 'phc_test');
    _resetAnalyticsForTests();
    vi.clearAllMocks();
  });

  afterEach(() => vi.unstubAllEnvs());

  it('does not call posthog.init or capture before consent', () => {
    trackEvent('x');
    trackPageview('/a');
    identifyUser({ id: 1 });
    setAnalyticsConsented(false);
    expect(posthog.init).not.toHaveBeenCalled();
    expect(posthog.capture).not.toHaveBeenCalled();
    expect(posthog.identify).not.toHaveBeenCalled();
  });

  it('initialises once when consent is granted and then captures', async () => {
    setAnalyticsConsented(true);
    setAnalyticsConsented(true);
    await vi.waitFor(() => expect(posthog.init).toHaveBeenCalledTimes(1));
    trackEvent('x', { a: 1 });
    expect(posthog.capture).toHaveBeenCalledWith('x', { a: 1 });
  });

  it('does not initialise when no key is configured', () => {
    vi.stubEnv('VITE_PUBLIC_POSTHOG_KEY', '');
    setAnalyticsConsented(true);
    expect(posthog.init).not.toHaveBeenCalled();
  });

  it('opts out on withdrawal and sends nothing afterwards, even on re-grant', async () => {
    setAnalyticsConsented(true);
    await vi.waitFor(() => expect(posthog.init).toHaveBeenCalledTimes(1));
    setAnalyticsConsented(false);
    expect(posthog.opt_out_capturing).toHaveBeenCalledTimes(1);
    vi.clearAllMocks();

    trackEvent('after');
    trackPageview('/b');
    setAnalyticsConsented(true);
    initAnalytics();
    trackEvent('after-regrant');

    expect(posthog.capture).not.toHaveBeenCalled();
    expect(posthog.init).not.toHaveBeenCalled();
  });

  it('skips init when consent is withdrawn while the chunk is loading', async () => {
    setAnalyticsConsented(true);
    setAnalyticsConsented(false);
    await new Promise((r) => setTimeout(r, 50));
    expect(posthog.init).not.toHaveBeenCalled();
  });
});
