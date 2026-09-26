import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, getDashboardPath } from '../context/AuthContext';
import { validateEmail, validatePassword, validatePasswordConfirm, validateRequired, validateBirthday } from '../utils/validation';
import { useToast } from '../context/ToastContext';
import { ErrorBanner, FieldError } from '../components/ui/ErrorState';
import Button from '../components/ui/Button';
import GoogleSignInButton from '../components/GoogleSignInButton';
import PasswordField from '../components/ui/PasswordField';
import { pollForParsedSkills } from '../lib/parsePolling';
import { authStyles, authSubtitle, centeredPage } from '../styles/shared';

const styles = {
  container: { ...centeredPage },
  card: { ...authStyles.card },
  brand: {
    display: 'flex',
    gap: 10,
    alignItems: 'center',
    marginBottom: 28,
    justifyContent: 'center',
  },
  mark: { ...authStyles.mark },
  title: { ...authStyles.title },
  subtitle: { ...authSubtitle },
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
  fieldHint: {
    fontSize: 12,
    color: 'var(--muted)',
    marginBottom: 12,
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
  fieldError: { ...authStyles.fieldError },
  error: { ...authStyles.error },
  link: { ...authStyles.link },
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
    color: 'var(--coral-ink)',
  },
};

const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201+'];

const initialFieldErrors = {
  firstName: '',
  lastName: '',
  emailAddress: '',
  password: '',
  confirmPassword: '',
  companyName: '',
  birthday: '',
  companyWebsite: '',
};

export default function RegisterPage() {
  const todayIso = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    emailAddress: '',
    password: '',
    address: '',
    birthday: '',
    companyName: '',
    companyIndustry: '',
    companyWebsite: '',
    companyLocation: '',
    companySize: '',
    companyDescription: '',
  });
  const [role, setRole] = useState('learner');
  const [fieldErrors, setFieldErrors] = useState(initialFieldErrors);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const [confirmPassword, setConfirmPassword] = useState('');
  const { register, registerCompany, loginWithGoogle } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleResumeFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const isDocx = file.name.toLowerCase().endsWith('.docx');
    if (!allowed.includes(file.type) && !isDocx) {
      setResumeFile(null);
      const msg = 'Resume must be a PDF or DOCX file only';
      setError(msg);
      showToast(msg, 'error');
      e.target.value = '';
      return;
    }
    setError('');
    setResumeFile(file);
  };

  const handleConfirmPasswordChange = (e) => {
    setConfirmPassword(e.target.value);
    if (fieldErrors.confirmPassword) {
      setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }));
    }
  };

  const update = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const formWithoutCompanyFields = () => {
    const {
      companyIndustry: _i,
      companyWebsite: _w,
      companyLocation: _l,
      companySize: _s,
      companyDescription: _d,
      ...rest
    } = form;
    return rest;
  };

  const validateForm = () => {
    let websiteError = '';
    if (role === 'recruiter' && form.companyWebsite.trim()) {
      try {
        const url = new URL(form.companyWebsite.trim());
        websiteError = !['http:', 'https:'].includes(url.protocol)
          ? 'Website must start with http:// or https://'
          : '';
      } catch {
        websiteError = 'Enter a valid website URL (e.g. https://example.com)';
      }
    }
    const errors = {
      firstName: validateRequired(form.firstName, 'First name') || '',
      lastName: validateRequired(form.lastName, 'Last name') || '',
      emailAddress: validateEmail(form.emailAddress) || '',
      password: validatePassword(form.password) || '',
      confirmPassword: validatePasswordConfirm(confirmPassword, form.password) || '',
      companyName: role === 'recruiter' ? validateRequired(form.companyName, 'Company name') || '' : '',
      birthday: role === 'learner' ? validateBirthday(form.birthday) || '' : '',
      companyWebsite: websiteError,
    };
    setFieldErrors(errors);
    return !Object.values(errors).some(Boolean);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validateForm()) {
      showToast('Please correct the highlighted fields', 'error');
      return;
    }
    setLoading(true);
    showToast('Creating your account and parsing your resume…', 'info');
    try {
      if (role === 'recruiter') {
        await registerCompany({
          companyName: form.companyName,
          firstName: form.firstName,
          lastName: form.lastName,
          emailAddress: form.emailAddress,
          password: form.password,
          address: form.address,
          birthday: form.birthday,
          companyIndustry: form.companyIndustry || null,
          companyWebsite: form.companyWebsite.trim() || null,
          companyLocation: form.companyLocation || null,
          companySize: form.companySize || null,
          companyDescription: form.companyDescription || null,
        });
        showToast(`Welcome, ${form.firstName}! Your employer account is ready.`, 'success');
        navigate('/business-dashboard');
        return;
      }
      if (role === 'courseprovider') {
        const created = await register({ ...formWithoutCompanyFields(), birthday: form.birthday || null, role: 'CourseProvider' });
        showToast(`Welcome, ${created?.firstName || form.firstName}! Your provider workspace is ready.`, 'success');
        navigate('/provider-dashboard');
        return;
      }
      if (role === 'learner' && !resumeFile) {
        const msg = 'Resume is required for learners — upload a PDF or DOCX file';
        setError(msg);
        showToast(msg, 'error');
        setLoading(false);
        return;
      }
      const payload = { ...formWithoutCompanyFields(), birthday: form.birthday || null };
      if (resumeFile) {
        payload.resumeFile = resumeFile;
      }
      const res = await register(payload);
      const parsed = res?.parsedSkillCount ?? 0;
      const assessments = res?.assessmentCount ?? 0;
      if (parsed > 0) {
        showToast(
          `Parsed ${parsed} skill${parsed === 1 ? '' : 's'}` +
          (assessments > 0 ? ` · ${assessments} assessment${assessments === 1 ? '' : 's'} ready to verify` : ''),
          'success'
        );
      } else {
        showToast('Account created — welcome to Cebu Upskilling!', 'success');
        // Parsing/upload finish in the background; notify when skills land.
        pollForParsedSkills(showToast);
      }
      navigate('/dashboard');
    } catch (err) {
      const msg = err.message || 'Registration failed';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (idToken) => {
    setError('');
    setLoading(true);
    try {
      const googleRole = role === 'recruiter' ? 'Recruiter' : role === 'courseprovider' ? 'CourseProvider' : 'Learner';
      const user = await loginWithGoogle(idToken, googleRole);
      showToast(`Signed in with Google — welcome, ${user?.firstName || 'there'}!`, 'success');
      navigate(getDashboardPath(user));
    } catch (err) {
      const msg = err.message || 'Google sign-up failed';
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
        <h2 style={styles.title}>Create your account</h2>
        <p style={styles.subtitle}>Start your career pathway today</p>

        {error && (
          <div style={{ marginBottom: 12 }}>
            <ErrorBanner title="Registration failed" description={error} onDismiss={() => setError('')} />
          </div>
        )}

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
          <button
            type="button"
            style={{
              ...styles.roleButton,
              ...(role === 'courseprovider' ? styles.roleButtonActive : {}),
            }}
            onClick={() => setRole('courseprovider')}
          >
            Course Provider
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {role === 'recruiter' && (
            <>
              <label htmlFor="register-company-name" style={authStyles.label}>Company name</label>
              <input
                id="register-company-name"
                style={{ ...styles.field, borderColor: fieldErrors.companyName ? 'var(--danger)' : 'var(--line)', background: fieldErrors.companyName ? 'var(--danger-soft)' : 'var(--surface)' }}
                placeholder="Company name"
                value={form.companyName}
                onChange={update('companyName')}
                aria-invalid={!!fieldErrors.companyName}
                aria-describedby={fieldErrors.companyName ? 'company-error' : undefined}
              />
              {fieldErrors.companyName && <FieldError id="company-error">{fieldErrors.companyName}</FieldError>}
              <div style={{ ...styles.row, marginTop: 8 }}>
                <div>
                  <label htmlFor="register-company-industry" style={authStyles.label}>Industry (optional)</label>
                  <input
                    id="register-company-industry"
                    style={styles.field}
                    placeholder="Industry (optional)"
                    value={form.companyIndustry}
                    onChange={update('companyIndustry')}
                  />
                </div>
                <div>
                  <label htmlFor="register-company-size" style={authStyles.label}>Company size</label>
                  <select
                    id="register-company-size"
                    style={styles.field}
                    value={form.companySize}
                    onChange={update('companySize')}
                    aria-label="Company size"
                  >
                    <option value="">Company size…</option>
                    {COMPANY_SIZES.map((size) => (
                      <option key={size} value={size}>{size} employees</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={styles.row}>
                <div>
                  <label htmlFor="register-company-website" style={authStyles.label}>Website (optional)</label>
                  <input
                    id="register-company-website"
                    style={styles.field}
                    type="url"
                    placeholder="Website (optional)"
                    value={form.companyWebsite}
                    onChange={update('companyWebsite')}
                    aria-invalid={!!fieldErrors.companyWebsite}
                  />
                  {fieldErrors.companyWebsite && <FieldError id="company-website-error">{fieldErrors.companyWebsite}</FieldError>}
                </div>
                <div>
                  <label htmlFor="register-company-location" style={authStyles.label}>Location (optional)</label>
                  <input
                    id="register-company-location"
                    style={styles.field}
                    placeholder="Location (optional)"
                    value={form.companyLocation}
                    onChange={update('companyLocation')}
                  />
                </div>
              </div>
              <label htmlFor="register-company-description" style={authStyles.label}>About your company (optional)</label>
              <textarea
                id="register-company-description"
                style={{ ...styles.field, minHeight: 70, resize: 'vertical', fontFamily: 'inherit' }}
                maxLength={2000}
                placeholder="About your company (optional) — what you do and why candidates should join"
                value={form.companyDescription}
                onChange={update('companyDescription')}
                aria-label="Company description"
              />
            </>
          )}
          <div style={styles.row}>
            <div>
              <label htmlFor="register-first-name" style={authStyles.label}>First name</label>
              <input
                id="register-first-name"
                style={{ ...styles.field, borderColor: fieldErrors.firstName ? 'var(--danger)' : 'var(--line)', background: fieldErrors.firstName ? 'var(--danger-soft)' : 'var(--surface)' }}
                placeholder="First name"
                value={form.firstName}
                onChange={update('firstName')}
                aria-invalid={!!fieldErrors.firstName}
              />
              {fieldErrors.firstName && <FieldError>{fieldErrors.firstName}</FieldError>}
            </div>
            <div>
              <label htmlFor="register-last-name" style={authStyles.label}>Last name</label>
              <input
                id="register-last-name"
                style={{ ...styles.field, borderColor: fieldErrors.lastName ? 'var(--danger)' : 'var(--line)', background: fieldErrors.lastName ? 'var(--danger-soft)' : 'var(--surface)' }}
                placeholder="Last name"
                value={form.lastName}
                onChange={update('lastName')}
                aria-invalid={!!fieldErrors.lastName}
              />
              {fieldErrors.lastName && <FieldError>{fieldErrors.lastName}</FieldError>}
            </div>
          </div>
          <label htmlFor="register-email" style={authStyles.label}>Email address</label>
          <input
            id="register-email"
            style={{ ...styles.field, borderColor: fieldErrors.emailAddress ? 'var(--danger)' : 'var(--line)', background: fieldErrors.emailAddress ? 'var(--danger-soft)' : 'var(--surface)' }}
            type="email"
            placeholder="Email address"
            value={form.emailAddress}
            onChange={update('emailAddress')}
            aria-invalid={!!fieldErrors.emailAddress}
          />
          {fieldErrors.emailAddress && <FieldError>{fieldErrors.emailAddress}</FieldError>}
          <label htmlFor="register-password" style={authStyles.label}>Password</label>
          <PasswordField
            id="register-password"
            style={{ ...styles.field, borderColor: fieldErrors.password ? 'var(--danger)' : 'var(--line)', background: fieldErrors.password ? 'var(--danger-soft)' : 'var(--surface)' }}
            placeholder="Password"
            value={form.password}
            onChange={update('password')}
            autoComplete="new-password"
            aria-invalid={!!fieldErrors.password}
          />
          {fieldErrors.password && <FieldError>{fieldErrors.password}</FieldError>}
          <label htmlFor="register-confirm-password" style={authStyles.label}>Confirm password</label>
          <PasswordField
            id="register-confirm-password"
            style={{ ...styles.field, borderColor: fieldErrors.confirmPassword ? 'var(--danger)' : 'var(--line)', background: fieldErrors.confirmPassword ? 'var(--danger-soft)' : 'var(--surface)' }}
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={handleConfirmPasswordChange}
            autoComplete="new-password"
            aria-invalid={!!fieldErrors.confirmPassword}
          />
          {fieldErrors.confirmPassword && <FieldError>{fieldErrors.confirmPassword}</FieldError>}
          {role === 'learner' && (
            <>
              <div>
                <label style={authStyles.label} htmlFor="birthday">
                  Birthday
                </label>
                <input
                  id="birthday"
                  style={{ ...styles.field, borderColor: fieldErrors.birthday ? 'var(--danger)' : 'var(--line)', background: fieldErrors.birthday ? 'var(--danger-soft)' : 'var(--surface)' }}
                  type="date"
                  min="1900-01-01"
                  max={todayIso}
                  value={form.birthday}
                  onChange={update('birthday')}
                  aria-invalid={!!fieldErrors.birthday}
                  aria-describedby={fieldErrors.birthday ? 'birthday-error' : 'birthday-hint'}
                />
                <div style={styles.fieldHint} id="birthday-hint">
                  Optional — used to match you with age-appropriate opportunities
                </div>
                {fieldErrors.birthday && <FieldError id="birthday-error">{fieldErrors.birthday}</FieldError>}
              </div>
              <label htmlFor="register-address" style={authStyles.label}>Address (optional)</label>
              <input
                id="register-address"
                style={styles.field}
                placeholder="Address (optional)"
                value={form.address}
                onChange={update('address')}
              />
              <label htmlFor="register-resume" style={authStyles.label}>Resume (optional)</label>
              <input
                id="register-resume"
                style={styles.fileInput}
                type="file"
                accept=".pdf,.docx"
                aria-label="Resume"
                onChange={handleResumeFile}
              />
            </>
          )}
          <Button
            variant="primary"
            style={{ width: '100%', marginTop: 8 }}
            loading={loading}
          >
            Create account
          </Button>
        </form>

        <GoogleSignInButton
          onSuccess={handleGoogleSuccess}
          onError={(err) => { const msg = err.message || 'Google sign-in failed'; setError(msg); showToast(msg, 'error'); }}
          text="signup_with"
        />

        <p style={styles.link}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}