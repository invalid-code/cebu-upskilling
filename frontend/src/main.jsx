import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.jsx'
import { initAnalytics, setAnalyticsConsented } from './lib/analytics'
import { useCookieConsentStore } from './stores/cookieConsentStore'

initAnalytics();
// Analytics stays opted-out until the user accepts cookie consent.
setAnalyticsConsented(useCookieConsentStore.getState().consent === 'accepted');
useCookieConsentStore.subscribe((state) => {
  setAnalyticsConsented(state.consent === 'accepted');
});

if (import.meta.env.VITE_SENTRY_DSN) {
  try {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,
      tracesSampleRate: 0.1,
      sendDefaultPii: false,
    });
  } catch {
    // extension interference must never white-screen the app
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
