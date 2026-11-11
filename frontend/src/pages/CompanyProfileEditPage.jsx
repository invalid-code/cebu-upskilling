import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Panel from '../components/ui/Panel';
import Button from '../components/ui/Button';
import Tag from '../components/ui/Tag';
import Field from '../components/ui/Field';
import Modal from '../components/ui/Modal';
import ErrorState from '../components/ui/ErrorState';
import CompanyAvatar from '../components/shared/CompanyAvatar';
import Skeleton, { SkeletonStatus } from '../components/ui/Skeleton';
import LiquidMeter from '../components/water/LiquidMeter';
import useDataState from '../hooks/useDataState';
import useUnsavedChangesPrompt from '../hooks/useUnsavedChangesPrompt';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import styles from './CompanyProfileEditPage.module.css';

const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201+'];
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const ALLOWED_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];

// Display order of fields; also the order of the error summary.
const FIELD_LABELS = {
  name: 'Company name',
  tagline: 'Tagline',
  industry: 'Industry',
  companySize: 'Company size',
  location: 'Location',
  website: 'Website',
  linkedInUrl: 'LinkedIn URL',
  facebookUrl: 'Facebook URL',
  description: 'About the company',
};

const FIELD_IDS = {
  name: 'company-name',
  tagline: 'company-tagline',
  industry: 'company-industry',
  companySize: 'company-size',
  location: 'company-location',
  website: 'company-website',
  linkedInUrl: 'company-linkedin',
  facebookUrl: 'company-facebook',
  description: 'company-description',
};

function toForm(data) {
  return {
    name: data?.name || '',
    tagline: data?.tagline || '',
    description: data?.description || '',
    industry: data?.industry || '',
    website: data?.website || '',
    linkedInUrl: data?.linkedInUrl || '',
    facebookUrl: data?.facebookUrl || '',
    location: data?.location || '',
    companySize: data?.companySize || '',
  };
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function validateField(field, value) {
  const trimmed = value.trim();
  if (field === 'name' && !trimmed) return 'Enter your company name';
  if ((field === 'website' || field === 'linkedInUrl' || field === 'facebookUrl') && trimmed && !isHttpUrl(trimmed)) {
    return 'Enter a full web address starting with http:// or https://';
  }
  return '';
}

function validateForm(form) {
  const errors = {};
  Object.keys(FIELD_LABELS).forEach((field) => {
    const message = validateField(field, form[field]);
    if (message) errors[field] = message;
  });
  return errors;
}

// Mirrors CompanyService.UploadImageAsync so bad files are rejected before upload.
function validateImageFile(file) {
  const dot = file.name ? file.name.lastIndexOf('.') : -1;
  const ext = dot >= 0 ? file.name.slice(dot).toLowerCase() : '';
  if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) return 'Image must be a PNG, JPG or WEBP file';
  if (file.size > MAX_IMAGE_BYTES) return 'Image must be 2 MB or smaller';
  return null;
}

function isDirty(form, baseline) {
  if (!form || !baseline) return false;
  return Object.keys(FIELD_LABELS).some((field) => form[field] !== baseline[field]);
}

function PageSkeleton() {
  return (
    <SkeletonStatus label="Loading company profile..." minHeight={560}>
      <div className={styles.skeletonLayout}>
        <Panel>
          <Skeleton height={24} width="35%" radius={8} style={{ marginBottom: 22 }} />
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 18 }}>
            <Skeleton height={64} width={64} radius="50%" />
            <div>
              <Skeleton height={44} width={130} radius={8} style={{ marginBottom: 8 }} />
              <Skeleton height={12} width={160} />
            </div>
          </div>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className={styles.skeletonBlock}>
              <Skeleton height={12} width={110} style={{ marginBottom: 8 }} />
              <Skeleton height={44} width="100%" radius={8} />
            </div>
          ))}
          <Skeleton height={44} width={160} radius={8} />
        </Panel>
        <Panel>
          <Skeleton height={120} width="100%" radius={8} style={{ marginBottom: 16 }} />
          <Skeleton height={64} width={64} radius="50%" style={{ marginBottom: 12 }} />
          <Skeleton height={20} width="50%" style={{ marginBottom: 10 }} />
          <Skeleton height={13} width="70%" />
        </Panel>
      </div>
    </SkeletonStatus>
  );
}

function ProfilePreview({ form, logoUrl, coverUrl }) {
  const metaParts = [
    form.industry,
    form.companySize ? `${form.companySize} employees` : '',
    form.location,
  ].filter(Boolean);
  const website = form.website.trim();
  const linkedIn = form.linkedInUrl.trim();
  const facebook = form.facebookUrl.trim();
  const safe = (url) => (isHttpUrl(url) ? url : undefined);

  return (
    <section aria-label="Public profile preview" data-testid="profile-preview">
      <Panel>
        <h2 className={styles.previewTitle}>Public profile preview</h2>
        <p className={styles.previewNote}>This is how candidates see your company. It updates as you type.</p>
        {coverUrl ? <img src={coverUrl} alt="" className={styles.previewCover} /> : null}
        <div className={styles.previewHero}>
          <CompanyAvatar name={form.name} src={logoUrl} size={64} />
          <div>
            <h3 className={styles.previewName}>
              {form.name.trim() || <span className={styles.previewPlaceholder}>Your company name</span>}
            </h3>
            {form.tagline.trim() ? <p className={styles.previewTagline}>{form.tagline}</p> : null}
            {metaParts.length > 0 ? <p className={styles.previewMeta}>{metaParts.join(' · ')}</p> : null}
          </div>
        </div>
        {(form.industry || form.companySize || form.location) && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            {form.industry && <Tag>{form.industry}</Tag>}
            {form.companySize && <Tag variant="sand">{form.companySize} employees</Tag>}
            {form.location && <Tag variant="sand">{form.location}</Tag>}
          </div>
        )}
        {(safe(website) || safe(linkedIn) || safe(facebook)) && (
          <p className={styles.previewLinks}>
            {safe(website) && (
              <a href={website} target="_blank" rel="noreferrer noopener">
                {website.replace(/^https?:\/\//, '')}
              </a>
            )}
            {safe(linkedIn) && (
              <a href={linkedIn} target="_blank" rel="noreferrer noopener">LinkedIn</a>
            )}
            {safe(facebook) && (
              <a href={facebook} target="_blank" rel="noreferrer noopener">Facebook</a>
            )}
          </p>
        )}
        {form.description.trim() ? (
          <p className={styles.previewBody}>{form.description}</p>
        ) : (
          <p className={`${styles.previewBody} ${styles.previewPlaceholder}`}>
            Your company description will appear here.
          </p>
        )}
      </Panel>
    </section>
  );
}

export default function CompanyProfileEditPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const companyId = user?.companyId;

  const { data, error: loadError, loading, reload } = useDataState(
    () => (companyId ? api.get(`/companies/${companyId}`) : Promise.resolve(null)),
    [companyId],
  );

  const [form, setForm] = useState(null);
  const [baseline, setBaseline] = useState(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [profileCompleteness, setProfileCompleteness] = useState(0);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const summaryRef = useRef(null);
  const [summaryFocusTick, setSummaryFocusTick] = useState(0);

  // Initialise the editable form once from the first successful load; later reloads never clobber edits.
  useEffect(() => {
    if (!data || form) return;
    const initial = toForm(data);
    setForm(initial);
    setBaseline(initial);
    setLogoUrl(data.logoUrl || '');
    setCoverUrl(data.coverImageUrl || '');
    setProfileCompleteness(data.profileCompleteness ?? 0);
  }, [data, form]);

  const dirty = isDirty(form, baseline);
  const { blocked, stay, proceed } = useUnsavedChangesPrompt(dirty);

  useEffect(() => {
    if (summaryFocusTick > 0 && summaryRef.current) summaryRef.current.focus();
  }, [summaryFocusTick]);

  const handleChange = (field) => (e) => {
    const { value } = e.target;
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear an inline error as soon as the value becomes valid.
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const message = validateField(field, value);
      if (message) return { ...prev, [field]: message };
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleSave = async (event) => {
    event?.preventDefault();
    setServerError('');
    const errors = validateForm(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setSummaryFocusTick((n) => n + 1);
      return;
    }
    setSaving(true);
    try {
      // Send values as-is: the backend treats '' (or whitespace) as "clear this field"
      // and only a missing/null key as "leave unchanged".
      const updated = await api.put('/companies/me', { ...form });
      const saved = toForm(updated);
      setForm(saved);
      setBaseline(saved);
      setLogoUrl(updated.logoUrl || logoUrl);
      setCoverUrl(updated.coverImageUrl || coverUrl);
      if (updated.profileCompleteness != null) setProfileCompleteness(updated.profileCompleteness);
      showToast('Company profile saved');
    } catch (err) {
      if (err?.status === 400) {
        // Keep every entered value; show the server's { error } message in the form summary.
        setServerError(err.message || 'The server rejected these changes');
        setSummaryFocusTick((n) => n + 1);
      } else {
        showToast(err?.message || 'Could not save company profile');
      }
    } finally {
      setSaving(false);
    }
  };

  // Uploads finish in the background (202): show an instant local preview,
  // then poll the profile until the server URL lands.
  const pollForImageUrl = async (kind, previousUrl, setUrl, doneMessage, previewUrl) => {
    if (!companyId) return false;
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await new Promise((resolve) => { setTimeout(resolve, 3000); });
      try {
        const latest = await api.get(`/companies/${companyId}`);
        const next = kind === 'logo' ? latest?.logoUrl : latest?.coverImageUrl;
        if (next && next !== previousUrl) {
          if (previewUrl && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(previewUrl);
          setUrl(next);
          showToast(doneMessage, 'success');
          return true;
        }
      } catch {
        continue;
      }
    }
    return false;
  };

  const previewLocalFile = (file, setUrl) => {
    if (typeof URL.createObjectURL !== 'function') return null;
    const preview = URL.createObjectURL(file);
    setUrl(preview);
    return preview;
  };

  const handleImageFile = (kind) => async (e) => {
    const isLogo = kind === 'logo';
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const validationError = validateImageFile(file);
    if (validationError) {
      showToast(validationError, 'error');
      return;
    }
    const currentUrl = isLogo ? logoUrl : coverUrl;
    const setUrl = isLogo ? setLogoUrl : setCoverUrl;
    const setUploading = isLogo ? setUploadingLogo : setUploadingCover;
    const noun = isLogo ? 'Logo' : 'Cover';
    const preview = previewLocalFile(file, setUrl);
    setUploading(true);
    try {
      // NOTE: use postForm, not api.upload — the endpoint accepts the upload (202)
      // and api.upload rejects any response without a `url` field.
      const body = new FormData();
      body.append('file', file);
      await api.postForm(isLogo ? '/companies/me/logo' : '/companies/me/cover', body);
      showToast(`${noun} uploading in the background…`);
      const landed = await pollForImageUrl(
        kind,
        currentUrl || preview,
        setUrl,
        isLogo ? 'Logo uploaded' : 'Cover image uploaded',
        preview,
      );
      if (!landed) {
        if (preview && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(preview);
        setUrl(currentUrl);
        showToast(`${noun} upload did not complete — please try again`, 'error');
      }
    } catch (err) {
      if (preview && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(preview);
      setUrl(currentUrl);
      showToast(err?.message || `Could not upload ${noun.toLowerCase()}`);
    } finally {
      setUploading(false);
    }
  };

  let body;
  if (!companyId) {
    body = <ErrorState title="Company profile unavailable" error="Your account is not linked to a company yet." />;
  } else if (!form && loading) {
    body = <PageSkeleton />;
  } else if (!form) {
    body = (
      <ErrorState
        title="We couldn’t load your company profile"
        error={loadError || 'Company profile unavailable.'}
        onRetry={reload}
        pending={loading}
      />
    );
  } else {
    const errorEntries = Object.keys(FIELD_LABELS).filter((field) => fieldErrors[field]);
    const showSummary = errorEntries.length > 0 || Boolean(serverError);
    body = (
      <div className={styles.layout}>
        <form onSubmit={handleSave} noValidate aria-label="Company profile form">
          <Panel>
            {showSummary && (
              <div ref={summaryRef} tabIndex={-1} role="alert" className={styles.summary}>
                <p className={styles.summaryTitle}>
                  {serverError ? 'We couldn’t save your changes' : 'Fix the following before saving'}
                </p>
                {serverError ? <p style={{ margin: 0 }}>{serverError}</p> : null}
                {errorEntries.length > 0 && (
                  <ul className={styles.summaryList}>
                    {errorEntries.map((field) => (
                      <li key={field}>
                        <a
                          href={`#${FIELD_IDS[field]}`}
                          onClick={(e) => {
                            e.preventDefault();
                            document.getElementById(FIELD_IDS[field])?.focus();
                          }}
                        >
                          {FIELD_LABELS[field]}: {fieldErrors[field]}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {profileCompleteness > 0 && (
              <div className={styles.completeness}>
                <LiquidMeter value={profileCompleteness} label="Profile completeness" variant="bar" tone={profileCompleteness === 100 ? 'good' : 'primary'} />
                <p className={styles.hint}>
                  {profileCompleteness === 100 ? 'Your profile is complete!' : 'Complete your profile to attract more candidates.'}
                </p>
              </div>
            )}

            <div className={styles.media}>
              <CompanyAvatar name={form.name} src={logoUrl} size={64} />
              <div>
                <label className={styles.uploadLabel}>
                  {uploadingLogo ? 'Uploading...' : 'Upload logo'}
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp"
                    className={styles.visuallyHidden}
                    onChange={handleImageFile('logo')}
                    aria-label="Upload logo"
                  />
                </label>
                <p className={styles.hint}>PNG, JPG or WEBP up to 2 MB.</p>
              </div>
              {coverUrl ? <img src={coverUrl} alt="Company cover" className={styles.coverThumb} /> : null}
              <div>
                <label className={styles.uploadLabel}>
                  {uploadingCover ? 'Uploading...' : 'Upload cover'}
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp"
                    className={styles.visuallyHidden}
                    onChange={handleImageFile('cover')}
                    aria-label="Upload cover"
                  />
                </label>
                <p className={styles.hint}>Cover PNG/JPG/WEBP up to 2 MB.</p>
              </div>
            </div>

            <div className={styles.grid}>
              <div className={styles.full}>
                <Field id={FIELD_IDS.name} label="Company name" error={fieldErrors.name}>
                  <input className={styles.control} value={form.name} onChange={handleChange('name')} />
                </Field>
              </div>
              <div className={styles.full}>
                <Field id={FIELD_IDS.tagline} label="Tagline" hint={`${form.tagline.length}/160 characters`} error={fieldErrors.tagline}>
                  <input className={styles.control} placeholder="e.g. Print your dreams" value={form.tagline} onChange={handleChange('tagline')} maxLength={160} />
                </Field>
              </div>
              <Field id={FIELD_IDS.industry} label="Industry" error={fieldErrors.industry}>
                <input className={styles.control} placeholder="e.g. Food & Beverage" value={form.industry} onChange={handleChange('industry')} />
              </Field>
              <Field id={FIELD_IDS.companySize} label="Company size" error={fieldErrors.companySize}>
                <select className={styles.control} value={form.companySize} onChange={handleChange('companySize')}>
                  <option value="">Select size…</option>
                  {COMPANY_SIZES.map((size) => (
                    <option key={size} value={size}>{size} employees</option>
                  ))}
                </select>
              </Field>
              <Field id={FIELD_IDS.location} label="Location" error={fieldErrors.location}>
                <input className={styles.control} placeholder="e.g. Cebu City" value={form.location} onChange={handleChange('location')} />
              </Field>
              <Field id={FIELD_IDS.website} label="Website" error={fieldErrors.website}>
                <input className={styles.control} type="url" placeholder="https://…" value={form.website} onChange={handleChange('website')} />
              </Field>
              <Field id={FIELD_IDS.linkedInUrl} label="LinkedIn URL" error={fieldErrors.linkedInUrl}>
                <input className={styles.control} type="url" placeholder="https://linkedin.com/company/…" value={form.linkedInUrl} onChange={handleChange('linkedInUrl')} />
              </Field>
              <Field id={FIELD_IDS.facebookUrl} label="Facebook URL" error={fieldErrors.facebookUrl}>
                <input className={styles.control} type="url" placeholder="https://facebook.com/…" value={form.facebookUrl} onChange={handleChange('facebookUrl')} />
              </Field>
              <div className={styles.full}>
                <Field id={FIELD_IDS.description} label="About the company" hint={`${form.description.length}/2000 characters`} error={fieldErrors.description}>
                  <textarea
                    className={`${styles.control} ${styles.textarea}`}
                    maxLength={2000}
                    placeholder="Tell candidates what your business does and what it's like to work with you."
                    value={form.description}
                    onChange={handleChange('description')}
                  />
                </Field>
              </div>
            </div>

            <div className={styles.actions}>
              <Button variant="primary" type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save changes'}
              </Button>
              {dirty && <span className={styles.hint} role="status">You have unsaved changes</span>}
            </div>
          </Panel>
        </form>

        <div className={styles.previewCol}>
          <ProfilePreview form={form} logoUrl={logoUrl} coverUrl={coverUrl} />
        </div>
      </div>
    );
  }

  return (
    <div className={`view-enter ${styles.page}`}>
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>Employer</p>
          <h1 className={styles.title}>Company profile</h1>
          <p className={styles.subtitle}>
            A complete profile builds trust with candidates and makes your postings stand out.
          </p>
        </div>
        {companyId && (
          <Link to={`/companies/${companyId}`}>
            <Button variant="secondary">View public profile</Button>
          </Link>
        )}
      </div>

      {body}

      <Modal
        open={blocked}
        onClose={stay}
        eyebrow="Unsaved changes"
        title="Leave without saving?"
        footer={(
          <>
            <Button variant="ghost" onClick={stay}>Stay on this page</Button>
            <Button variant="primary" onClick={proceed}>Leave and discard</Button>
          </>
        )}
      >
        <p className={styles.leaveText}>
          Your edits to the company profile haven’t been saved. If you leave now they will be lost.
        </p>
      </Modal>
    </div>
  );
}
