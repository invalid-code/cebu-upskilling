import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Tracks the loading / error / success state of a data request.
 *
 * - `fetcher({ signal })` returns a promise of the data.
 * - Previously loaded data is retained when a later request fails.
 * - `reload()` re-requests the data; it is ignored while a request is pending.
 *
 * Returns `{ status, data, error, loading, reload }` where status is 'loading' | 'error' | 'success'.
 */
export default function useDataState(fetcher, deps = []) {
  const [state, setState] = useState({ status: 'loading', data: undefined, error: null });
  const [nonce, setNonce] = useState(0);
  const pendingRef = useRef(true);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    const controller = new AbortController();
    pendingRef.current = true;
    setState((prev) => ({ status: 'loading', data: prev.data, error: null }));
    // Invoke the fetcher synchronously (inside the effect) so the request starts immediately;
    // the Promise constructor still turns a synchronous throw into a rejection.
    new Promise((resolve) => resolve(fetcherRef.current({ signal: controller.signal })))
      .then((data) => {
        if (controller.signal.aborted) return;
        pendingRef.current = false;
        setState({ status: 'success', data, error: null });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        pendingRef.current = false;
        setState((prev) => ({ status: 'error', data: prev.data, error }));
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setNonce((n) => n + 1);
  }, []);

  return { ...state, loading: state.status === 'loading', reload };
}
