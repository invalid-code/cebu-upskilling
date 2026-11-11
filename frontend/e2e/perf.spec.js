import { test as base, expect } from '@playwright/test';
import { mockApi, mockLearnerShell, setAuth, learnerUser } from './helpers.js';

/**
 * Performance measurement (Requirements 23.1, 23.2, 23.3).
 *
 * - Landing page, 4G throttling via CDP Network.emulateNetworkConditions
 *   (9 Mbps down, 1.5 Mbps up, 170 ms latency), cache disabled, fresh browser
 *   context per run, at least 5 runs.
 * - LCP, CLS and INP are collected in the page with PerformanceObservers
 *   (web-vitals semantics) injected via addInitScript.
 * - p75 (nearest rank) must satisfy LCP <= 2.5 s, CLS <= 0.05, INP <= 200 ms.
 * - CLS is additionally checked after 30 s of interaction on key pages.
 *
 * Set PERF_BASE_URL (e.g. a `vite preview` of the production build) to measure
 * something other than the dev server configured in playwright.config.js.
 * Set PERF_RUNS to raise the run count (minimum 5).
 */

const BUDGET = { lcp: 2500, cls: 0.05, inp: 200 };
const RUNS = Math.max(5, Number(process.env.PERF_RUNS) || 5);
const BASE_URL = process.env.PERF_BASE_URL || 'http://localhost:5173';
const NETWORK_4G = {
  offline: false,
  downloadThroughput: (9 * 1024 * 1024) / 8,
  uploadThroughput: (1.5 * 1024 * 1024) / 8,
  latency: 170,
};

// Plain test without the shared fixture's context-level seeding: each run builds
// its own context, so seed cookie consent explicitly (same key as fixtures.js).
const test = base;


/** Runs inside the page before any app script. */
function vitalsInitScript() {
  localStorage.setItem('cebu-cookie-consent', 'accepted');
  const v = { lcp: 0, cls: 0, inp: 0 };
  const interactions = new Map();
  let sessionValue = 0;
  let sessionEntries = [];
  const safe = (type, cb, opts = {}) => {
    try {
      new PerformanceObserver((list) => list.getEntries().forEach(cb)).observe({ type, buffered: true, ...opts });
    } catch {
      /* unsupported */
    }
  };

  safe('largest-contentful-paint', (e) => {
    v.lcp = e.renderTime || e.loadTime || e.startTime;
  });

  safe('layout-shift', (e) => {
    if (e.hadRecentInput) return;
    const first = sessionEntries[0];
    const last = sessionEntries[sessionEntries.length - 1];
    if (
      sessionEntries.length &&
      e.startTime - last.startTime < 1000 &&
      e.startTime - first.startTime < 5000
    ) {
      sessionValue += e.value;
      sessionEntries.push(e);
    } else {
      sessionValue = e.value;
      sessionEntries = [e];
    }
    if (sessionValue > v.cls) v.cls = sessionValue;
    if (e.value > (v.worstShift?.value || 0)) {
      v.worstShift = {
        value: e.value,
        at: Math.round(e.startTime),
        nodes: (e.sources || []).map((s) =>
          s.node ? `${s.node.nodeName}.${String(s.node.className).slice(0, 40)}` : 'removed-node',
        ),
      };
    }
  });

  safe(
    'event',
    (e) => {
      if (!e.interactionId) return;
      const prev = interactions.get(e.interactionId) || 0;
      if (e.duration > prev) interactions.set(e.interactionId, e.duration);
      if (e.duration > (v.worst?.duration || 0)) {
        v.worst = {
          name: e.name,
          duration: e.duration,
          inputDelay: e.processingStart - e.startTime,
          processing: e.processingEnd - e.processingStart,
          target: e.target ? `${e.target.nodeName}.${String(e.target.className).slice(0, 40)}` : null,
        };
      }
      const sorted = [...interactions.values()].sort((a, b) => b - a);
      // INP: worst interaction, ignoring one outlier per 50 interactions.
      v.inp = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length / 50))] || 0;
    },
    { durationThreshold: 16 },
  );

  window.__vitals = v;
}

/** Nearest-rank percentile. */
function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.max(1, Math.ceil((p / 100) * sorted.length));
  return sorted[rank - 1];
}

async function newThrottledPage(browser, { throttle = true, auth = false } = {}) {
  const context = await browser.newContext({ baseURL: BASE_URL, viewport: { width: 1280, height: 800 } });
  await context.addInitScript(vitalsInitScript);
  const page = await context.newPage();
  if (auth) {
    await setAuth(page, { user: learnerUser });
    await mockLearnerShell(page);
  } else {
    // Public stats etc.: deterministic empty responses so the backend is not needed.
    await mockApi(page, {});
  }
  const cdp = await context.newCDPSession(page);
  if (throttle) {
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.send('Network.clearBrowserCache');
    await cdp.send('Network.emulateNetworkConditions', NETWORK_4G);
  }
  return { context, page };
}

/** Real click / keyboard interactions so Event Timing yields interactions. */
async function interact(page) {
  const clickTargets = ['h1', 'a', 'button'];
  for (const sel of clickTargets) {
    const el = page.locator(sel).first();
    if (await el.count()) {
      // Click on a non-navigating spot: the element's own box centre could navigate,
      // so click the text in the page body for links/buttons only via mouse at heading.
      if (sel === 'h1') await el.click({ trial: false }).catch(() => {});
    }
  }
  await page.mouse.click(5, 400).catch(() => {});
  for (let i = 0; i < 6; i++) await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('PageDown');
  await page.keyboard.press('PageUp');
  await page.mouse.wheel(0, 800);
  await page.waitForTimeout(150);
  await page.mouse.click(5, 300).catch(() => {});
}

async function readVitals(page) {
  // Let pending observer callbacks flush, then hide the page like web-vitals does
  // so LCP/CLS/INP are finalised.
  await page.waitForTimeout(300);
  return page.evaluate(() => ({ ...window.__vitals }));
}

test.describe('Performance budgets (4G throttled, landing page)', () => {
  // Runs share `samples`; the final test aggregates them, so keep order.
  test.describe.configure({ mode: 'serial' });
  const samples = [];

  for (let run = 1; run <= RUNS; run++) {
    test(`landing run ${run}/${RUNS}`, async ({ browser }) => {
      test.setTimeout(60_000);
      const { context, page } = await newThrottledPage(browser);
      try {
        await page.goto('/', { waitUntil: 'load' });
        await page.waitForLoadState('networkidle').catch(() => {});
        // Allow LCP candidates to settle before the first input freezes LCP.
        await page.waitForTimeout(1500);
        await interact(page);
        const vitals = await readVitals(page);
        samples.push(vitals);
        console.log(`[perf] run ${run}: LCP=${vitals.lcp.toFixed(0)}ms CLS=${vitals.cls.toFixed(4)} INP=${vitals.inp.toFixed(0)}ms worst=${JSON.stringify(vitals.worst)}`);
        expect(vitals.lcp, 'LCP was measured').toBeGreaterThan(0);
      } finally {
        await context.close();
      }
    });
  }

  test('p75 of LCP, CLS and INP meet the budgets', async () => {
    expect(samples.length).toBeGreaterThanOrEqual(5);
    const lcp = percentile(samples.map((s) => s.lcp), 75);
    const cls = percentile(samples.map((s) => s.cls), 75);
    const inp = percentile(samples.map((s) => s.inp), 75);
    console.log(
      `[perf] p75 over ${samples.length} runs (${BASE_URL}): LCP=${lcp.toFixed(0)}ms (<=${BUDGET.lcp}) ` +
        `CLS=${cls.toFixed(4)} (<=${BUDGET.cls}) INP=${inp.toFixed(0)}ms (<=${BUDGET.inp})`,
    );
    expect.soft(lcp, `p75 LCP ${lcp}ms`).toBeLessThanOrEqual(BUDGET.lcp);
    expect.soft(cls, `p75 CLS ${cls}`).toBeLessThanOrEqual(BUDGET.cls);
    expect.soft(inp, `p75 INP ${inp}ms`).toBeLessThanOrEqual(BUDGET.inp);
  });
});

test.describe('CLS after 30s of interaction on key pages', () => {
  const PAGES = [
    { name: 'landing', path: '/', auth: false },
    { name: 'login', path: '/login', auth: false },
    { name: 'learner overview', path: '/dashboard', auth: true },
    { name: 'learner jobs', path: '/jobs', auth: true },
    { name: 'learner courses', path: '/courses', auth: true },
  ];

  for (const p of PAGES) {
    test(`${p.name} (${p.path}) CLS <= ${BUDGET.cls} after 30s`, async ({ browser }) => {
      test.setTimeout(90_000);
      const { context, page } = await newThrottledPage(browser, { auth: p.auth });
      try {
        await page.goto(p.path, { waitUntil: 'load' });
        const end = Date.now() + 30_000;
        let i = 0;
        while (Date.now() < end) {
          await page.mouse.move(100 + (i % 10) * 80, 200 + (i % 5) * 90);
          if (i % 3 === 0) await page.mouse.wheel(0, i % 6 === 0 ? 400 : -400);
          if (i % 4 === 0) await page.keyboard.press('Tab');
          i++;
          await page.waitForTimeout(500);
        }
        const { cls, worstShift } = await readVitals(page);
        console.log(`[perf] CLS after 30s on ${p.path}: ${cls.toFixed(4)} worstShift=${JSON.stringify(worstShift)}`);
        expect(cls, `CLS on ${p.path}`).toBeLessThanOrEqual(BUDGET.cls);
      } finally {
        await context.close();
      }
    });
  }
});
