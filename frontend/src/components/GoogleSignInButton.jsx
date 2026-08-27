import { useEffect, useRef, useState } from 'react';

const GSI_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

let gsiScriptPromise = null;

/** Loads the Google Identity Services script once and caches the promise. */
export function loadGoogleScript() {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!gsiScriptPromise) {
    gsiScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = GSI_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => {
        gsiScriptPromise = null;
        reject(new Error('Failed to load Google Sign-In'));
      };
      document.head.appendChild(script);
    });
  }
  return gsiScriptPromise;
}

const styles = {
  wrapper: {
    marginTop: 16,
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    margin: '16px 0',
    color: 'var(--muted)',
    fontSize: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: 'var(--line)',
  },
};

/**
 * Renders the official "Sign in with Google" button (Google Identity Services).
 * Calls onSuccess(credential) with the Google ID token after the user picks an
 * account. Renders nothing when VITE_GOOGLE_CLIENT_ID is not configured.
 */
export default function GoogleSignInButton({ onSuccess, onError, text = 'signin_with' }) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const containerRef = useRef(null);
  const [failed, setFailed] = useState(false);
  // Keep callbacks in refs so re-renders never force a GIS re-initialization.
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;

  useEffect(() => {
    if (!clientId) return undefined;

    let cancelled = false;
    loadGoogleScript()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response?.credential) {
              onSuccessRef.current?.(response.credential);
            } else {
              onErrorRef.current?.(new Error('Google sign-in failed'));
            }
          },
        });
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: 'outline',
          size: 'large',
          text,
          shape: 'pill',
          width: 320,
          logo_alignment: 'left',
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setFailed(true);
        onErrorRef.current?.(err);
      });

    return () => {
      cancelled = true;
    };
  }, [clientId, text]);

  if (!clientId || failed) return null;

  return (
    <div style={styles.wrapper}>
      <div style={styles.divider}>
        <span style={styles.dividerLine} />
        or
        <span style={styles.dividerLine} />
      </div>
      <div ref={containerRef} style={{ display: 'grid', placeItems: 'center' }} />
    </div>
  );
}
