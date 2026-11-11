import { useOfflineStore } from '../stores/offlineStore';

// Automatic retry of requests that failed with an XHR network error.
// - up to MAX_AUTO_RETRIES attempts per request
// - while the browser reports no connectivity, retries wait for the `online`
//   event and then run within ONLINE_RETRY_DELAY_MS (well under the 5s limit)
// - after the last failure the banner stays and a manual retry is offered
export const MAX_AUTO_RETRIES = 3;
export const ONLINE_RETRY_DELAY_MS = 1000;
export const RETRY_DELAY_MS = 2000;

const entries = new Set();
let listening = false;

function isBrowserOffline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

function schedule(entry, delay) {
  clearTimeout(entry.timer);
  entry.timer = setTimeout(() => run(entry), delay);
}

function finish(entry) {
  clearTimeout(entry.timer);
  entries.delete(entry);
  if (entries.size === 0) useOfflineStore.getState().setOnline();
}

async function run(entry) {
  if (!entries.has(entry)) return;
  if (entry.signal?.aborted) {
    finish(entry);
    return;
  }
  if (isBrowserOffline()) {
    entry.waiting = true; // resumed by the `online` event
    return;
  }
  entry.waiting = false;
  entry.attempts += 1;
  try {
    await entry.replay();
    finish(entry);
  } catch (err) {
    if (err?.status === 0) {
      if (entry.attempts >= MAX_AUTO_RETRIES) {
        entry.exhausted = true;
        useOfflineStore.getState().setFailed();
      } else {
        schedule(entry, RETRY_DELAY_MS);
      }
    } else {
      // Any HTTP answer (or abort) means the network is reachable again.
      finish(entry);
    }
  }
}

function onOnline() {
  for (const entry of entries) {
    if (!entry.exhausted) schedule(entry, ONLINE_RETRY_DELAY_MS);
  }
}

function ensureListener() {
  if (listening || typeof window === 'undefined' || !window.addEventListener) return;
  window.addEventListener('online', onOnline);
  listening = true;
}

/**
 * Records a network failure: shows the offline banner and queues `replay`
 * (a function returning a promise that rejects with `status === 0` on another
 * network error) for automatic retry.
 */
export function registerNetworkFailure(replay, signal) {
  ensureListener();
  useOfflineStore.getState().setOffline();
  const entry = { replay, signal, attempts: 0, exhausted: false, waiting: false, timer: null };
  entries.add(entry);
  schedule(entry, isBrowserOffline() ? ONLINE_RETRY_DELAY_MS : RETRY_DELAY_MS);
}

/** Manual retry after all automatic retries failed (banner "Retry" control). */
export function retryOffline() {
  const store = useOfflineStore.getState();
  if (entries.size === 0) {
    store.setOnline();
    return;
  }
  store.setRetrying();
  for (const entry of entries) {
    entry.attempts = 0;
    entry.exhausted = false;
    schedule(entry, 0);
  }
}

/** Called when any HTTP response arrives: proves connectivity if nothing is pending. */
export function noteOnline() {
  if (entries.size === 0 && useOfflineStore.getState().offline) {
    useOfflineStore.getState().setOnline();
  }
}

/** Test hook. */
export function _resetOfflineRetry() {
  for (const entry of entries) clearTimeout(entry.timer);
  entries.clear();
  useOfflineStore.getState()._reset();
}
