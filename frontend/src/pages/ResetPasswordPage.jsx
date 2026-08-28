import { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { validatePassword } from '../utils/validation';
import { ErrorBanner, FieldError } from '../components/ui/ErrorState';
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
    border: '1px solid rgba(26,107,90,0.14)',
  },
  successIcon: {
    width: 30,
    height: 30,
    borderRadius: '50%',
    background: 'var(--teal)',
    color: 'var(--surface)',
    display: 'grid',
    placeItems: 'center',
    flexShrink: 0,
  },
  link: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 13,
    color: 'var(--muted)',
  },
};

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { resetPassword } = useAuth();
  const { showToast } = useToast();
  const email = params.get('email') || '';
  const token = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fieldErrors, setFieldErrors] = useState({ password: '', confirm: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const errors = {
      password: validatePassword(password) || '',
      confirm: password !== confirm ? 'Passwords do not match' : '',
    };
    setFieldErrors(errors);
    if (errors.password || errors.confirm) {
      showToast(errors.password || errors.confirm, 'error');
      return;
    }

    if (!email || !token) {
      const msg = 'Missing email or token. Use the link from your email.';
      setError(msg);
      showToast(msg, 'error');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email, token, password);
      setSuccess(true);
      showToast('Password reset — you can now sign in', 'success');
    } catch (err) {
      const msg = err.message || 'This reset link is invalid or has expired.';
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
        <h2 style={styles.title}>Choose a new password</h2>
        <p style={styles.subtitle}>Enter a new password for {email || 'your account'}.</p>

        {success ? (
          <>
            <div style={styles.success} role="status" aria-live="polite">
              <span style={styles.successIcon} aria-hidden="true"><CheckCircle2 size={16} /></span>
              <span>Your password has been reset. You can now sign in.</span>
            </div>
            <Button
              variant="primary"
              style={{ width: '100%', marginTop: 8 }}
              onClick={() => navigate('/login')}
            >
              Continue to sign in
            </Button>
          </>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            {error && <ErrorBanner title="Couldn’t reset password" description={error} onDismiss={() => setError('')} />}
            <input
              style={{ ...styles.field, borderColor: fieldErrors.password ? 'var(--danger)' : 'var(--line)', background: fieldErrors.password ? 'var(--danger-soft)' : 'var(--surface)' }}
              type="password"
              placeholder="New password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: '' }));
              }}
              aria-invalid={!!fieldErrors.password}
              aria-describedby={fieldErrors.password ? 'reset-password-error' : undefined}
            />
            {fieldErrors.password && <FieldError id="reset-password-error">{fieldErrors.password}</FieldError>}
            <input
              style={{ ...styles.field, marginTop: 12, borderColor: fieldErrors.confirm ? 'var(--danger)' : 'var(--line)', background: fieldErrors.confirm ? 'var(--danger-soft)' : 'var(--surface)' }}
              type="password"
              placeholder="Confirm new password"
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                if (fieldErrors.confirm) setFieldErrors((p) => ({ ...p, confirm: '' }));
              }}
              aria-invalid={!!fieldErrors.confirm}
              aria-describedby={fieldErrors.confirm ? 'reset-confirm-error' : undefined}
            />
            {fieldErrors.confirm && <FieldError id="reset-confirm-error">{fieldErrors.confirm}</FieldError>}
            <Button
              variant="primary"
              style={{ width: '100%', marginTop: 8 }}
              disabled={loading}
            >
              {loading ? 'Resetting…' : 'Reset password'}
            </Button>
          </form>
        )}

        <p style={styles.link}>
          <Link to="/login">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
