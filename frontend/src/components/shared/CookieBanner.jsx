import { Link } from 'react-router-dom';
import { Cookie } from 'lucide-react';
import Button from '../ui/Button';
import { useCookieConsent } from '../../context/CookieConsentContext';

const styles = {
  banner: {
    position: 'fixed',
    left: 22,
    right: 22,
    zIndex: 40,
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
    background: 'var(--ink)',
    color: 'var(--surface)',
    padding: '14px 18px',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow)',
    fontSize: 13,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    background: 'rgba(245, 250, 248, 0.14)',
    display: 'grid',
    placeItems: 'center',
    flexShrink: 0,
  },
  text: {
    margin: 0,
    minWidth: 220,
    flex: '1 1 260px',
  },
  link: {
    color: 'var(--teal-soft)',
    textDecoration: 'underline',
  },
  actions: {
    display: 'flex',
    gap: 10,
  },
};

export default function CookieBanner() {
  const { consent, accept, decline } = useCookieConsent();

  if (consent) return null;

  return (
    <div className="cookie-banner" role="region" aria-label="Cookie notice" style={styles.banner}>
      <span style={styles.iconWrap}>
        <Cookie size={19} />
      </span>
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
