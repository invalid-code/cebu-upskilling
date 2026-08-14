import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import { extractResumeText } from '../utils/resumeText';

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
    marginBottom: 12,
    fontSize: 14,
  },
  fileInput: {
    width: '100%',
    background: 'var(--surface)',
    border: '1px solid var(--line)',
    borderRadius: 10,
    minHeight: 42,
    padding: '9px 12px',
    color: 'var(--ink)',
    marginBottom: 12,
    fontSize: 14,
    cursor: 'pointer',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
  },
  error: {
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

export default function RegisterPage() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    emailAddress: '',
    password: '',
    address: '',
    birthday: '',
    resume: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const { register } = useAuth();
  const navigate = useNavigate();

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleResumeFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const isDocx = file.name.toLowerCase().endsWith('.docx');
    if (!allowed.includes(file.type) && !isDocx) {
      setResumeFile(null);
      setError('Resume must be a PDF or DOCX file only');
      e.target.value = '';
      return;
    }
    setError('');
    setResumeFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!resumeFile) {
      setError('Resume is required');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const payload = { ...form };
      if (resumeFile) {
        const resumeText = await extractResumeText(resumeFile);
        if (!resumeText) {
          setError('Could not read the resume. Ensure it contains selectable text.');
          setLoading(false);
          return;
        }
        payload.resume = resumeText;
      }
      await register(payload);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Registration failed');
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
        <h2 style={styles.title}>Create your account</h2>
        <p style={styles.subtitle}>Start your career pathway today</p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={styles.row}>
            <input
              style={styles.field}
              placeholder="First name"
              value={form.firstName}
              onChange={update('firstName')}
              required
            />
            <input
              style={styles.field}
              placeholder="Last name"
              value={form.lastName}
              onChange={update('lastName')}
              required
            />
          </div>
          <input
            style={styles.field}
            type="email"
            placeholder="Email address"
            value={form.emailAddress}
            onChange={update('emailAddress')}
            required
          />
          <input
            style={styles.field}
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={update('password')}
            required
            minLength={6}
          />
          <input
            style={styles.field}
            type="date"
            aria-label="Birthday"
            value={form.birthday}
            onChange={update('birthday')}
          />
          <input
            style={styles.field}
            placeholder="Address (optional)"
            value={form.address}
            onChange={update('address')}
          />
          <input
            style={styles.fileInput}
            type="file"
            accept=".pdf,.docx"
            aria-label="Resume"
            onChange={handleResumeFile}
          />
          <Button
            variant="primary"
            style={{ width: '100%', marginTop: 4 }}
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create account'}
          </Button>
        </form>

        <p style={styles.link}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
