import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { validateEmail, validatePassword, validateRequired, validateBirthday } from '../utils/validation';
import { extractResumeText } from '../utils/resumeText';
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
  },
  fileInput: {
    width: '100%',
    background: 'var(--surface)',
    border: '1px solid var(--line)',
    borderRadius: 10,
    minHeight: 42,
    padding: '9px 12px',
    color: 'var(--ink)',
    marginBottom: 4,
    fontSize: 14,
    cursor: 'pointer',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
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
  link: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 13,
    color: 'var(--muted)',
  },
  roleToggle: {
    display: 'flex',
    gap: 6,
    marginBottom: 16,
  },
  roleButton: {
    flex: 1,
    padding: '9px 12px',
    border: '1px solid var(--line)',
    borderRadius: 10,
    background: 'transparent',
    color: 'var(--muted)',
    fontSize: 14,
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxSizing: 'border-box',
  },
  roleButtonActive: {
    background: 'var(--coral-soft)',
    color: 'rgb(110, 65, 45)',
  },
};

const initialFieldErrors = {
  firstName: '',
  lastName: '',
  emailAddress: '',
  password: '',
  companyName: '',
  birthday: '',
  resume: '',
};

export default function RegisterPage() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    emailAddress: '',
    password: '',
    targetRole: '',
    address: '',
    birthday: '',
    companyName: '',
  });
  const [role, setRole] = useState('learner');
  const [fieldErrors, setFieldErrors] = useState(initialFieldErrors);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const { register, registerCompany } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const update = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleResumeFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const isDocx = file.name.toLowerCase().endsWith('.docx');
    if (!allowed.includes(file.type) && !isDocx) {
      setResumeFile(null);
      setFieldErrors((prev) => ({ ...prev, resume: 'Resume must be a PDF or DOCX file only' }));
      e.target.value = '';
      return;
    }
    setError('');
    setFieldErrors((prev) => ({ ...prev, resume: '' }));
    setResumeFile(file);
  };

  const validateForm = () => {
    const errors = {
      firstName: validateRequired(form.firstName, 'First name') || '',
      lastName: validateRequired(form.lastName, 'Last name') || '',
      emailAddress: validateEmail(form.emailAddress) || '',
      password: validatePassword(form.password) || '',
      companyName: role === 'recruiter' ? validateRequired(form.companyName, 'Company name') || '' : '',
      birthday: role === 'learner' ? validateBirthday(form.birthday) || '' : '',
      resume: role === 'learner' && !resumeFile ? 'Resume is required' : '',
    };
    setFieldErrors(errors);
    return !Object.values(errors).some(Boolean);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validateForm()) return;
    setLoading(true);

    try {
      if (role === 'recruiter') {
        await registerCompany({
          companyName: form.companyName,
          firstName: form.firstName,
          lastName: form.lastName,
          emailAddress: form.emailAddress,
          password: form.password,
          address: form.address,
          birthday: form.birthday || null,
        });
        navigate('/business-dashboard');
        return;
      }

      showToast('Creating your account and parsing your resume...');
      const resumeText = await extractResumeText(resumeFile);
      if (!resumeText) {
        setError('Could not read the resume. Ensure it contains selectable text.');
        return;
      }

      const payload = {
        ...form,
        birthday: form.birthday || null,
        resume: resumeText,
      };
      const res = await register(payload);
      const parsed = res?.parsedSkillCount ?? 0;
      const assessments = res?.assessmentCount ?? 0;
      if (parsed > 0) {
        showToast(
          `Parsed ${parsed} skill${parsed === 1 ? '' : 's'}` +
          (assessments > 0 ? ` - ${assessments} assessment${assessments === 1 ? '' : 's'} ready to verify` : '')
        );
      } else {
        showToast('Account created');
      }
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

        <div style={styles.roleToggle}>
          <button
            type="button"
            style={{
              ...styles.roleButton,
              ...(role === 'learner' ? styles.roleButtonActive : {}),
            }}
            onClick={() => setRole('learner')}
          >
            Learner
          </button>
          <button
            type="button"
            style={{
              ...styles.roleButton,
              ...(role === 'recruiter' ? styles.roleButtonActive : {}),
            }}
            onClick={() => setRole('recruiter')}
          >
            Employer
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {role === 'recruiter' && (
            <>
              <input
                style={styles.field}
                placeholder="Company name"
                value={form.companyName}
                onChange={update('companyName')}
                aria-invalid={!!fieldErrors.companyName}
              />
              {fieldErrors.companyName && (
                <div style={styles.fieldError}>{fieldErrors.companyName}</div>
              )}
            </>
          )}
          <div style={styles.row}>
            <div>
              <input
                style={styles.field}
                placeholder="First name"
                value={form.firstName}
                onChange={update('firstName')}
                aria-invalid={!!fieldErrors.firstName}
              />
              {fieldErrors.firstName && (
                <div style={styles.fieldError}>{fieldErrors.firstName}</div>
              )}
            </div>
            <div>
              <input
                style={styles.field}
                placeholder="Last name"
                value={form.lastName}
                onChange={update('lastName')}
                aria-invalid={!!fieldErrors.lastName}
              />
              {fieldErrors.lastName && (
                <div style={styles.fieldError}>{fieldErrors.lastName}</div>
              )}
            </div>
          </div>
          <input
            style={styles.field}
            type="email"
            placeholder="Email address"
            value={form.emailAddress}
            onChange={update('emailAddress')}
            aria-invalid={!!fieldErrors.emailAddress}
          />
          {fieldErrors.emailAddress && (
            <div style={styles.fieldError}>{fieldErrors.emailAddress}</div>
          )}
          <input
            style={styles.field}
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={update('password')}
            aria-invalid={!!fieldErrors.password}
          />
          {fieldErrors.password && <div style={styles.fieldError}>{fieldErrors.password}</div>}
          {role === 'learner' && (
            <>
              <input
                style={styles.field}
                type="date"
                aria-label="Birthday"
                value={form.birthday}
                onChange={update('birthday')}
                aria-invalid={!!fieldErrors.birthday}
              />
              {fieldErrors.birthday && (
                <div style={styles.fieldError}>{fieldErrors.birthday}</div>
              )}
              <input
                style={styles.field}
                placeholder="Address (optional)"
                value={form.address}
                onChange={update('address')}
              />
              <select
                style={styles.field}
                aria-label="Target role"
                value={form.targetRole}
                onChange={update('targetRole')}
              >
                <option value="">Target role (optional)</option>
                <option value="Frontend Developer">Frontend Developer</option>
                <option value="Backend Developer">Backend Developer</option>
                <option value="Full Stack Developer">Full Stack Developer</option>
                <option value="Data Analyst">Data Analyst</option>
                <option value="Data Scientist">Data Scientist</option>
                <option value="UI/UX Designer">UI/UX Designer</option>
                <option value="DevOps Engineer">DevOps Engineer</option>
                <option value="Quality Assurance">Quality Assurance</option>
                <option value="Project Manager">Project Manager</option>
                <option value="Other">Other</option>
              </select>
              <input
                style={styles.fileInput}
                type="file"
                accept=".pdf,.docx"
                aria-label="Resume"
                onChange={handleResumeFile}
                aria-invalid={!!fieldErrors.resume}
              />
              {fieldErrors.resume && (
                <div style={styles.fieldError}>{fieldErrors.resume}</div>
              )}
            </>
          )}
          <Button
            variant="primary"
            style={{ width: '100%', marginTop: 8 }}
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
