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
};

export default function SkillsPage() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const { applications } = useApplications();
  const hasApplied = applications.length > 0;
  const [skillGaps, setSkillGaps] = useState([]);
  const [skillGapsLoading, setSkillGapsLoading] = useState(true);
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
        <div style={{ display: 'flex', gap: 12 }}>
          <Button variant="primary" onClick={() => showToast('Assessment flow opened')}>
            Assess a skill
          </Button>
        </div>
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
              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, margin: '0 0 14px' }}>
                Choose a target role so we can show the skills you need, your match, and which
                assessments to take.
              </p>
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
