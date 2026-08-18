import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { validateEmail } from '../utils/validation';
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
    marginBottom: 24,
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
    lineHeight: 1.5,
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
  success: {
    background: 'rgba(34, 139, 34, 0.12)',
    color: 'rgb(30, 110, 30)',
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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { forgotPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const err = validateEmail(email);
    if (err) {
      setFieldError(err);
      return;
    }
    setFieldError('');
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
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
        <h2 style={styles.title}>Reset your password</h2>
        <p style={styles.subtitle}>
          Enter the email associated with your account and we'll send a reset link.
        </p>

        {success ? (
          <>
            <div style={styles.success}>
              If an account exists for that email, a password reset link has been sent.
            </div>
            <p style={styles.link}>
              <Link to="/login">Back to sign in</Link>
            </p>
          </>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            {error && <div style={styles.error}>{error}</div>}
            <input
              style={styles.field}
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldError) setFieldError('');
              }}
              aria-invalid={!!fieldError}
            />
            {fieldError && <div style={styles.fieldError}>{fieldError}</div>}
            <Button
              variant="primary"
              style={{ width: '100%', marginTop: 8 }}
              disabled={loading}
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </Button>
          </form>
        )}

        <p style={styles.link}>
          Remembered your password? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
