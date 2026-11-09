import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { validateEmail } from '../utils/validation';
import { summarizeError, RATE_LIMIT_TEXT } from '../lib/formErrors';
import { useSubmitCooldown } from '../hooks/useSubmitCooldown';
import { useRateLimitStore } from '../stores/rateLimitStore';
import Button from '../components/ui/Button';
import Field from '../components/ui/Field';
import AuthCard, { FormSummary } from '../components/auth/AuthCard';
import styles from '../components/auth/Auth.module.css';

// One fixed confirmation: the same text and layout whether or not the email has an account.
const NEUTRAL_CONFIRMATION = 'If an account exists for that email, a password reset link has been sent.';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [summary, setSummary] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const emailRef = useRef(null);
  const { forgotPassword } = useAuth();
  const { showToast } = useToast();
  const { cooling } = useSubmitCooldown();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cooling || loading) return;
    setSummary('');
    const err = validateEmail(email);
    if (err) {
      setFieldError(err);
      emailRef.current?.focus();
      return;
    }
    setFieldError('');
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setSuccess(true);
      showToast('Reset link requested — check your inbox', 'success');
    } catch (error) {
      if (error?.status === 404) {
        // An unknown email must look exactly like a known one.
        setSuccess(true);
      } else {
        if (error?.status === 429) {
          const rl = useRateLimitStore.getState();
          if (!rl.active) rl.start();
        }
        setSummary(summarizeError(error));
      }
    } finally {
      setLoading(false);
    }
  };

  const summaryText = summary || (cooling ? RATE_LIMIT_TEXT : '');

  return (
    <AuthCard
      title="Reset your password"
      subtitle="Enter the email associated with your account and we'll send a reset link."
    >
      {success ? (
        <div className={styles.success} role="status" aria-live="polite">
          <span className={styles.successIcon} aria-hidden="true"><CheckCircle2 size={18} /></span>
          <span>{NEUTRAL_CONFIRMATION}</span>
        </div>
      ) : (
        <>
          <FormSummary>{summaryText}</FormSummary>
          <form onSubmit={handleSubmit} noValidate className={styles.form}>
            <Field id="forgot-email" label="Email address" error={fieldError}>
              <input
                ref={emailRef}
                className={styles.input}
                type="email"
                placeholder="Email address"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldError) setFieldError('');
                }}
              />
            </Field>
            <Button variant="primary" className={styles.submit} loading={loading} disabled={cooling}>
              Send reset link
            </Button>
          </form>
        </>
      )}

      <p className={styles.links}>
        Remembered your password? <Link to="/login">Sign in</Link>
      </p>
    </AuthCard>
  );
}
