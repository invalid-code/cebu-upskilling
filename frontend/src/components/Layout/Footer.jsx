import { Link } from 'react-router-dom';

const styles = {
  footer: {
    borderTop: '1px solid var(--line)',
    marginTop: 56,
    maxWidth: 1450,
    padding: '26px clamp(20px, 4vw, 56px) 30px',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  brand: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontWeight: 700,
    fontSize: 13,
  },
  tagline: {
    margin: '2px 0 0',
    fontSize: 11,
    color: 'var(--muted)',
  },
  nav: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 20,
  },
  copyright: {
    width: '100%',
    margin: 0,
    fontSize: 11,
    color: 'var(--muted)',
  },
};

const links = [
  { label: 'Help Center', to: '/help' },
  { label: 'Privacy Notice', to: '/privacy' },
  { label: 'Terms of Service', to: '/terms' },
];

export default function Footer() {
  return (
    <footer className="app-footer" style={styles.footer}>
      <div>
        <div style={styles.brand}>CebuUpskilling</div>
        <p style={styles.tagline}>Connecting Cebu learners with employers.</p>
      </div>
      <nav aria-label="Site links" style={styles.nav}>
        {links.map((link) => (
          <Link key={link.to} to={link.to}>{link.label}</Link>
        ))}
      </nav>
      <p style={styles.copyright}>© {new Date().getFullYear()} CebuUpskilling. All rights reserved.</p>
    </footer>
  );
}
