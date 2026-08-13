import { useNavigate, Link } from 'react-router-dom';
import { useAuth, isRecruiter } from '../context/AuthContext';
import Button from '../components/ui/Button';
import { useForm } from 'react-hook-form';
import { validateEmail, validatePassword } from '../utils/validation';

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
    boxSizing: 'border-box',
  },
  fieldError: {
    borderColor: 'var(--coral)',
  },
  errorMsg: {
    color: 'var(--coral)',
    fontSize: 11,
    marginBottom: 8,
    marginTop: 0,
  },
  serverError: {
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
  const [serverError, setServerError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data) => {
    setServerError('');
    try {
      const user = await login(data.email, data.password);
      navigate(isRecruiter(user) ? '/business-dashboard' : '/');
    } catch (err) {
      setServerError(err.message || 'Login failed');
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

        {serverError && <div style={styles.serverError}>{serverError}</div>}

        <form onSubmit={handleSubmit}>
          <input
            style={{
              ...styles.field,
              ...(errors.email ? styles.fieldError : {}),
            }}
            type="email"
            placeholder="Email address"
            {...register('email', {
              validate: (value) => validateEmail(value),
            })}
          />
          {errors.email && <p style={styles.errorMsg}>{errors.email.message}</p>}

          <input
            style={{
              ...styles.field,
              ...(errors.password ? styles.fieldError : {}),
            }}
            type="password"
            placeholder="Password"
            {...register('password', {
              validate: (value) => validatePassword(value),
            })}
          />
          {errors.password && <p style={styles.errorMsg}>{errors.password.message}</p>}

          <Button
            variant="primary"
            style={{ width: '100%', marginTop: 8 }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        <p style={styles.link}>
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}

import { useState } from 'react';