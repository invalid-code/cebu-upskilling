import { useNavigate, Link } from 'react-router-dom';
import { useAuth, getDashboardPath } from '../context/AuthContext';
import Button from '../components/ui/Button';
import { Compass } from 'lucide-react';
import { centeredPage } from '../styles/shared';

const styles = {
  container: { ...centeredPage },
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
    color: 'var(--coral-ink)',
    display: 'grid',
    placeItems: 'center',
    margin: '0 auto 24px',
  },
  code: {
    fontSize: 56,
    fontFamily: 'var(--font-display)',
    letterSpacing: '-0.04em',
    lineHeight: 1,
  },
  title: {
    fontSize: 22,
    fontFamily: 'var(--font-display)',
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
          <Link to={user ? getDashboardPath(user) : '/'}>{user ? 'dashboard' : 'home page'}</Link>.
        </p>
      </div>
    </div>
  );
}
