import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { UNSAFE_NavigationContext as NavigationContext } from 'react-router-dom';

/**
 * Route-leave guard for forms with unsaved edits.
 *
 * Works with `BrowserRouter`/`MemoryRouter` (no data router needed): while `dirty` is true,
 * in-app navigation (`Link`, `navigate()`) is held and `blocked` becomes true so the caller can
 * show a confirm dialog. A full page unload (tab close/refresh) gets the browser's native prompt.
 *
 * - `stay()`    dismisses the prompt; the user remains on the page and keeps all form values.
 * - `proceed()` discards the pending hold and performs the navigation that was intercepted.
 *
 * Returns `{ blocked, stay, proceed }`.
 */
export default function useUnsavedChangesPrompt(dirty) {
  const { navigator } = useContext(NavigationContext);
  const [blocked, setBlocked] = useState(false);
  const pendingRef = useRef(null);
  const originalsRef = useRef(null);

  useEffect(() => {
    if (!dirty || !navigator) return undefined;
    const originalPush = navigator.push;
    const originalReplace = navigator.replace;
    originalsRef.current = { push: originalPush, replace: originalReplace };

    const intercept = (original) => (...args) => {
      pendingRef.current = () => original.apply(navigator, args);
      setBlocked(true);
    };
    navigator.push = intercept(originalPush);
    navigator.replace = intercept(originalReplace);

    return () => {
      navigator.push = originalPush;
      navigator.replace = originalReplace;
      originalsRef.current = null;
    };
  }, [dirty, navigator]);

  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = (event) => {
      event.preventDefault();
      // Required by some browsers to trigger the native confirmation.
      // eslint-disable-next-line no-param-reassign
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  // If the form stops being dirty (e.g. saved) while a prompt is open, clear it.
  useEffect(() => {
    if (!dirty) {
      pendingRef.current = null;
      setBlocked(false);
    }
  }, [dirty]);

  const stay = useCallback(() => {
    pendingRef.current = null;
    setBlocked(false);
  }, []);

  const proceed = useCallback(() => {
    const run = pendingRef.current;
    pendingRef.current = null;
    // Restore the real navigator methods before replaying so the replay is not re-intercepted.
    const originals = originalsRef.current;
    if (originals && navigator) {
      navigator.push = originals.push;
      navigator.replace = originals.replace;
    }
    setBlocked(false);
    if (run) run();
  }, [navigator]);

  return { blocked, stay, proceed };
}
