import { useCallback, useEffect, useRef, useState } from 'react';

export const AUTOSAVE_DELAY_MS = 1500;
export const AUTOSAVE_RETRY_INTERVAL_MS = 5000;
export const AUTOSAVE_MAX_RETRIES = 3;

/**
 * Debounced autosave with bounded retry.
 *
 * - `value` changes (after the first render) mark the form dirty and, when `enabled`, schedule a save.
 * - The status flips to 'saving' synchronously when an attempt starts and to 'saved' / 'failed' as soon as
 *   it settles, so the indicator is always current well inside one second.
 * - A failed attempt keeps the value untouched (the caller owns it) and retries up to `maxRetries` times,
 *   `retryInterval` ms apart. A new edit resets the retry budget.
 * - `saveNow()` runs an attempt immediately (explicit Save draft / Publish) and resolves to true/false.
 *
 * Returns `{ status, dirty, error, saveNow, markClean }`; status is 'idle' | 'saving' | 'saved' | 'failed'.
 */
export default function useAutosave({
  value,
  enabled,
  save,
  delay = AUTOSAVE_DELAY_MS,
  retryInterval = AUTOSAVE_RETRY_INTERVAL_MS,
  maxRetries = AUTOSAVE_MAX_RETRIES,
}) {
  const [status, setStatus] = useState('idle');
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');

  const valueRef = useRef(value);
  const lastValueRef = useRef(value);
  const saveRef = useRef(save);
  const enabledRef = useRef(enabled);
  const versionRef = useRef(0);
  const timerRef = useRef(null);
  const retriesRef = useRef(0);
  const inflightRef = useRef(false);
  const mountedRef = useRef(true);
  const attemptRef = useRef(null);

  valueRef.current = value;
  saveRef.current = save;
  enabledRef.current = enabled;

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const schedule = (ms) => {
    clearTimer();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      attemptRef.current?.();
    }, ms);
  };

  const attempt = useCallback(async () => {
    if (inflightRef.current) return false;
    clearTimer();
    const version = versionRef.current;
    inflightRef.current = true;
    setStatus('saving');
    setError('');
    try {
      await saveRef.current(valueRef.current);
      inflightRef.current = false;
      retriesRef.current = 0;
      if (!mountedRef.current) return true;
      if (versionRef.current !== version) {
        // Edited while saving: keep the indicator on "Saving" and save the newer value.
        schedule(delay);
      } else {
        setStatus('saved');
        setDirty(false);
      }
      return true;
    } catch (err) {
      inflightRef.current = false;
      if (!mountedRef.current) return false;
      setStatus('failed');
      setError(err?.message || 'Could not save the course');
      if (retriesRef.current < maxRetries) {
        retriesRef.current += 1;
        schedule(retryInterval);
      }
      return false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delay, retryInterval, maxRetries]);
  attemptRef.current = attempt;

  useEffect(() => {
    if (Object.is(value, lastValueRef.current)) return;
    lastValueRef.current = value;
    versionRef.current += 1;
    setDirty(true);
    retriesRef.current = 0;
    if (enabledRef.current && !inflightRef.current) schedule(delay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, delay]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimer();
    };
  }, []);

  const saveNow = useCallback(() => {
    retriesRef.current = 0;
    return attempt();
  }, [attempt]);

  const markClean = useCallback(() => {
    clearTimer();
    setDirty(false);
  }, []);

  return { status, dirty, error, saveNow, markClean };
}
