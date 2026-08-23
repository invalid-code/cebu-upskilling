import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Panel from '../components/ui/Panel';
import Button from '../components/ui/Button';
import CompanyAvatar from '../components/shared/CompanyAvatar';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201+'];

const styles = {
  heading: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'end',
    gap: 22,
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  eyebrow: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    fontWeight: 700,
    color: 'var(--coral)',
    marginBottom: 12,
  },
  h1: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)',
    margin: 0,
  },
  subtitle: {
    color: 'var(--muted)',
    margin: '8px 0 0',
  },
  heroRow: {
    display: 'flex',
    gap: 18,
    alignItems: 'center',
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 14,
  },
  fullWidth: {
    gridColumn: '1 / -1',
  },
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--muted)',
    margin: '0 0 6px',
  },
  field: {
    width: '100%',
    background: 'var(--surface)',
    border: '1px solid var(--line)',
    borderRadius: 10,
    minHeight: 42,
    padding: '9px 12px',
    color: 'var(--ink)',
    fontSize: 14,
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    background: 'var(--surface)',
    border: '1px solid var(--line)',
    borderRadius: 10,
    padding: '9px 12px',
    color: 'var(--ink)',
    fontSize: 14,
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    resize: 'vertical',
  },
  hint: {
    fontSize: 12,
    color: 'var(--muted)',
    marginTop: 4,
  },
  actions: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    marginTop: 20,
    flexWrap: 'wrap',
  },
  logoButtonLabel: {
    border: '1px dashed var(--line)',
    borderRadius: 10,
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    color: 'var(--teal)',
  },
  loading: {
    textAlign: 'center',
    padding: 45,
    color: 'var(--muted)',
    fontSize: 13,
  },
};

export default function CompanyProfileEditPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [form, setForm] = useState(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.companyId) {
      setError('Your account is not linked to a company yet.');
      setLoading(false);
      return;
    }
    setLoading(true);
    api.get(`/companies/${user.companyId}`)
      .then((data) => {
        setForm({
          name: data?.name || '',
          description: data?.description || '',
          industry: data?.industry || '',
          website: data?.website || '',
          location: data?.location || '',
          companySize: data?.companySize || '',
        });
        setLogoUrl(data?.logoUrl || '');
      })
      .catch((err) => setError(err.message || 'Could not load your company profile'))
      .finally(() => setLoading(false));
  }, [user?.companyId]);

  const update = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {};
      for (const key of Object.keys(form)) {
        payload[key] = form[key] === '' ? null : form[key];
      }
      const updated = await api.put('/companies/me', payload);
      setForm({
        name: updated.name || '',
        description: updated.description || '',
        industry: updated.industry || '',
        website: updated.website || '',
        location: updated.location || '',
        companySize: updated.companySize || '',
      });
      showToast('Company profile saved');
    } catch (err) {
      showToast(err?.message || 'Could not save company profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingLogo(true);
    try {
      const res = await api.upload('/companies/me/logo', file);
      setLogoUrl(res?.logoUrl || '');
      showToast('Logo uploaded');
    } catch (err) {
      showToast(err?.message || 'Could not upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  if (loading) return <div style={styles.loading}>Loading company profile...</div>;
  if (error || !form) {
    return (
      <Panel>
        <p>{error || 'Company profile unavailable.'}</p>
      </Panel>
    );
  }

  return (
    <div className="view-enter">
      <div style={styles.heading}>
        <div>
          <div style={styles.eyebrow}>Employer</div>
          <h1 style={styles.h1}>Company profile</h1>
          <p style={styles.subtitle}>
            A complete profile builds trust with candidates and makes your postings stand out.
          </p>
        </div>
        {user?.companyId && (
          <Link to={`/companies/${user.companyId}`}>
            <Button variant="secondary">View public profile</Button>
          </Link>
        )}
      </div>

      <Panel>
        <div style={styles.heroRow}>
          <CompanyAvatar name={form.name} src={logoUrl} size={64} />
          <div>
            <label style={styles.logoButtonLabel}>
              {uploadingLogo ? 'Uploading...' : 'Upload logo'}
              <input
                type="file"
                accept=".png,.jpg,.jpeg,.webp"
                style={{ display: 'none' }}
                onChange={handleLogoFile}
              />
            </label>
            <p style={styles.hint}>PNG, JPG or WEBP up to 2 MB.</p>
          </div>
        </div>

        <div style={styles.grid}>
          <div style={styles.fullWidth}>
            <label style={styles.label} htmlFor="company-name">Company name</label>
            <input id="company-name" style={styles.field} value={form.name} onChange={update('name')} />
          </div>
          <div>
            <label style={styles.label} htmlFor="company-industry">Industry</label>
            <input id="company-industry" style={styles.field} placeholder="e.g. Food & Beverage" value={form.industry} onChange={update('industry')} />
          </div>
          <div>
            <label style={styles.label} htmlFor="company-size">Company size</label>
            <select id="company-size" style={styles.field} value={form.companySize} onChange={update('companySize')}>
              <option value="">Select size…</option>
              {COMPANY_SIZES.map((size) => (
                <option key={size} value={size}>{size} employees</option>
              ))}
            </select>
          </div>
          <div>
            <label style={styles.label} htmlFor="company-location">Location</label>
            <input id="company-location" style={styles.field} placeholder="e.g. Cebu City" value={form.location} onChange={update('location')} />
          </div>
          <div>
            <label style={styles.label} htmlFor="company-website">Website</label>
            <input id="company-website" style={styles.field} type="url" placeholder="https://…" value={form.website} onChange={update('website')} />
          </div>
          <div style={styles.fullWidth}>
            <label style={styles.label} htmlFor="company-description">About the company</label>
            <textarea
              id="company-description"
              style={{ ...styles.textarea, minHeight: 120 }}
              maxLength={2000}
              placeholder="Tell candidates what your business does and what it's like to work with you."
              value={form.description}
              onChange={update('description')}
            />
            <p style={styles.hint}>{form.description.length}/2000 characters</p>
          </div>
        </div>

        <div style={styles.actions}>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      </Panel>
    </div>
  );
}
