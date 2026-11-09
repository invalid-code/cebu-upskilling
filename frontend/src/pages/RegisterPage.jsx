import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth, getDashboardPath } from '../context/AuthContext';
import {
  validateEmail,
  validatePassword,
  validatePasswordConfirm,
  validateRequired,
  validateBirthday,
} from '../utils/validation';
import { useToast } from '../context/ToastContext';
import { useRateLimitStore, RATE_LIMIT_MESSAGE } from '../stores/rateLimitStore';
import Button from '../components/ui/Button';
import Field from '../components/ui/Field';
import Stepper from '../components/ui/Stepper';
import GoogleSignInButton from '../components/GoogleSignInButton';
import PasswordField from '../components/ui/PasswordField';
import { pollForParsedSkills } from '../lib/parsePolling';
import { formatFileSize, parseResumePreview, validateResumeFile } from './registerResume';
import styles from './RegisterPage.module.css';

const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201+'];
const STEPS = ['Account', 'Profile'];

// Field id (DOM) and the step it lives on.
const FIELD_META = {
  firstName: { id: 'register-first-name', step: 0 },
  lastName: { id: 'register-last-name', step: 0 },
  emailAddress: { id: 'register-email', step: 0 },
  password: { id: 'register-password', step: 0 },
  confirmPassword: { id: 'register-confirm-password', step: 0 },
  companyName: { id: 'register-company-name', step: 1 },
  companyWebsite: { id: 'register-company-website', step: 1 },
  birthday: { id: 'birthday', step: 1 },
  resume: { id: 'register-resume', step: 1 },
};
const FIELD_ORDER = Object.keys(FIELD_META);

const initialFieldErrors = Object.fromEntries(FIELD_ORDER.map((key) => [key, '']));

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
  const [step, setStep] = useState(0);
  const [fieldErrors, setFieldErrors] = useState(initialFieldErrors);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeStatus, setResumeStatus] = useState('idle'); // idle | parsing | ready
  const [resumePreview, setResumePreview] = useState('');
  const [focusId, setFocusId] = useState(null);
  const parseRunRef = useRef(0);
  const summaryRef = useRef(null);
  const fileInputRef = useRef(null);
  const { register, registerCompany, loginWithGoogle } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const cooling = useRateLimitStore((s) => s.active);

  // Ignore results of any parse still running once the page is gone.
  useEffect(
    () => () => {
      parseRunRef.current += 1;
    },
    [],
  );

  // Move focus to the first invalid field once its step is visible.
  useEffect(() => {
    if (!focusId) return;
    document.getElementById(focusId)?.focus();
    setFocusId(null);
  }, [focusId, step]);

  useEffect(() => {
    if (error) summaryRef.current?.focus();
  }, [error]);

  const clearFieldError = (key) =>
    setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: '' } : prev));

  const update = (field) => (e) => {
    const { value } = e.target;
    setForm((prev) => ({ ...prev, [field]: value }));
    clearFieldError(field);
  };

  const rejectResume = (reason) => {
    parseRunRef.current += 1;
    setResumeFile(null);
    setResumePreview('');
    setResumeStatus('idle');
    setFieldErrors((prev) => ({ ...prev, resume: reason }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleResumeFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reason = validateResumeFile(file);
    if (reason) {
      rejectResume(reason);
      return;
    }
    const run = ++parseRunRef.current;
    clearFieldError('resume');
    setResumeFile(file);
    setResumePreview('');
    setResumeStatus('parsing');
    try {
      const preview = await parseResumePreview(file);
      if (run !== parseRunRef.current) return;
      setResumePreview(preview);
      setResumeStatus('ready');
    } catch (err) {
      if (run !== parseRunRef.current) return;
      rejectResume(err.message);
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

  const computeErrors = () => {
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
    return {
      firstName: validateRequired(form.firstName, 'First name') || '',
      lastName: validateRequired(form.lastName, 'Last name') || '',
      emailAddress: validateEmail(form.emailAddress) || '',
      password: validatePassword(form.password) || '',
      confirmPassword: validatePasswordConfirm(confirmPassword, form.password) || '',
      companyName: role === 'recruiter' ? validateRequired(form.companyName, 'Company name') || '' : '',
      companyWebsite: websiteError,
      birthday: role === 'learner' ? validateBirthday(form.birthday) || '' : '',
      resume:
        role === 'learner' && !resumeFile
          ? fieldErrors.resume || 'Resume is required for learners. Upload a PDF or DOCX file.'
          : '',
    };
  };

  // Validates the given steps; on failure shows errors, moves to the step of
  // the first invalid field and focuses it. Returns true when valid.
  const validateSteps = (steps) => {
    const all = computeErrors();
    const errors = { ...initialFieldErrors };
    for (const key of FIELD_ORDER) {
      if (steps.includes(FIELD_META[key].step)) errors[key] = all[key];
    }
    setFieldErrors(errors);
    const first = FIELD_ORDER.find((key) => errors[key]);
    if (!first) return true;
    setStep(FIELD_META[first].step);
    setFocusId(FIELD_META[first].id);
    return false;
  };

  const goNext = () => {
    setError('');
    if (validateSteps([0])) setStep(1);
    else showToast('Please correct the highlighted fields', 'error');
  };

  const selectStep = (index) => {
    if (index <= step) {
      setStep(index);
    } else {
      goNext();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cooling) return;
    setError('');
    if (!validateSteps([0, 1])) {
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
          'success',
        );
      } else {
        showToast('Account created — welcome to Cebu Upskilling!', 'success');
        // Parsing/upload finish in the background; notify when skills land.
        pollForParsedSkills(showToast);
      }
      navigate('/dashboard');
    } catch (err) {
      const msg = err.message || 'Registration failed';
      setError(err.status === 429 ? RATE_LIMIT_MESSAGE : msg);
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
      setError(err.status === 429 ? RATE_LIMIT_MESSAGE : msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { value: 'learner', label: 'Learner' },
    { value: 'recruiter', label: 'Employer' },
    { value: 'courseprovider', label: 'Course Provider' },
  ];
  const summaryMessage = error || (cooling ? RATE_LIMIT_MESSAGE : '');

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <div className={styles.mark} aria-hidden="true">CU</div>
          <strong>Cebu Upskilling</strong>
        </div>
        <h2 className={styles.title}>Create your account</h2>
        <p className={styles.subtitle}>Start your career pathway today</p>

        {summaryMessage && (
          <div className={styles.summary} role="alert" tabIndex={-1} ref={summaryRef}>
            <p className={styles.summaryTitle}>Registration failed</p>
            <p className={styles.summaryText}>{summaryMessage}</p>
          </div>
        )}

        <div className={styles.stepper}>
          <Stepper steps={STEPS} current={step} onSelect={selectStep} />
        </div>

        <div className={styles.roleGroup} role="group" aria-label="Account type">
          {roles.map((r) => (
            <button
              key={r.value}
              type="button"
              className={`${styles.roleButton} ${role === r.value ? styles.roleActive : ''}`}
              aria-pressed={role === r.value}
              onClick={() => setRole(r.value)}
            >
              {r.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.panel} hidden={step !== 0} aria-label="Account details" role="group">
            <div className={styles.row}>
              <Field id="register-first-name" label="First name" error={fieldErrors.firstName}>
                <input className={styles.input} placeholder="First name" value={form.firstName} onChange={update('firstName')} />
              </Field>
              <Field id="register-last-name" label="Last name" error={fieldErrors.lastName}>
                <input className={styles.input} placeholder="Last name" value={form.lastName} onChange={update('lastName')} />
              </Field>
            </div>
            <Field id="register-email" label="Email address" error={fieldErrors.emailAddress}>
              <input
                className={styles.input}
                type="email"
                placeholder="Email address"
                autoComplete="email"
                value={form.emailAddress}
                onChange={update('emailAddress')}
              />
            </Field>
            <Field id="register-password" label="Password" error={fieldErrors.password}>
              <PasswordField
                className={styles.input}
                placeholder="Password"
                value={form.password}
                onChange={update('password')}
                autoComplete="new-password"
              />
            </Field>
            <Field id="register-confirm-password" label="Confirm password" error={fieldErrors.confirmPassword}>
              <PasswordField
                className={styles.input}
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  clearFieldError('confirmPassword');
                }}
                autoComplete="new-password"
              />
            </Field>
          </div>

          <div className={styles.panel} hidden={step !== 1} aria-label="Profile details" role="group">
            {role === 'recruiter' && (
              <>
                <Field id="register-company-name" label="Company name" error={fieldErrors.companyName}>
                  <input className={styles.input} placeholder="Company name" value={form.companyName} onChange={update('companyName')} />
                </Field>
                <div className={styles.row}>
                  <Field id="register-company-industry" label="Industry (optional)">
                    <input
                      className={styles.input}
                      placeholder="Industry (optional)"
                      value={form.companyIndustry}
                      onChange={update('companyIndustry')}
                    />
                  </Field>
                  <Field id="register-company-size" label="Company size">
                    <select
                      className={styles.input}
                      value={form.companySize}
                      onChange={update('companySize')}
                      aria-label="Company size"
                    >
                      <option value="">Company size…</option>
                      {COMPANY_SIZES.map((size) => (
                        <option key={size} value={size}>{size} employees</option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div className={styles.row}>
                  <Field id="register-company-website" label="Website (optional)" error={fieldErrors.companyWebsite}>
                    <input
                      className={styles.input}
                      type="url"
                      placeholder="Website (optional)"
                      value={form.companyWebsite}
                      onChange={update('companyWebsite')}
                    />
                  </Field>
                  <Field id="register-company-location" label="Location (optional)">
                    <input
                      className={styles.input}
                      placeholder="Location (optional)"
                      value={form.companyLocation}
                      onChange={update('companyLocation')}
                    />
                  </Field>
                </div>
                <Field id="register-company-description" label="About your company (optional)">
                  <textarea
                    className={`${styles.input} ${styles.textarea}`}
                    maxLength={2000}
                    placeholder="About your company (optional) — what you do and why candidates should join"
                    value={form.companyDescription}
                    onChange={update('companyDescription')}
                    aria-label="Company description"
                  />
                </Field>
              </>
            )}

            {role === 'courseprovider' && (
              <p className={styles.note}>
                Nothing more to add. Create your account to open your provider workspace.
              </p>
            )}

            {role !== 'courseprovider' && (
              <>
                {role === 'learner' && (
                  <Field
                    id="birthday"
                    label="Birthday"
                    hint="Optional — used to match you with age-appropriate opportunities"
                    error={fieldErrors.birthday}
                  >
                    <input
                      className={styles.input}
                      type="date"
                      min="1900-01-01"
                      max={todayIso}
                      value={form.birthday}
                      onChange={update('birthday')}
                    />
                  </Field>
                )}
                <Field id="register-address" label="Address (optional)">
                  <input
                    className={styles.input}
                    placeholder="Address (optional)"
                    value={form.address}
                    onChange={update('address')}
                  />
                </Field>
              </>
            )}

            {role === 'learner' && (
              <div>
                <Field
                  id="register-resume"
                  label="Resume (PDF or DOCX, up to 5 MB)"
                  hint="We read it in your browser to show a preview, and use it to find your skills."
                  error={fieldErrors.resume}
                >
                  <input
                    ref={fileInputRef}
                    className={styles.fileInput}
                    type="file"
                    accept=".pdf,.docx"
                    aria-label="Resume"
                    onChange={handleResumeFile}
                  />
                </Field>
                <div aria-live="polite">
                  {resumeStatus === 'parsing' && (
                    <p className={styles.parsing}>
                      <Loader2 size={14} className={styles.spinner} aria-hidden="true" />
                      Reading your resume…
                    </p>
                  )}
                  {resumeStatus === 'ready' && resumeFile && (
                    <section className={styles.preview} aria-label="Resume preview">
                      <p className={styles.previewHead}>
                        <span>{resumeFile.name}</span>
                        <span className={styles.previewMeta}>{formatFileSize(resumeFile.size)}</span>
                      </p>
                      <p className={styles.previewText}>{resumePreview}</p>
                    </section>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className={styles.footer}>
            {step === 1 && (
              <Button type="button" variant="ghost" onClick={() => setStep(0)}>
                Back
              </Button>
            )}
            <div className={styles.footerEnd}>
              {step === 0 && (
                <Button type="button" variant="ghost" onClick={goNext}>
                  Next: Profile
                </Button>
              )}
              <Button type="submit" variant="primary" loading={loading} disabled={cooling}>
                Create account
              </Button>
            </div>
          </div>
        </form>

        <GoogleSignInButton
          onSuccess={handleGoogleSuccess}
          onError={(err) => {
            const msg = err.message || 'Google sign-in failed';
            setError(msg);
            showToast(msg, 'error');
          }}
          text="signup_with"
        />

        <p className={styles.link}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
