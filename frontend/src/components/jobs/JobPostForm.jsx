import { useState } from 'react';
import Button from '../ui/Button';
import { ErrorBanner, FieldError } from '../ui/ErrorState';

const styles = {
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  row: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 14,
  },
  row3: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 14,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--muted)',
  },
  input: {
    background: 'var(--surface2)',
    border: '1px solid var(--line)',
    borderRadius: 10,
    minHeight: 42,
    padding: '9px 12px',
    color: 'var(--ink)',
    fontSize: 14,
  },
  textarea: {
    background: 'var(--surface2)',
    border: '1px solid var(--line)',
    borderRadius: 10,
    padding: '10px 12px',
    color: 'var(--ink)',
    fontSize: 14,
    fontFamily: 'inherit',
    minHeight: 110,
    resize: 'vertical',
  },
  check: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
    fontWeight: 700,
    paddingTop: 22,
  },
  actions: {
    display: 'flex',
    gap: 10,
    justifyContent: 'flex-end',
  },
  error: {
    color: 'var(--coral)',
    fontSize: 13,
    margin: 0,
  },
};

const experienceLevels = ['Entry', 'Junior', 'Mid', 'Senior', 'Lead'];

export default function JobPostForm({ initial, onSubmit, submitting, error, submitLabel }) {
  const [form, setForm] = useState(() => ({
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
    expiresAt: initial?.expiresAt ? initial.expiresAt.slice(0, 10) : '',
    companyLogoUrl: initial?.companyLogoUrl || '',
    isActive: initial?.isActive ?? true,
  }));
  const [fieldError, setFieldError] = useState('');

  const set = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
    if (fieldError) setFieldError('');
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.title.trim()) {
      setFieldError('Job title is required — learners need it to find your role');
      return;
    }
    if (form.companyLogoUrl && !/^https?:\/\/.+/i.test(form.companyLogoUrl.trim())) {
      setFieldError('Logo URL must start with http:// or https://');
      return;
    }
    setFieldError('');
    const payload = {
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
      expiresAt: form.expiresAt ? new Date(`${form.expiresAt}T00:00:00`).toISOString() : null,
      companyLogoUrl: form.companyLogoUrl.trim(),
      isActive: form.isActive,
    };
    onSubmit(payload);
  };

  return (
    <form style={styles.form} onSubmit={handleSubmit} noValidate>
      {fieldError && <FieldError>{fieldError}</FieldError>}
      <div style={styles.field}>
        <label style={styles.label} htmlFor="job-title">Job title *</label>
        <input id="job-title" style={{ ...styles.input, borderColor: fieldError && !form.title.trim() ? 'var(--danger)' : 'var(--line)', background: fieldError && !form.title.trim() ? 'var(--danger-soft)' : 'var(--surface2)' }} value={form.title} onChange={set('title')} required aria-invalid={!!(fieldError && !form.title.trim())} />
      </div>

      <div style={styles.field}>
        <label style={styles.label} htmlFor="job-description">Description</label>
        <textarea id="job-description" style={styles.textarea} value={form.description} onChange={set('description')} placeholder="What does the role involve?" />
      </div>

      <div style={styles.row}>
        <div style={styles.field}>
          <label style={styles.label} htmlFor="job-target-role">Target role</label>
          <input id="job-target-role" style={styles.input} value={form.targetRole} onChange={set('targetRole')} placeholder="e.g. Backend Developer" />
        </div>
        <div style={styles.field}>
          <label style={styles.label} htmlFor="job-location">Location</label>
          <input id="job-location" style={styles.input} value={form.location} onChange={set('location')} placeholder="e.g. Cebu City" />
        </div>
      </div>

      <div style={styles.row3}>
        <div style={styles.field}>
          <label style={styles.label} htmlFor="job-salary">Salary range</label>
          <input id="job-salary" style={styles.input} value={form.salaryRange} onChange={set('salaryRange')} placeholder="e.g. ₱60,000 - ₱90,000" />
        </div>
        <div style={styles.field}>
          <label style={styles.label} htmlFor="job-type">Job type</label>
          <select id="job-type" style={styles.input} value={form.jobType} onChange={set('jobType')}>
            <option>Full-time</option>
            <option>Part-time</option>
            <option>Contract</option>
            <option>Side-hustle</option>
          </select>
        </div>
        <div style={styles.field}>
          <label style={styles.label} htmlFor="job-level">Experience level</label>
          <select id="job-level" style={styles.input} value={form.experienceLevel} onChange={set('experienceLevel')}>
            <option value="">Any</option>
            {experienceLevels.map((level) => <option key={level}>{level}</option>)}
          </select>
        </div>
      </div>

      <div style={styles.field}>
        <label style={styles.label} htmlFor="job-requirements">Requirements (one per line)</label>
        <textarea id="job-requirements" style={styles.textarea} value={form.requirements} onChange={set('requirements')} placeholder={'5+ years of experience\nFamiliarity with .NET\n...'} />
      </div>

      <div style={styles.field}>
        <label style={styles.label} htmlFor="job-benefits">Benefits (one per line)</label>
        <textarea id="job-benefits" style={styles.textarea} value={form.benefits} onChange={set('benefits')} placeholder={'HMO\n13th month pay\n...'} />
      </div>

      <div style={styles.row}>
        <div style={styles.field}>
          <label style={styles.label} htmlFor="job-expires">Applications close (optional)</label>
          <input id="job-expires" type="date" style={styles.input} value={form.expiresAt} onChange={set('expiresAt')} />
        </div>
        <div style={styles.field}>
          <label style={styles.label} htmlFor="job-logo">Company logo URL (optional)</label>
          <input id="job-logo" style={styles.input} value={form.companyLogoUrl} onChange={set('companyLogoUrl')} placeholder="https://..." />
        </div>
      </div>

      <div style={styles.row}>
        <label style={styles.check}>
          <input type="checkbox" checked={form.isRemote} onChange={set('isRemote')} />
          Remote-friendly
        </label>
        <label style={styles.check}>
          <input type="checkbox" checked={form.isActive} onChange={set('isActive')} />
          Accepting applications
        </label>
      </div>

      {error && <ErrorBanner title="Couldn’t save job" description={error} />}
      {fieldError && !error && <FieldError>{fieldError}</FieldError>}

      <div style={styles.actions}>
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? 'Saving...' : submitLabel || 'Save job posting'}
        </Button>
      </div>
    </form>
  );
}