import { Link } from 'react-router-dom';
import { Cookie } from 'lucide-react';
import Button from '../ui/Button';
import { useCookieConsent } from '../../context/CookieConsentContext';

const styles = {
  banner: {
    position: 'fixed',
    right: 22,
    bottom: 22,
    left: 'auto',
    zIndex: 40,
    width: 380,
    maxWidth: 'calc(100vw - 32px)',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    background: 'var(--surface)',
    color: 'var(--ink)',
    padding: 20,
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--line)',
    boxShadow: 'var(--shadow)',
    fontSize: 13,
    lineHeight: 1.5,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    background: 'var(--coral-soft)',
    color: 'var(--coral)',
    display: 'grid',
    placeItems: 'center',
    flexShrink: 0,
  },
  title: {
    margin: 0,
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 15,
    fontWeight: 800,
    letterSpacing: '-0.02em',
    color: 'var(--ink)',
    lineHeight: 1.2,
  },
  text: {
    margin: 0,
    color: 'var(--muted)',
    fontSize: 13,
    lineHeight: 1.55,
  },
  link: {
    color: 'var(--teal)',
    textDecoration: 'underline',
    fontWeight: 700,
  },
  actions: {
    display: 'flex',
    gap: 10,
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
  },
};

export default function CookieBanner() {
  const { consent, accept, decline } = useCookieConsent();

  if (consent) return null;

  return (
    <div className="cookie-banner" role="region" aria-label="Cookie notice" style={styles.banner}>
      <div style={styles.header}>
        <span style={styles.iconWrap} aria-hidden="true">
          <Cookie size={19} />
        </span>
        <h2 style={styles.title}>Cookies</h2>
      </div>
      <p style={styles.text}>
        We use essential cookies to keep you signed in, and optional ones to improve CebuUpskilling.
        Read our <Link to="/privacy" style={styles.link}>Privacy Notice</Link>.
      </p>
      <div style={styles.actions}>
        <Button variant="ghost" onClick={decline}>Decline</Button>
        <Button variant="primary" onClick={accept}>Accept</Button>
      </div>
    </div>
  );
}
