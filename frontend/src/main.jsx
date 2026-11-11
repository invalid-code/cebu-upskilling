import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted fonts: Latin subset only, font-display: swap (set by @fontsource).
// System fallbacks are declared in styles/tokens.css so text stays visible if a font fails.
import '@fontsource/bricolage-grotesque/latin-500.css'
import '@fontsource/bricolage-grotesque/latin-600.css'
import '@fontsource/bricolage-grotesque/latin-700.css'
import '@fontsource/instrument-sans/latin-400.css'
import '@fontsource/instrument-sans/latin-500.css'
import '@fontsource/instrument-sans/latin-600.css'
import '@fontsource/instrument-sans/latin-700.css'
import '@fontsource/jetbrains-mono/latin-400.css'
import '@fontsource/jetbrains-mono/latin-500.css'
import './styles/tokens.css'
import './index.css'
import App from './App.jsx'
import { setAnalyticsConsented } from './lib/analytics'
import { useCookieConsentStore } from './stores/cookieConsentStore'
import { useThemeStore } from './stores/themeStore'

// Initialize theme from storage / system preference and sync to <html>
(function initTheme() {
  const state = useThemeStore.getState();
  const isDark = state.isDark;
  if (isDark) document.documentElement.classList.add('dark');
  else document.documentElement.classList.remove('dark');
})();

useThemeStore.subscribe((state) => {
  if (state.isDark) document.documentElement.classList.add('dark');
  else document.documentElement.classList.remove('dark');
});

// PostHog is initialised only once the user accepts cookie consent, and is
// shut off for the session if consent is withdrawn.
setAnalyticsConsented(useCookieConsentStore.getState().consent === 'accepted');
useCookieConsentStore.subscribe((state) => {
  setAnalyticsConsented(state.consent === 'accepted');
});

if (import.meta.env.VITE_SENTRY_DSN) {
  // Loaded lazily so Sentry stays out of the initial landing bundle (Req 23.4).
  import('@sentry/react')
    .then((Sentry) => {
      Sentry.init({
        dsn: import.meta.env.VITE_SENTRY_DSN,
        environment: import.meta.env.MODE,
        tracesSampleRate: 0.1,
        sendDefaultPii: false,
      });
    })
    .catch(() => {
      // extension interference must never white-screen the app
    });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
