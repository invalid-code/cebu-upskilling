import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, MapPin, Globe2, LockKeyhole, Save, FileText, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth, getDashboardPath } from '../context/AuthContext';
import Panel from '../components/ui/Panel';
import Button from '../components/ui/Button';
import { useToast } from '../context/ToastContext';
import { ErrorBanner } from '../components/ui/ErrorState';
import { api } from '../api/client';

const inputStyle = {
  width: '100%',
  minHeight: 44,
  border: '1px solid var(--line)',
  borderRadius: 10,
  background: 'var(--surface2)',
  color: 'var(--ink)',
  padding: '11px 13px',
  font: 'inherit',
  outline: 'none',
};

function Field({ label, value, onChange, readOnly = false, hint, name }) {
  return (
    <label style={{ display: 'grid', gap: 7, fontSize: 12, color: 'var(--muted)' }}>
      <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{label}</span>
      <input name={name} value={value || ''} onChange={onChange} readOnly={readOnly} style={{ ...inputStyle, opacity: readOnly ? 0.72 : 1 }} />
      {hint && <span style={{ fontSize: 11 }}>{hint}</span>}
    </label>
  );
}

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ targetRole: '', address: '', remoteFriendly: false });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

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
    <main style={{ display: 'grid', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button type="button" onClick={handleBack} aria-label="Go back" style={{ color: 'var(--muted)', display: 'grid', placeItems: 'center', background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}><ArrowLeft size={18} /></button>
        <div>
          <p style={{ margin: 0, color: 'var(--coral)', fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Account</p>
          <h1 style={{ margin: '5px 0 0', fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(28px, 4vw, 42px)', lineHeight: 1.05 }}>Your profile</h1>
        </div>
      </div>

      <section style={{ display: 'grid', gridTemplateColumns: 'minmax(230px, 0.75fr) minmax(0, 1.6fr)', gap: 18, alignItems: 'start' }}>
        <Panel style={{ background: 'var(--teal)', color: 'var(--surface)', minHeight: 245, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ width: 66, height: 66, borderRadius: '50%', background: 'var(--sand)', color: 'var(--teal)', display: 'grid', placeItems: 'center', fontSize: 22, fontWeight: 800, marginBottom: 24 }}>{initials || 'U'}</div>
            <h2 style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontSize: 25 }}>{fullName}</h2>
            <p style={{ margin: '7px 0 0', color: 'rgba(245,250,248,.72)', fontSize: 13 }}>{user?.emailAddress}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(245,250,248,.8)', fontSize: 12 }}><Check size={15} /> {user?.role || 'Learner'} account</div>
        </Panel>

        <Panel>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'start', marginBottom: 22 }}>
            <div><h2 style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontSize: 19 }}>Personal details</h2><p style={{ margin: '6px 0 0', color: 'var(--muted)', fontSize: 13 }}>Your identity details are managed by your account.</p></div>
            <LockKeyhole size={18} color="var(--muted)" aria-hidden="true" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
            <Field label="First name" value={user?.firstName} readOnly hint="Read-only" />
            <Field label="Last name" value={user?.lastName} readOnly hint="Read-only" />
            <Field label="Email address" value={user?.emailAddress} readOnly hint="Read-only" />
            <Field label="Account type" value={user?.role} readOnly hint="Read-only" />
          </div>
        </Panel>
      </section>

      {user?.resumeUrl && (
        <Panel>
          <div style={{ marginBottom: 16 }}><p style={{ margin: 0, color: 'var(--coral)', fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Resume</p><h2 style={{ margin: '6px 0 0', fontFamily: "'Space Grotesk', sans-serif", fontSize: 21 }}>Your resume</h2><p style={{ margin: '6px 0 0', color: 'var(--muted)', fontSize: 13 }}>View or share your uploaded resume.</p></div>
          <a href={user.resumeUrl} target="_blank" rel="noopener noreferrer" data-testid="resume-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 14px', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--surface2)', color: 'var(--teal)', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            <FileText size={16} /> View resume <ExternalLink size={14} />
          </a>
          <p style={{ margin: '10px 0 0', color: 'var(--muted)', fontSize: 12, wordBreak: 'break-all' }}>{user.resumeUrl}</p>
        </Panel>
      )}

      <Panel>
        <div style={{ marginBottom: 22 }}><p style={{ margin: 0, color: 'var(--coral)', fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Pathway preferences</p><h2 style={{ margin: '6px 0 0', fontFamily: "'Space Grotesk', sans-serif", fontSize: 21 }}>Shape the opportunities you see</h2><p style={{ margin: '6px 0 0', color: 'var(--muted)', fontSize: 13 }}>Keep these details current so recommendations feel relevant.</p></div>
        {saveError && <ErrorBanner title="Couldn’t save profile" description={saveError} onDismiss={() => setSaveError('')} />}
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
            <Field label="Target role" name="targetRole" value={form.targetRole} onChange={update('targetRole')} hint="The role you are working toward" />
            <Field label="Location" name="address" value={form.address} onChange={update('address')} hint="City, province, or neighborhood" />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, border: '1px solid var(--line)', borderRadius: 12, background: 'var(--surface2)', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.remoteFriendly} onChange={(event) => setForm((current) => ({ ...current, remoteFriendly: event.target.checked }))} />
            <span style={{ display: 'grid', gap: 3 }}><strong style={{ fontSize: 13, color: 'var(--ink)' }}><Globe2 size={15} style={{ verticalAlign: '-3px', marginRight: 7 }} />Open to remote work</strong><small style={{ color: 'var(--muted)', fontSize: 11 }}>Include remote-friendly roles in your recommendations.</small></span>
          </label>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 9 }}><Button type="button" variant="ghost" onClick={reset}>Reset</Button><Button type="submit" disabled={saving}>{saving ? 'Saving…' : <><Save size={15} /> Save changes</>}</Button></div>
        </form>
      </Panel>
      <p style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)', fontSize: 12, margin: 0 }}><MapPin size={15} /> Your profile powers your skill and job recommendations.</p>
    </main>
  );
}

