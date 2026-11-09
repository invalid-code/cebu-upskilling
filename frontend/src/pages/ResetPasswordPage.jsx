import { useRef, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { validatePassword } from '../utils/validation';
import { summarizeError, RATE_LIMIT_TEXT } from '../lib/formErrors';
import { useSubmitCooldown } from '../hooks/useSubmitCooldown';
import { useRateLimitStore } from '../stores/rateLimitStore';
import Button from '../components/ui/Button';
import Field from '../components/ui/Field';
import PasswordField from '../components/ui/PasswordField';
import AuthCard, { FormSummary } from '../components/auth/AuthCard';
import PasswordStrength from '../components/auth/PasswordStrength';
import styles from '../components/auth/Auth.module.css';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { resetPassword } = useAuth();
  const { showToast } = useToast();
  const { cooling } = useSubmitCooldown();
  const email = params.get('email') || '';
  const token = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fieldErrors, setFieldErrors] = useState({ password: '', confirm: '' });
  const [summary, setSummary] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const fieldRefs = useRef({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cooling || loading) return;
    setSummary('');
    const errors = {
      password: validatePassword(password) || '',
      confirm: password !== confirm ? 'Passwords do not match' : '',
    };
    setFieldErrors(errors);
    if (errors.password || errors.confirm) {
      fieldRefs.current[errors.password ? 'password' : 'confirm']?.focus();
      return;
    }

    if (!email || !token) {
      setSummary('Missing email or token. Use the link from your email.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email, token, password);
      setSuccess(true);
      showToast('Password reset — you can now sign in', 'success');
    } catch (err) {
      if (err?.status === 429) {
        const rl = useRateLimitStore.getState();
        if (!rl.active) rl.start();
      }
      setSummary(summarizeError(err, 'This reset link is invalid or has expired.'));
    } finally {
      setLoading(false);
    }
  };

  const summaryText = summary || (cooling ? RATE_LIMIT_TEXT : '');

  return (
    <AuthCard title="Choose a new password" subtitle={`Enter a new password for ${email || 'your account'}.`}>
      {success ? (
        <>
          <div className={styles.success} role="status" aria-live="polite">
            <span className={styles.successIcon} aria-hidden="true"><CheckCircle2 size={18} /></span>
            <span>Your password has been reset. You can now sign in.</span>
          </div>
          <Button variant="primary" className={styles.submit} onClick={() => navigate('/login')}>
            Continue to sign in
          </Button>
        </>
      ) : (
        <>
          <FormSummary>{summaryText}</FormSummary>
          <form onSubmit={handleSubmit} noValidate className={styles.form}>
            <Field id="reset-password" label="New password" error={fieldErrors.password}>
              <PasswordField
                ref={(node) => { fieldRefs.current.password = node; }}
                className={styles.input}
                placeholder="New password"
                autoComplete="new-password"
                value={password}
                aria-describedby={password ? 'reset-password-strength' : undefined}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: '' }));
                }}
              />
            </Field>
            <PasswordStrength password={password} id="reset-password-strength" />
            <Field id="reset-confirm" label="Confirm new password" error={fieldErrors.confirm}>
              <PasswordField
                ref={(node) => { fieldRefs.current.confirm = node; }}
                className={styles.input}
                placeholder="Confirm new password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  if (fieldErrors.confirm) setFieldErrors((p) => ({ ...p, confirm: '' }));
                }}
              />
            </Field>
            <Button variant="primary" className={styles.submit} loading={loading} disabled={cooling}>
              Reset password
            </Button>
          </form>
        </>
      )}

      <p className={styles.links}>
        <Link to="/login">Back to sign in</Link>
      </p>
    </AuthCard>
  );
}
