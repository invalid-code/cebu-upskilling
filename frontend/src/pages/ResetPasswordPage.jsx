import { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PasswordField from '../components/ui/PasswordField';
import { useToast } from '../context/ToastContext';
import { validatePassword } from '../utils/validation';
import { ErrorBanner, FieldError } from '../components/ui/ErrorState';
import Button from '../components/ui/Button';
import { authStyles, authSubtitle, centeredPage } from '../styles/shared';

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
  subtitle: { ...authSubtitle },
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
            <label htmlFor="reset-password" style={authStyles.label}>New password</label>
            <PasswordField
              id="reset-password"
              style={{ ...styles.field, borderColor: fieldErrors.password ? 'var(--danger)' : 'var(--line)', background: fieldErrors.password ? 'var(--danger-soft)' : 'var(--surface)' }}
              placeholder="New password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: '' }));
              }}
              autoComplete="new-password"
              aria-invalid={!!fieldErrors.password}
              aria-describedby={fieldErrors.password ? 'reset-password-error' : undefined}
            />
            {fieldErrors.password && <FieldError id="reset-password-error">{fieldErrors.password}</FieldError>}
            <div style={{ marginTop: 12 }}>
              <label htmlFor="reset-confirm" style={authStyles.label}>Confirm new password</label>
              <PasswordField
                id="reset-confirm"
                style={{ ...styles.field, borderColor: fieldErrors.confirm ? 'var(--danger)' : 'var(--line)', background: fieldErrors.confirm ? 'var(--danger-soft)' : 'var(--surface)' }}
                placeholder="Confirm new password"
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  if (fieldErrors.confirm) setFieldErrors((p) => ({ ...p, confirm: '' }));
                }}
                autoComplete="new-password"
                aria-invalid={!!fieldErrors.confirm}
                aria-describedby={fieldErrors.confirm ? 'reset-confirm-error' : undefined}
              />
            </div>
            {fieldErrors.confirm && <FieldError id="reset-confirm-error">{fieldErrors.confirm}</FieldError>}
            <Button
              variant="primary"
              style={{ width: '100%', marginTop: 8 }}
              loading={loading}
            >
              Reset password
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
