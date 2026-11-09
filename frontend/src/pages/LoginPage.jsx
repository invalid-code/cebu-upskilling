import { useRef, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { resolvePostLoginPath } from '../lib/returnPath';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { validateEmail, validatePassword } from '../utils/validation';
import { summarizeError, RATE_LIMIT_TEXT } from '../lib/formErrors';
import { useSubmitCooldown } from '../hooks/useSubmitCooldown';
import { useRateLimitStore } from '../stores/rateLimitStore';
import Button from '../components/ui/Button';
import Field from '../components/ui/Field';
import GoogleSignInButton from '../components/GoogleSignInButton';
import PasswordField from '../components/ui/PasswordField';
import AuthCard, { FormSummary } from '../components/auth/AuthCard';
import styles from '../components/auth/Auth.module.css';

const FIELD_ORDER = ['email', 'password'];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({ email: '', password: '' });
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const fieldRefs = useRef({});
  const { login, loginWithGoogle } = useAuth();
  const { showToast } = useToast();
  const { cooling } = useSubmitCooldown();
  const navigate = useNavigate();
  const location = useLocation();

  const focusFirst = (errors) => {
    const first = FIELD_ORDER.find((name) => errors[name]);
    if (first) fieldRefs.current[first]?.focus();
  };

  const showFailure = (err, fallback) => {
    if (err?.status === 429) {
      const rl = useRateLimitStore.getState();
      if (!rl.active) rl.start();
    }
    // Field-level errors from the API are shown beneath their fields; other values are kept.
    const serverFields = err?.fieldErrors;
    if (serverFields && typeof serverFields === 'object') {
      const errors = {
        email: typeof serverFields.email === 'string' ? serverFields.email : '',
        password: typeof serverFields.password === 'string' ? serverFields.password : '',
      };
      if (errors.email || errors.password) {
        setFieldErrors(errors);
        setSummary('');
        focusFirst(errors);
        return;
      }
    }
    setSummary(summarizeError(err, fallback));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cooling || loading) return;
    setSummary('');
    const errors = {
      email: validateEmail(email) || '',
      password: validatePassword(password) || '',
    };
    setFieldErrors(errors);
    if (errors.email || errors.password) {
      focusFirst(errors);
      return;
    }
    setLoading(true);
    try {
      const user = await login(email, password);
      showToast(`Welcome back, ${user?.firstName || 'there'}!`, 'success');
      navigate(resolvePostLoginPath(user, location.search), { replace: true });
    } catch (err) {
      showFailure(err, 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (idToken) => {
    setSummary('');
    setLoading(true);
    try {
      const user = await loginWithGoogle(idToken);
      showToast(`Signed in with Google — welcome, ${user?.firstName || 'there'}!`, 'success');
      navigate(resolvePostLoginPath(user, location.search), { replace: true });
    } catch (err) {
      showFailure(err, 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const clearError = (name) => setFieldErrors((prev) => (prev[name] ? { ...prev, [name]: '' } : prev));
  const summaryText = summary || (cooling ? RATE_LIMIT_TEXT : '');

  return (
    <AuthCard title="Welcome back" subtitle="Sign in to your career pathway">
      <FormSummary>{summaryText}</FormSummary>

      <form onSubmit={handleSubmit} noValidate className={styles.form}>
        <Field id="login-email" label="Email address" error={fieldErrors.email}>
          <input
            ref={(node) => { fieldRefs.current.email = node; }}
            className={styles.input}
            type="email"
            placeholder="Email address"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              clearError('email');
            }}
          />
        </Field>
        <Field id="login-password" label="Password" error={fieldErrors.password}>
          <PasswordField
            ref={(node) => { fieldRefs.current.password = node; }}
            className={styles.input}
            placeholder="Password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              clearError('password');
            }}
          />
        </Field>
        <Button variant="primary" className={styles.submit} loading={loading} disabled={cooling}>
          Sign in
        </Button>
      </form>

      <GoogleSignInButton onSuccess={handleGoogleSuccess} onError={(err) => setSummary(summarizeError(err, 'Google sign-in failed'))} />

      <p className={styles.links}>
        <Link to="/forgot-password">Forgot your password?</Link>
      </p>
      <p className={styles.links}>
        Don't have an account? <Link to="/register">Register</Link>
      </p>
    </AuthCard>
  );
}
