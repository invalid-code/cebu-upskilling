import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
    maxWidth: 440,
    boxShadow: 'var(--shadow)',
    textAlign: 'center',
  },
  brand: {
    display: 'flex',
    gap: 10,
    alignItems: 'center',
    marginBottom: 20,
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
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: 'var(--muted)',
    marginBottom: 24,
    lineHeight: 1.5,
  },
  error: {
    background: 'var(--coral-soft)',
    color: 'rgb(110, 65, 45)',
    padding: '10px 12px',
    borderRadius: 10,
    fontSize: 12,
    marginBottom: 16,
  },
  success: {
    background: 'rgba(34, 139, 34, 0.12)',
    color: 'rgb(30, 110, 30)',
    padding: '10px 12px',
    borderRadius: 10,
    fontSize: 12,
    marginBottom: 16,
  },
  link: {
    marginTop: 18,
    fontSize: 13,
    color: 'var(--muted)',
  },
};

export default function ConfirmEmailPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { confirmEmail, resendConfirmation } = useAuth();
  const email = params.get('email') || '';
  const token = params.get('token') || '';

  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');
  const [resendSent, setResendSent] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    let active = true;
    if (!email || !token) {
      setStatus('error');
      setMessage('Missing email or token. The confirmation link may be incomplete.');
      return;
    }
    confirmEmail(email, token)
      .then(() => {
        if (active) {
          setStatus('success');
          setMessage('Your email has been confirmed. You can now sign in.');
        }
      })
      .catch((err) => {
        if (active) {
          setStatus('error');
          setMessage(err.message || 'This confirmation link is invalid or has expired.');
        }
      });
    return () => {
      active = false;
    };
  }, [email, token, confirmEmail]);

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    try {
      await resendConfirmation(email);
      setResendSent(true);
    } catch {
      // keep the error state; resend is best-effort
    } finally {
      setResending(false);
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

        {status === 'loading' && (
          <>
            <h2 style={styles.title}>Confirming your email</h2>
            <p style={styles.subtitle}>Please wait a moment…</p>
          </>
        )}

        {status === 'success' && (
          <>
            <h2 style={styles.title}>Email confirmed</h2>
            <p style={styles.subtitle}>{message}</p>
            <Button
              variant="primary"
              style={{ width: '100%' }}
              onClick={() => navigate('/login')}
            >
              Continue to sign in
            </Button>
          </>
        )}

        {status === 'error' && (
          <>
            <h2 style={styles.title}>Couldn't confirm email</h2>
            <p style={styles.subtitle}>{message}</p>
            {email && (
              <Button
                variant="primary"
                style={{ width: '100%' }}
                disabled={resending || resendSent}
                onClick={handleResend}
              >
                {resendSent ? 'Confirmation email sent' : resending ? 'Sending…' : 'Resend confirmation email'}
              </Button>
            )}
            <p style={styles.link}>
              <Link to="/login">Back to sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
