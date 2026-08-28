/* eslint-disable react/only-export-components */
import { createContext, useContext, useEffect } from 'react';
import { useCookieConsentStore, getInitialConsent } from '../stores/cookieConsentStore';

const CookieConsentContext = createContext(null);

export function CookieConsentProvider({ children }) {
  const store = useCookieConsentStore();
  const initial = getInitialConsent();
  const needsSync = store.consent !== initial;

  useEffect(() => {
    if (needsSync) store.hydrate();
  }, [needsSync, store]);

  const value = needsSync ? { ...store, consent: initial } : store;

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent() {
  const ctx = useContext(CookieConsentContext);
  const store = useCookieConsentStore();
  if (ctx) return ctx;
  return store;
}
