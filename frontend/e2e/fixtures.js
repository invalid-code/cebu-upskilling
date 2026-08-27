import { test as base, expect } from '@playwright/test';

const CONSENT_KEY = 'cebu-cookie-consent';

/**
 * Shared Playwright test with app-level defaults.
 * Seeds cookie consent before every test so the CookieBanner never
 * intercepts pointer events during interactions (mirrors a returning
 * user who has already made their choice).
 */
export const test = base.extend({
  seedCookieConsent: [
    async ({ context }, use) => {
      await context.addInitScript((key) => {
        localStorage.setItem(key, 'accepted');
      }, CONSENT_KEY);
      await use();
    },
    { auto: true },
  ],
});

export { expect };
