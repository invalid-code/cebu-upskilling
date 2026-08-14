import Button from '../components/ui/Button';
import Panel from '../components/ui/Panel';
import Tag from '../components/ui/Tag';
import EmptyState from '../components/shared/EmptyState';
import TargetRoleCard from '../components/shared/TargetRoleCard';
import SkillGapItem from '../components/shared/SkillGapItem';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useApplications } from '../context/ApplicationsContext';
import { api } from '../api/client';
import { useState, useEffect } from 'react';

const targetRoles = [
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'Data Analyst',
  'Data Scientist',
  'UI/UX Designer',
  'DevOps Engineer',
  'Quality Assurance',
  'Project Manager',
  'Other',
];

const styles = {
  heading: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'end',
    gap: 22,
    marginBottom: 28,
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
    fontSize: 'clamp(2rem, 4vw, 3.3rem)',
  },
  subtitle: {
    color: 'var(--muted)',
    margin: '8px 0 0',
    maxWidth: 450,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(12, 1fr)',
    gap: 16,
  },
  col12: { gridColumn: '1 / -1' },
  col7: { gridColumn: 'span 7' },
  col5: { gridColumn: 'span 5' },
  sectionTitle: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    margin: '30px 0 15px',
  },
  sectionH3: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 19,
  },
  scaleRow: {
    display: 'flex',
    gap: 7,
    flexWrap: 'wrap',
  },
  radioGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  radioOption: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 12px',
    borderRadius: 10,
    border: '1px solid var(--line)',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: 13,
    color: 'var(--ink)',
    transition: 'background 0.15s, border-color 0.15s',
  },
  radioOptionSelected: {
    background: 'var(--teal-soft)',
    borderColor: 'var(--teal)',
  },
  radioInput: {
    accentColor: 'var(--teal)',
    width: 16,
    height: 16,
    flexShrink: 0,
  },
  saveRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  roleTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '5px 10px',
    borderRadius: 999,
    background: 'var(--teal-soft)',
    color: 'var(--teal)',
    fontSize: 12,
    fontWeight: 700,
  },
};

export default function SkillsPage() {
  const { showToast } = useToast();
  const { user, setUser } = useAuth();
  const { applications } = useApplications();
  const hasApplied = applications.length > 0;
  const [selectedRole, setSelectedRole] = useState(user?.targetRole || '');
  const [saving, setSaving] = useState(false);
  const [skillGaps, setSkillGaps] = useState([]);
  const [skillGapsLoading, setSkillGapsLoading] = useState(true);
  const [address, setAddress] = useState(user?.address || '');
  const [remoteFriendly, setRemoteFriendly] = useState(user?.remoteFriendly ?? true);
  const hasRole = user?.targetRole != null && user.targetRole !== '';

  const getProfileStats = () => {
    if (skillGaps.length === 0) return { completeness: null, topGap: null };
    const totalRequired = skillGaps.reduce((s, g) => s + g.requiredLevel, 0);
    const totalCurrent = skillGaps.reduce((s, g) => s + g.currentLevel, 0);
    const completeness = totalRequired > 0 ? Math.round((totalCurrent / totalRequired) * 100) : 0;
    const topGap = skillGaps.find((g) => g.gap > 0);
    return { completeness, topGap: topGap?.skillName || null };
  };

  useEffect(() => {
    if (!hasRole || !hasApplied) {
      setSkillGaps([]);
      setSkillGapsLoading(false);
      return;
    }
    const controller = new AbortController();
    api.get('/skillgaps', { signal: controller.signal })
      .then((data) => setSkillGaps(data || []))
      .catch(() => setSkillGaps([]))
      .finally(() => setSkillGapsLoading(false));
    return () => controller.abort();
  }, [hasRole, hasApplied]);

  const handleSelect = (role) => {
    setSelectedRole(role);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('http://localhost:5179/api/auth/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ targetRole: selectedRole, address, remoteFriendly }),
      });
      if (!res.ok) throw new Error('Failed to save');
      const updatedUser = await res.json();
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      showToast('Target role saved');
    } catch {
      showToast('Failed to save target role');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="view-enter">
      <div style={styles.heading}>
        <div>
          <div style={styles.eyebrow}>Your evidence</div>
          <h1 style={styles.h1}>Skill profile</h1>
          <p style={styles.subtitle}>
            Self-declared skills are useful. Verified skills travel further.
          </p>
        </div>
        <Button variant="primary" onClick={() => showToast('Assessment flow opened')}>
          Assess a skill
        </Button>
      </div>

      <div style={styles.grid}>
        <Panel style={styles.col5}>
          {hasRole ? (
            <TargetRoleCard
              targetRole={user.targetRole}
              address={user.address}
              remoteFriendly={user.remoteFriendly}
              profileCompleteness={getProfileStats().completeness}
              topGap={getProfileStats().topGap}
            />
          ) : (
            <>
              <div style={styles.eyebrow}>Target role</div>
              <div style={styles.radioGroup}>
                {targetRoles.map((role) => (
                  <label
                    key={role}
                    style={{
                      ...styles.radioOption,
                      ...(selectedRole === role ? styles.radioOptionSelected : {}),
                    }}
                  >
                    <input
                      type="radio"
                      name="targetRole"
                      value={role}
                      checked={selectedRole === role}
                      onChange={() => handleSelect(role)}
                      style={styles.radioInput}
                    />
                    {role}
                  </label>
                ))}
              </div>
              <div style={{ marginTop: 12 }}>
                <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 123 Main St"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--line)',
                    fontSize: 13,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={remoteFriendly}
                  onChange={(e) => setRemoteFriendly(e.target.checked)}
                  style={{ accentColor: 'var(--teal)', width: 16, height: 16 }}
                />
                <span style={{ fontSize: 13 }}>Remote friendly</span>
              </div>
              <div style={styles.saveRow}>
                <Button
                  variant="primary"
                  disabled={!selectedRole || saving}
                  onClick={handleSave}
                >
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </>
          )}
        </Panel>

        <Panel style={styles.col7}>
          <div style={{ ...styles.sectionTitle, margin: '0 0 12px' }}>
            <h3 style={styles.sectionH3}>Proficiency scale</h3>
            <Tag>Exact team standard</Tag>
          </div>
          <div style={styles.scaleRow}>
            <Tag variant="coral">1 · No Knowledge</Tag>
            <Tag>2 · Beginner</Tag>
            <Tag>3 · Intermediate</Tag>
            <Tag>4 · Advanced</Tag>
            <Tag variant="good">5 · Expert</Tag>
          </div>
        </Panel>

        <Panel style={styles.col12}>
          <div style={{ ...styles.sectionTitle, margin: '0 0 12px' }}>
            <h3 style={styles.sectionH3}>Assessed skills</h3>
            <span style={{ color: 'var(--muted)', fontSize: 12 }}>Verified skills have a check</span>
          </div>
          {skillGapsLoading ? (
            <div style={{ textAlign: 'center', padding: 45, color: 'var(--muted)', fontSize: 13 }}>
              Loading skills...
            </div>
          ) : skillGaps.length === 0 ? (
            <EmptyState
              title={!hasApplied
                ? 'Apply for a job to see required skills'
                : hasRole ? 'No assessed skills yet' : 'Set a target role to see required skills'}
              description={!hasApplied
                ? 'Required skills appear once you apply for a role.'
                : hasRole
                  ? 'Take an assessment to verify your skills.'
                  : 'Choose a target role to compare your skills against.'}
            />
          ) : (
            skillGaps.map((gap) => (
              <SkillGapItem
                key={gap.skillId}
                name={gap.skillName}
                subtitle={`Required ${gap.requiredLevel} · Current ${gap.currentLevel}`}
                percent={gap.requiredLevel > 0 ? Math.round((gap.currentLevel / gap.requiredLevel) * 100) : 0}
                gapLabel={gap.gap === 0 ? 'Ready' : `Gap ${gap.gap}`}
                verified={gap.verified}
              />
            ))
          )}
        </Panel>
      </div>
    </div>
  );
}
