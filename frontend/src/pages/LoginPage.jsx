import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, isRecruiter } from '../context/AuthContext';
import { validateEmail, validatePassword } from '../utils/validation';
import Button from '../components/ui/Button';

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
    borderRadius: 18,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    boxShadow: 'var(--shadow)',
  },
  brand: {
    display: 'flex',
    gap: 10,
    alignItems: 'center',
    marginBottom: 28,
    justifyContent: 'center',
  },
  mark: {
    width: 40,
    height: 40,
    borderRadius: 11,
    background: 'var(--coral)',
    display: 'grid',
    placeItems: 'center',
    color: 'var(--surface)',
    fontFamily: "'Space Grotesk', sans-serif",
    fontWeight: 700,
    fontSize: 18,
  },
  title: {
    fontSize: 22,
    fontFamily: "'Space Grotesk', sans-serif",
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: 'var(--muted)',
    textAlign: 'center',
    marginBottom: 24,
  },
  field: {
    width: '100%',
    background: 'var(--surface)',
    border: '1px solid var(--line)',
    borderRadius: 10,
    minHeight: 42,
    padding: '9px 12px',
    color: 'var(--ink)',
    marginBottom: 4,
    fontSize: 14,
  },
  fieldError: {
    color: 'rgb(190, 60, 50)',
    fontSize: 12,
    marginBottom: 12,
    marginTop: 2,
  },
  error: {
    background: 'var(--coral-soft)',
    color: 'rgb(110, 65, 45)',
    padding: '10px 12px',
    borderRadius: 10,
    fontSize: 12,
    marginBottom: 12,
  },
  link: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 13,
    color: 'var(--muted)',
  },
};

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const validateForm = () => {
    const errors = {
      email: validateEmail(email) || '',
      password: validatePassword(password) || '',
    };
    setFieldErrors(errors);
    return !errors.email && !errors.password;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validateForm()) return;
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(isRecruiter(user) ? '/business-dashboard' : '/');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (fieldErrors.email) {
      setFieldErrors((prev) => ({ ...prev, email: '' }));
    }
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (fieldErrors.password) {
      setFieldErrors((prev) => ({ ...prev, password: '' }));
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.brand}>
          <div style={styles.mark}>CU</div>
          <div>
            <strong style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14 }}>Cebu Upskilling</strong>
          </div>
        </div>
        <h2 style={styles.title}>Welcome back</h2>
        <p style={styles.subtitle}>Sign in to your career pathway</p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <input
            style={styles.field}
            type="email"
            placeholder="Email address"
            value={email}
            onChange={handleEmailChange}
            aria-invalid={!!fieldErrors.email}
          />
          {fieldErrors.email && <div style={styles.fieldError}>{fieldErrors.email}</div>}
          <input
            style={styles.field}
            type="password"
            placeholder="Password"
            value={password}
            onChange={handlePasswordChange}
            aria-invalid={!!fieldErrors.password}
          />
          {fieldErrors.password && <div style={styles.fieldError}>{fieldErrors.password}</div>}
          <Button
            variant="primary"
            style={{ width: '100%', marginTop: 8 }}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        <p style={styles.link}>
          <Link to="/forgot-password">Forgot your password?</Link>
        </p>
        <p style={styles.link}>
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}