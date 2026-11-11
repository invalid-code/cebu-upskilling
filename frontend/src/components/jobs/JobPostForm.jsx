import { useEffect, useMemo, useRef, useState } from 'react';
import Button from '../ui/Button';
import Field from '../ui/Field';
import Modal from '../ui/Modal';
import { api } from '../../api/client';
import useUnsavedChangesPrompt from '../../hooks/useUnsavedChangesPrompt';
import { useSubmitCooldown } from '../../hooks/useSubmitCooldown';
import styles from './JobPostForm.module.css';

const experienceLevels = ['Entry', 'Junior', 'Mid', 'Senior', 'Lead'];

export const GENERIC_SAVE_ERROR = 'Could not save the job posting. Please check your entries and try again.';
export const RATE_LIMIT_FORM_MESSAGE = 'Too many requests — please wait 10 seconds before trying again.';

// Field order matches the visual order so the summary lists errors top to bottom.
const FIELD_IDS = {
  title: 'job-title',
  logo: 'job-logo',
};

export function buildInitialForm(initial) {
  return {
    title: initial?.title || '',
    description: initial?.description || '',
    targetRole: initial?.targetRole || '',
    location: initial?.location || '',
    salaryRange: initial?.salaryRange || '',
    jobType: initial?.jobType || 'Full-time',
    experienceLevel: initial?.experienceLevel || '',
    requirements: initial?.requirements || '',
    benefits: initial?.benefits || '',
    isRemote: !!initial?.isRemote,
    expiresAt: initial?.expiresAt ? String(initial.expiresAt).slice(0, 10) : '',
    companyLogoUrl: initial?.companyLogoUrl || '',
    isActive: initial?.isActive ?? true,
  };
}

/** Returns `{ title?: string, companyLogoUrl?: string }` for invalid required/format fields. */
export function validateJobForm(form) {
  const errors = {};
  if (!form.title.trim()) {
    errors.title = 'Enter a job title — learners need it to find your role.';
  }
  const logo = form.companyLogoUrl.trim();
  if (logo && !/^https?:\/\/.+/i.test(logo)) {
    errors.companyLogoUrl = 'Logo URL must start with http:// or https://';
  }
  return errors;
}

const ERROR_FIELD_IDS = { title: FIELD_IDS.title, companyLogoUrl: FIELD_IDS.logo };

export function toJobPayload(form) {
  return {
    title: form.title.trim(),
    description: form.description,
    targetRole: (form.targetRole || form.title).trim(),
    location: form.location,
    salaryRange: form.salaryRange,
    jobType: form.jobType,
    experienceLevel: form.experienceLevel,
    requirements: form.requirements,
    benefits: form.benefits,
    isRemote: form.isRemote,
    // End of the chosen day in the recruiter's local timezone, so the post stays
    // open for the full day (T00:00:00Z would close it 8h early in Asia/Manila).
    expiresAt: form.expiresAt ? new Date(`${form.expiresAt}T23:59:59`).toISOString() : null,
    companyLogoUrl: form.companyLogoUrl.trim(),
    isActive: form.isActive,
  };
}

/** Maps a thrown API error to the message shown in the error summary. */
export function serverErrorMessage(err) {
  if (err?.status === 429) return RATE_LIMIT_FORM_MESSAGE;
  const message = err?.message;
  if (
    typeof message !== 'string'
    || !message.trim()
    || message === '[object Object]'
    || /^HTTP \d+$/.test(message)
  ) {
    return GENERIC_SAVE_ERROR;
  }
  return message;
}

function lines(text) {
  return String(text || '').split('\n').map((l) => l.trim()).filter(Boolean);
}

export function JobPreview({ form }) {
  const requirements = lines(form.requirements);
  const benefits = lines(form.benefits);
  const chips = [
    form.location,
    form.isRemote ? 'Remote-friendly' : '',
    form.jobType,
    form.experienceLevel ? `${form.experienceLevel} level` : '',
    form.salaryRange,
  ].filter(Boolean);

  return (
    <section className={styles.preview} aria-label="Job post preview" data-testid="job-preview">
      <p className={styles.previewLabel}>Live preview</p>
      <h2 className={`${styles.previewTitle} ${form.title.trim() ? '' : styles.previewPlaceholder}`}>
        {form.title.trim() || 'Your job title'}
      </h2>
      {form.targetRole.trim() ? <p className={styles.previewText}>Target role: {form.targetRole.trim()}</p> : null}
      <ul className={styles.previewMeta} aria-label="Job details">
        {chips.map((chip) => <li key={chip} className={styles.previewChip}>{chip}</li>)}
      </ul>
      {!form.isActive ? <p className={styles.previewText}>Not accepting applications</p> : null}
      {form.expiresAt ? <p className={styles.previewText}>Applications close {form.expiresAt}</p> : null}
      <p className={`${styles.previewText} ${form.description.trim() ? '' : styles.previewPlaceholder}`}>
        {form.description.trim() || 'The role description will appear here.'}
      </p>
      {requirements.length > 0 && (
        <>
          <h3 className={styles.previewHeading}>Requirements</h3>
          <ul className={styles.previewList}>
            {requirements.map((r, i) => <li key={`${i}-${r}`}>{r}</li>)}
          </ul>
        </>
      )}
      {benefits.length > 0 && (
        <>
          <h3 className={styles.previewHeading}>Benefits</h3>
          <ul className={styles.previewList}>
            {benefits.map((b, i) => <li key={`${i}-${b}`}>{b}</li>)}
          </ul>
        </>
      )}
    </section>
  );
}

/**
 * Shared form for PostJobPage and EditJobPage.
 *
 * `onSubmit(payload)` must return a promise that resolves on success and rejects with the API
 * error otherwise. `onSaved(result)` runs after the form has been marked clean, so the unsaved
 * changes prompt never blocks the post-save navigation.
 */
export default function JobPostForm({ initial, onSubmit, onSaved, submitLabel }) {
  const initialForm = useMemo(() => buildInitialForm(initial), [initial]);
  const [form, setForm] = useState(initialForm);
  const [attempted, setAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [saved, setSaved] = useState(null);
  const [focusTick, setFocusTick] = useState(0);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiNote, setAiNote] = useState('');
  const summaryRef = useRef(null);
  const { cooling, message: cooldownMessage } = useSubmitCooldown();

  const dirty = !saved && JSON.stringify(form) !== JSON.stringify(initialForm);
  const { blocked, stay, proceed } = useUnsavedChangesPrompt(dirty);

  // Errors are live after the first submit attempt, so they clear as soon as a value becomes valid.
  const errors = useMemo(() => (attempted ? validateJobForm(form) : {}), [attempted, form]);
  const errorEntries = Object.entries(errors);
  const showSummary = errorEntries.length > 0 || Boolean(serverError);

  // Move focus to the summary right after it renders (synchronously, well under 200ms).
  useEffect(() => {
    if (focusTick > 0) summaryRef.current?.focus();
  }, [focusTick]);

  // Navigate only after the form is clean (dirty=false restores the router's navigator first).
  useEffect(() => {
    if (saved) onSaved?.(saved.result);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved]);

  const set = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const focusField = (fieldKey) => {
    document.getElementById(ERROR_FIELD_IDS[fieldKey])?.focus();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting || cooling) return;
    setServerError('');
    const found = validateJobForm(form);
    setAttempted(true);
    if (Object.keys(found).length > 0) {
      setFocusTick((n) => n + 1);
      return;
    }
    setSubmitting(true);
    try {
      const result = await onSubmit(toJobPayload(form));
      setSaved({ result });
    } catch (err) {
      setServerError(serverErrorMessage(err));
      setFocusTick((n) => n + 1);
    } finally {
      setSubmitting(false);
    }
  };

  const draftWithAi = async () => {
    if (!form.title.trim()) {
      setAiNote('Enter a job title first, then draft with AI.');
      return;
    }
    // The draft endpoint requires a target role; fall back to the title like the API does on create.
    const targetRole = form.targetRole.trim() || form.title.trim();
    setAiLoading(true);
    setAiNote('Drafting with AI...');
    try {
      const draft = await api.post('/hiring-agent/posts/draft', {
        title: form.title.trim(),
        targetRole,
        jobType: form.jobType,
        experienceLevel: form.experienceLevel || null,
        location: form.location || null,
        notes: null,
      });
      if (!draft) throw new Error('AI drafting is unavailable right now.');
      setForm((prev) => ({
        ...prev,
        description: draft.description || prev.description,
        requirements: draft.requirements || prev.requirements,
        benefits: draft.benefits || prev.benefits,
      }));
      setAiNote(draft.suggestedSkills?.length
        ? `AI draft applied. Suggested skills: ${draft.suggestedSkills.join(', ')}`
        : 'AI draft applied.');
    } catch (err) {
      setAiNote(err?.message || 'AI drafting is unavailable right now.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className={styles.layout}>
      <form className={styles.form} onSubmit={handleSubmit} noValidate aria-label="Job posting">
        {showSummary && (
          <div
            ref={summaryRef}
            className={styles.summary}
            role="alert"
            tabIndex={-1}
            data-testid="error-summary"
          >
            <h2 className={styles.summaryTitle}>
              {errorEntries.length > 0 ? 'Fix the following before saving' : 'Could not save'}
            </h2>
            <ul className={styles.summaryList}>
              {errorEntries.map(([key, text]) => (
                <li key={key}>
                  <button type="button" className={styles.summaryLink} onClick={() => focusField(key)}>
                    {text}
                  </button>
                </li>
              ))}
              {serverError ? <li>{serverError}</li> : null}
            </ul>
          </div>
        )}

        <section className={styles.section} aria-labelledby="job-section-basics">
          <h2 id="job-section-basics" className={styles.sectionTitle}>Basics</h2>
          <div className={`${styles.row} ${styles.row2}`}>
            <Field id="job-title" label="Job title (required)" error={errors.title}>
              <input className={styles.input} value={form.title} onChange={set('title')} required />
            </Field>
            <div className={styles.aiBar}>
              <Button type="button" variant="secondary" disabled={aiLoading || submitting} onClick={draftWithAi}>
                {aiLoading ? 'Drafting...' : '✨ Draft with AI'}
              </Button>
              {aiNote && <p className={styles.aiNote}>{aiNote}</p>}
            </div>
          </div>
          <div className={`${styles.row} ${styles.row2}`}>
            <Field id="job-target-role" label="Target role">
              <input className={styles.input} value={form.targetRole} onChange={set('targetRole')} placeholder="e.g. Backend Developer" />
            </Field>
            <Field id="job-location" label="Location">
              <input className={styles.input} value={form.location} onChange={set('location')} placeholder="e.g. Cebu City" />
            </Field>
          </div>
          <div className={`${styles.row} ${styles.row3}`}>
            <Field id="job-salary" label="Salary range">
              <input className={styles.input} value={form.salaryRange} onChange={set('salaryRange')} placeholder="e.g. ₱60,000 - ₱90,000" />
            </Field>
            <Field id="job-type" label="Job type">
              <select className={styles.select} value={form.jobType} onChange={set('jobType')}>
                <option>Full-time</option>
                <option>Part-time</option>
                <option>Contract</option>
                <option>Side-hustle</option>
              </select>
            </Field>
            <Field id="job-level" label="Experience level">
              <select className={styles.select} value={form.experienceLevel} onChange={set('experienceLevel')}>
                <option value="">Any</option>
                {experienceLevels.map((level) => <option key={level}>{level}</option>)}
              </select>
            </Field>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="job-section-details">
          <h2 id="job-section-details" className={styles.sectionTitle}>Role details</h2>
          <Field id="job-description" label="Description">
            <textarea className={styles.textarea} value={form.description} onChange={set('description')} placeholder="What does the role involve?" />
          </Field>
          <Field id="job-requirements" label="Requirements (one per line)">
            <textarea className={styles.textarea} value={form.requirements} onChange={set('requirements')} placeholder={'5+ years of experience\nFamiliarity with .NET'} />
          </Field>
          <Field id="job-benefits" label="Benefits (one per line)">
            <textarea className={styles.textarea} value={form.benefits} onChange={set('benefits')} placeholder={'HMO\n13th month pay'} />
          </Field>
        </section>

        <section className={styles.section} aria-labelledby="job-section-publishing">
          <h2 id="job-section-publishing" className={styles.sectionTitle}>Publishing</h2>
          <div className={`${styles.row} ${styles.row2}`}>
            <Field id="job-expires" label="Applications close (optional)">
              <input type="date" className={styles.input} value={form.expiresAt} onChange={set('expiresAt')} />
            </Field>
            <Field id="job-logo" label="Company logo URL (optional)" error={errors.companyLogoUrl}>
              <input className={styles.input} value={form.companyLogoUrl} onChange={set('companyLogoUrl')} placeholder="https://..." />
            </Field>
          </div>
          <div className={`${styles.row} ${styles.row2}`}>
            <label className={styles.check}>
              <input type="checkbox" checked={form.isRemote} onChange={set('isRemote')} />
              Remote-friendly
            </label>
            <label className={styles.check}>
              <input type="checkbox" checked={form.isActive} onChange={set('isActive')} />
              Accepting applications
            </label>
          </div>
        </section>

        {cooling ? <p className={styles.cooldown} role="status">{cooldownMessage}</p> : null}
        <div className={styles.actions}>
          <Button type="submit" variant="primary" disabled={submitting || cooling}>
            {submitting ? 'Saving...' : submitLabel || 'Save job posting'}
          </Button>
        </div>
      </form>

      <div className={styles.previewWrap}>
        <JobPreview form={form} />
      </div>

      <Modal
        open={blocked}
        onClose={stay}
        title="Discard unsaved changes?"
        footer={(
          <>
            <Button variant="ghost" onClick={stay}>Keep editing</Button>
            <Button variant="primary" onClick={proceed}>Leave without saving</Button>
          </>
        )}
      >
        <p>You have unsaved changes to this job posting. If you leave now they will be lost.</p>
      </Modal>
    </div>
  );
}
