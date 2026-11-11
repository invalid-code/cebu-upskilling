import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, MapPin, Globe2, LockKeyhole, Save, FileText, ExternalLink, Sun, Moon } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, getDashboardPath } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Field from '../components/ui/Field';
import { useToast } from '../context/ToastContext';
import ErrorState, { ErrorBanner } from '../components/ui/ErrorState';
import Skeleton, { SkeletonStatus } from '../components/ui/Skeleton';
import { useThemeStore } from '../stores/themeStore';
import { api } from '../api/client';
import styles from './ProfilePage.module.css';

function levelLabel(level) {
  switch (level) {
    case 1: return 'No Knowledge';
    case 2: return 'Beginner';
    case 3: return 'Intermediate';
    case 4: return 'Advanced';
    case 5: return 'Expert';
    default: return 'Unassessed';
  }
}

function TextField({ id, label, value, onChange, readOnly = false, hint, name }) {
  return (
    <Field id={id} label={label} hint={hint}>
      <input
        className={styles.input}
        name={name}
        value={value || ''}
        onChange={onChange}
        readOnly={readOnly}
      />
    </Field>
  );
}

function Section({ id, eyebrow, title, description, children, icon }) {
  return (
    <section className={styles.card} aria-labelledby={`${id}-title`}>
      <div className={styles.sectionHead}>
        <div>
          {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
          <h2 className={styles.sectionTitle} id={`${id}-title`}>{title}</h2>
          {description && <p className={styles.sectionText}>{description}</p>}
        </div>
        {icon}
      </div>
      {children}
    </section>
  );
}

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
];

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const isDark = useThemeStore((state) => state.isDark);
  const setTheme = useThemeStore((state) => state.setTheme);
  const [form, setForm] = useState({ targetRole: '', address: '', remoteFriendly: false });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [skills, setSkills] = useState(null);
  const [skillsError, setSkillsError] = useState('');
  const [skillsAttempt, setSkillsAttempt] = useState(0);

  const isLearner = user?.role === 'Learner';

  const handleBack = () => {
    const canGoBack = window.history.state && typeof window.history.state.idx === 'number'
      ? window.history.state.idx > 0
      : window.history.length > 1;
    if (canGoBack) {
      navigate(-1);
    } else {
      navigate(getDashboardPath(user), { replace: true });
    }
  };

  useEffect(() => {
    setForm({ targetRole: user?.targetRole || '', address: user?.address || '', remoteFriendly: Boolean(user?.remoteFriendly) });
  }, [user]);

  useEffect(() => {
    if (user?.role !== 'Learner') return;
    let active = true;
    setSkillsError('');
    api.get('/skills').then(
      (data) => { if (active) setSkills(Array.isArray(data) ? data : []); },
      (err) => {
        if (active) {
          setSkills(null);
          setSkillsError(`Could not load your parsed skills.${err?.message ? ` ${err.message}` : ''}`);
        }
      },
    );
    return () => { active = false; };
  }, [user?.role, skillsAttempt]);

  const retrySkills = useCallback(() => {
    setSkills(null);
    setSkillsError('');
    setSkillsAttempt((n) => n + 1);
  }, []);

  const initials = useMemo(() => `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`, [user]);
  const fullName = `${user?.firstName || 'User'} ${user?.lastName || ''}`.trim();

  const reset = () => setForm({ targetRole: user?.targetRole || '', address: user?.address || '', remoteFriendly: Boolean(user?.remoteFriendly) });
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setSaveError('');
    try {
      const updated = await api.patch('/auth/profile', form);
      localStorage.setItem('user', JSON.stringify(updated));
      setUser(updated);
      showToast('Profile updated successfully', 'success');
    } catch (error) {
      const msg = error.message || 'Could not update your profile';
      setSaveError(msg);
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`view-enter ${styles.page}`}>
      <div className={styles.topRow}>
        <button type="button" className={styles.back} onClick={handleBack} aria-label="Go back">
          <ArrowLeft size={18} aria-hidden="true" />
        </button>
        <div>
          <p className={styles.eyebrow}>Account</p>
          <h1 className={styles.title}>Your profile</h1>
        </div>
      </div>

      <div className={styles.top}>
        <div className={`${styles.card} ${styles.identity}`}>
          <div>
            <div className={styles.avatar} aria-hidden="true">{initials || 'U'}</div>
            <h2 className={styles.name}>{fullName}</h2>
            <p className={styles.email}>{user?.emailAddress}</p>
          </div>
          <div className={styles.roleLine}><Check size={15} aria-hidden="true" /> {user?.role || 'Learner'} account</div>
        </div>

        <Section
          id="personal"
          title="Personal details"
          description="Your identity details are managed by your account."
          icon={<LockKeyhole size={18} color="var(--muted)" aria-hidden="true" />}
        >
          <div className={styles.fields}>
            <TextField id="profile-first-name" label="First name" value={user?.firstName} readOnly hint="Read-only" />
            <TextField id="profile-last-name" label="Last name" value={user?.lastName} readOnly hint="Read-only" />
            <TextField id="profile-email" label="Email address" value={user?.emailAddress} readOnly hint="Read-only" />
            <TextField id="profile-role" label="Account type" value={user?.role} readOnly hint="Read-only" />
          </div>
        </Section>
      </div>

      {user?.resumeUrl && (
        <Section id="resume" eyebrow="Resume" title="Your resume" description="View or share your uploaded resume.">
          <a href={user.resumeUrl} target="_blank" rel="noopener noreferrer" data-testid="resume-link" className={styles.resumeLink}>
            <FileText size={16} aria-hidden="true" /> View resume <ExternalLink size={14} aria-hidden="true" />
          </a>
          <p className={styles.url}>{user.resumeUrl}</p>
        </Section>
      )}

      {isLearner && (
        <Section
          id="skills"
          eyebrow="Parsed skills"
          title="Skills from your resume"
          description="Parsed automatically from your resume. Verify a skill to strengthen your profile."
        >
          {skills === null && !skillsError && (
            <SkeletonStatus label="Loading skills…" minHeight={34}>
              <div className={styles.skeletonSkills}>
                <Skeleton height={34} width={110} radius={17} />
                <Skeleton height={34} width={90} radius={17} />
                <Skeleton height={34} width={130} radius={17} />
              </div>
            </SkeletonStatus>
          )}
          {skillsError && <ErrorState error={skillsError} onRetry={retrySkills} />}
          {skills !== null && !skillsError && skills.length === 0 && (
            <p className={styles.note}>No parsed skills yet — they appear here after your resume is parsed.</p>
          )}
          {skills !== null && skills.length > 0 && (
            <ul data-testid="parsed-skills" className={styles.skills}>
              {skills.map((skill) => (
                <li key={skill.skillId} className={`${styles.skill} ${skill.verified ? styles.skillVerified : ''}`}>
                  {skill.verified && <Check size={14} color="var(--teal)" aria-label="Verified" />}
                  <span style={{ fontWeight: 600 }}>{skill.name}</span>
                  <span className={styles.skillMeta}>{levelLabel(skill.currentLevel)}{skill.verified ? ' · Verified' : ''}</span>
                </li>
              ))}
            </ul>
          )}
          <p className={styles.skillsLink}><Link to="/assessments" className={styles.link}>Verify skills in Assessments →</Link></p>
        </Section>
      )}

      <Section
        id="preferences"
        eyebrow="Pathway preferences"
        title="Shape the opportunities you see"
        description="Keep these details current so recommendations feel relevant."
      >
        {saveError && <ErrorBanner title="Couldn’t save profile" description={saveError} onDismiss={() => setSaveError('')} />}
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.fields}>
            {form.targetRole?.trim() ? (
              <TextField id="profile-target-role" label="Target role" name="targetRole" value={form.targetRole} onChange={update('targetRole')} hint="The role you are working toward" />
            ) : null}
            <TextField id="profile-address" label="Location" name="address" value={form.address} onChange={update('address')} hint="City, province, or neighborhood" />
          </div>
          <label className={styles.check}>
            <input type="checkbox" checked={form.remoteFriendly} onChange={(event) => setForm((current) => ({ ...current, remoteFriendly: event.target.checked }))} />
            <span className={styles.checkText}>
              <strong><Globe2 size={15} style={{ verticalAlign: '-3px', marginRight: 7 }} aria-hidden="true" />Open to remote work</strong>
              <small>Include remote-friendly roles in your recommendations.</small>
            </span>
          </label>
          <div className={styles.actions}>
            <Button type="button" variant="ghost" onClick={reset}>Reset</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : <><Save size={15} aria-hidden="true" /> Save changes</>}</Button>
          </div>
        </form>
      </Section>

      <Section
        id="appearance"
        eyebrow="Appearance"
        title="Theme"
        description="Applies to every page and is remembered on this device."
      >
        <fieldset className={styles.radios} aria-labelledby="appearance-title">
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
            const selected = (value === 'dark') === isDark;
            return (
              <label key={value} className={`${styles.radio} ${selected ? styles.radioOn : ''}`}>
                <input
                  type="radio"
                  name="theme"
                  value={value}
                  checked={selected}
                  onChange={() => setTheme(value)}
                />
                <Icon size={16} aria-hidden="true" />
                {label}
              </label>
            );
          })}
        </fieldset>
      </Section>

      <p className={styles.footnote}><MapPin size={15} aria-hidden="true" /> Your profile powers your skill and job recommendations.</p>
    </div>
  );
}
