import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { summarizeError } from '../lib/formErrors';
import Button from '../components/ui/Button';
import AuthCard from '../components/auth/AuthCard';
import styles from '../components/auth/Auth.module.css';

// Statuses where the link itself is the problem (invalid or expired), so a resend helps.
function isLinkProblem(err) {
  return err?.status === undefined || err.status === 400 || err.status === 404 || err.status === 410;
}

export default function ConfirmEmailPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { confirmEmail, resendConfirmation } = useAuth();
  const { showToast } = useToast();
  const email = params.get('email') || '';
  const token = params.get('token') || '';

  // loading | success | expired (link invalid/expired) | error (request failed, retryable)
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [resendSent, setResendSent] = useState(false);
  const [resendError, setResendError] = useState('');
  const [resending, setResending] = useState(false);

  useEffect(() => {
    let active = true;
    if (!email || !token) {
      setStatus('expired');
      setMessage('Missing email or token. The confirmation link may be incomplete.');
      return undefined;
    }
    setStatus('loading');
    confirmEmail(email, token)
      .then(() => {
        if (!active) return;
        setStatus('success');
        setMessage('Your email has been confirmed. You can now sign in.');
        showToast('Email confirmed — you can now sign in', 'success');
      })
      .catch((err) => {
        if (!active) return;
        setStatus(isLinkProblem(err) ? 'expired' : 'error');
        setMessage(summarizeError(err, 'This confirmation link is invalid or has expired.'));
      });
    return () => {
      active = false;
    };
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [email, token, confirmEmail, attempt]);

  const handleResend = async () => {
    if (!email || resending) return;
    setResending(true);
    setResendError('');
    try {
      await resendConfirmation(email);
      setResendSent(true);
    } catch (err) {
      setResendError(summarizeError(err, 'We could not send a new confirmation email. Please try again.'));
    } finally {
      setResending(false);
    }
  };

  if (status === 'loading') {
    return (
      <AuthCard title="Confirming your email" centered>
        <div className={styles.state} role="status" aria-live="polite">
          <Loader2 size={24} className={styles.spinner} aria-hidden="true" />
          <p className={styles.subtitle}>Please wait a moment…</p>
        </div>
      </AuthCard>
    );
  }

  if (status === 'success') {
    return (
      <AuthCard title="Email confirmed" wide centered>
        <div className={styles.state}>
          <span className={styles.successIcon} aria-hidden="true"><CheckCircle2 size={18} /></span>
          <p className={styles.subtitle}>{message}</p>
          <Button variant="primary" className={styles.submit} onClick={() => navigate('/login')}>
            Continue to sign in
          </Button>
        </div>
        <p className={styles.links}>
          <Link to="/login">Back to sign in</Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Couldn't confirm email" wide centered>
      <div className={styles.state}>
        <AlertTriangle size={24} className={styles.alertIcon} aria-hidden="true" />
        <p className={styles.subtitle}>{message}</p>

        {status === 'expired' && email && (
          <>
            <Button
              variant="primary"
              className={styles.submit}
              disabled={resending || resendSent}
              onClick={handleResend}
            >
              {resendSent ? 'Confirmation email sent' : resending ? 'Sending…' : 'Resend confirmation email'}
            </Button>
            {resendSent && (
              <p className={styles.note} role="status">
                A new confirmation email was sent. Check your inbox.
              </p>
            )}
            {resendError && (
              <p className={styles.summary} role="alert">
                {resendError}
              </p>
            )}
          </>
        )}

        {status === 'error' && (
          <Button variant="primary" className={styles.submit} onClick={() => setAttempt((n) => n + 1)}>
            Try again
          </Button>
        )}
      </div>
      <p className={styles.links}>
        <Link to="/login">Back to sign in</Link>
      </p>
    </AuthCard>
  );
}
