import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { validateEmail } from '../utils/validation';
import { ErrorBanner, FieldError } from '../components/ui/ErrorState';
import Button from '../components/ui/Button';
import { authStyles, centeredPage } from '../styles/shared';

const styles = {
  container: { ...centeredPage },
  card: { ...authStyles.card },
  brand: {
    display: 'flex',
    gap: 10,
    alignItems: 'center',
    marginBottom: 24,
    justifyContent: 'center',
  },
  mark: { ...authStyles.mark },
  title: { ...authStyles.title },
  subtitle: {
    fontSize: 13,
    color: 'var(--muted)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 1.5,
  },
  field: { ...authStyles.field },
  fieldError: { ...authStyles.fieldError },
  error: { ...authStyles.error },
  success: {
    background: 'var(--teal-soft)',
    color: 'var(--teal)',
    padding: '14px 14px',
    borderRadius: 12,
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    border: '1px solid rgba(20,82,165,0.14)',
  },
  successIcon: {
    width: 30,
    height: 30,
    borderRadius: '50%',
    background: 'var(--teal)',
    color: '#fff',
    display: 'grid',
    placeItems: 'center',
    flexShrink: 0,
  },
  link: { ...authStyles.link },
};

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { forgotPassword } = useAuth();
  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const err = validateEmail(email);
    if (err) {
      setFieldError(err);
      showToast(err, 'error');
      return;
    }
    setFieldError('');
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setSuccess(true);
      showToast('Reset link sent — check your inbox', 'success');
    } catch (err) {
      const msg = err.message || 'Something went wrong. Please try again.';
      setError(msg);
      showToast(msg, 'error');
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
            <div style={styles.success} role="status" aria-live="polite">
              <span style={styles.successIcon} aria-hidden="true"><CheckCircle2 size={16} /></span>
              <span>If an account exists for that email, a password reset link has been sent.</span>
            </div>
            <p style={styles.link}>
              <Link to="/login">Back to sign in</Link>
            </p>
          </>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            {error && <ErrorBanner title="Couldn’t send reset link" description={error} onDismiss={() => setError('')} />}
            <label htmlFor="forgot-email" style={authStyles.label}>Email address</label>
            <input
              id="forgot-email"
              style={{ ...styles.field, borderColor: fieldError ? 'var(--danger)' : 'var(--line)', background: fieldError ? 'var(--danger-soft)' : 'var(--surface)' }}
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldError) setFieldError('');
              }}
              aria-invalid={!!fieldError}
              aria-describedby={fieldError ? 'forgot-email-error' : undefined}
            />
            {fieldError && <FieldError id="forgot-email-error">{fieldError}</FieldError>}
            <Button
              variant="primary"
              style={{ width: '100%', marginTop: 8 }}
              loading={loading}
            >
              Send reset link
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
