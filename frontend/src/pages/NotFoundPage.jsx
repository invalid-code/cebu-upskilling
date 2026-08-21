import { useNavigate, Link } from 'react-router-dom';
import { useAuth, isRecruiter } from '../context/AuthContext';
import Button from '../components/ui/Button';
import { Compass } from 'lucide-react';

const styles = {
  container: {
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
    background: 'var(--bg)',
    padding: 20,
  },
  card: {
    background: 'var(--surface)',
    border: '1px solid var(--line)',
    borderRadius: 'var(--radius-xl)',
    padding: 48,
    width: '100%',
    maxWidth: 460,
    boxShadow: 'var(--shadow)',
    textAlign: 'center',
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    background: 'var(--coral-soft)',
    color: 'var(--coral)',
    display: 'grid',
    placeItems: 'center',
    margin: '0 auto 24px',
  },
  code: {
    fontSize: 56,
    fontFamily: "'Space Grotesk', sans-serif",
    letterSpacing: '-0.04em',
    lineHeight: 1,
  },
  title: {
    fontSize: 22,
    fontFamily: "'Space Grotesk', sans-serif",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: 'var(--muted)',
    margin: '0 0 28px',
  },
};

export default function NotFoundPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.icon}>
          <Compass size={30} />
        </div>
        <div style={styles.code}>404</div>
        <h2 style={styles.title}>Page not found</h2>
        <p style={styles.subtitle}>
          The page you are looking for wandered off your career pathway.
        </p>
        <Button variant="primary" style={{ width: '100%' }} onClick={() => navigate(-1)}>
          Go back
        </Button>
        <p style={{ marginTop: 16, fontSize: 13, color: 'var(--muted)' }}>
          Or return to your{' '}
          <Link to={user ? (isRecruiter(user) ? '/business-dashboard' : '/') : '/login'}>dashboard</Link>.
        </p>
      </div>
    </div>
  );
}
