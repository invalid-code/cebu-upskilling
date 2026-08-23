import { useState, useEffect } from 'react';
import Button from '../components/ui/Button';
import Panel from '../components/ui/Panel';
import Tag from '../components/ui/Tag';
import EmptyState from '../components/shared/EmptyState';
import TargetRoleCard from '../components/shared/TargetRoleCard';
import SkillGapItem from '../components/shared/SkillGapItem';
import Skeleton, { SkeletonStatus } from '../components/ui/Skeleton';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useApplications } from '../context/ApplicationsContext';
import { api } from '../api/client';
import { ChevronDown, Building2 } from 'lucide-react';

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
  group: {
    border: '1px solid var(--line)',
    borderRadius: 'var(--radius-lg)',
    background: 'var(--surface)',
    marginBottom: 12,
  },
  groupHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '16px 20px',
    cursor: 'pointer',
  },
  groupIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    display: 'grid',
    placeItems: 'center',
    background: 'var(--teal-soft)',
    color: 'var(--teal)',
    flexShrink: 0,
  },
  groupMeta: {
    flex: 1,
    minWidth: 0,
  },
  groupRole: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 15,
    fontWeight: 700,
    color: 'var(--ink)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  groupCompany: {
    fontSize: 12,
    color: 'var(--muted)',
    marginTop: 2,
  },
  groupScore: {
    display: 'grid',
    placeItems: 'center',
    textAlign: 'center',
    flexShrink: 0,
  },
  groupScoreValue: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 18,
    fontWeight: 700,
    lineHeight: 1,
  },
  groupScoreLabel: {
    fontSize: 10,
    color: 'var(--muted)',
    marginTop: 3,
  },
  chevron: {
    color: 'var(--muted)',
    transition: 'transform 0.15s',
    flexShrink: 0,
  },
  groupBody: {
    padding: '4px 20px 16px',
  },
  fallbackNote: {
    fontSize: 12,
    color: 'var(--muted)',
    margin: '-2px 0 12px',
  },
};

export default function SkillsPage() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const { applications } = useApplications();
  const hasApplied = applications.length > 0;
  const [gapGroups, setGapGroups] = useState([]);
  const [skillGapsLoading, setSkillGapsLoading] = useState(true);
  const [expandedKey, setExpandedKey] = useState(null);
  const groupKey = (group) => (group.postId != null ? `post-${group.postId}` : `role-${group.role}`);
  const primaryGroup = gapGroups.find((g) => g.postId == null) || gapGroups[0];

  const profileTargetRole = user?.targetRole?.trim() || '';
  const appliedTargetRole = applications.find((a) => a.targetRole?.trim())?.targetRole?.trim() || '';
  const resolvedTargetRole = profileTargetRole || appliedTargetRole || primaryGroup?.role || null;
  const hasRole = resolvedTargetRole != null && resolvedTargetRole !== '';

  const shouldLoad = hasApplied || hasRole;

  const getProfileStats = () => {
    if (!primaryGroup || primaryGroup.gaps.length === 0) return { completeness: null, topGap: null };
    const totalRequired = primaryGroup.gaps.reduce((s, g) => s + g.requiredLevel, 0);
    const totalCurrent = primaryGroup.gaps.reduce((s, g) => s + g.currentLevel, 0);
    const completeness = totalRequired > 0 ? Math.round((totalCurrent / totalRequired) * 100) : 0;
    const topGap = primaryGroup.gaps.find((g) => g.gap > 0);
    return { completeness, topGap: topGap?.skillName || null };
  };

  useEffect(() => {
    if (!shouldLoad) {
      setGapGroups([]);
      setSkillGapsLoading(false);
      return;
    }
    const controller = new AbortController();
    api.get('/skillgaps/groups', { signal: controller.signal })
      .then((data) => {
        const groups = data || [];
        setGapGroups(groups);
        setExpandedKey((current) => current ?? (groups[0] ? groupKey(groups[0]) : null));
      })
      .catch(() => setGapGroups([]))
      .finally(() => setSkillGapsLoading(false));
    return () => controller.abort();
  }, [shouldLoad]);

  const toggleGroup = (key) => {
    setExpandedKey((current) => (current === key ? null : key));
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
              targetRole={resolvedTargetRole}
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
            <SkeletonStatus label="Loading skills...">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 14, marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <Skeleton height={14} width="38%" />
                    <Skeleton height={22} width={70} radius={11} />
                  </div>
                  <Skeleton height={10} width="100%" radius={5} />
                </div>
              ))}
            </SkeletonStatus>
          ) : gapGroups.length === 0 ? (
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
            gapGroups.map((group) => {
              const key = groupKey(group);
              const isExpanded = expandedKey === key;
              const scoreColor = group.matchPercent >= 80 ? 'var(--good)' : group.matchPercent >= 50 ? 'var(--teal)' : 'var(--coral)';
              return (
                <div key={key} style={styles.group}>
                  <div style={styles.groupHeader} onClick={() => toggleGroup(key)}>
                    <div style={styles.groupIcon}>
                      <Building2 size={20} />
                    </div>
                    <div style={styles.groupMeta}>
                      <div style={styles.groupRole}>{group.role}</div>
                      <div style={styles.groupCompany}>
                        {group.companyName ? `${group.companyName} · job applied` : 'Your target role'}
                      </div>
                    </div>
                    <div style={styles.groupScore}>
                      <div style={{ ...styles.groupScoreValue, color: scoreColor }}>{group.matchPercent}%</div>
                      <div style={styles.groupScoreLabel}>match</div>
                    </div>
                    <ChevronDown size={18} style={{ ...styles.chevron, transform: isExpanded ? 'rotate(180deg)' : 'none' }} />
                  </div>
                  {isExpanded && (
                    <div style={styles.groupBody}>
                      {group.postId != null && (
                        <div style={styles.fallbackNote}>
                          Gap for {group.role} required by {group.companyName}. Expand to see each required skill.
                        </div>
                      )}
                      {group.gaps.map((gap) => (
                        <SkillGapItem
                          key={gap.skillId}
                          name={gap.skillName}
                          subtitle={`Required ${gap.requiredLevel} · Current ${gap.currentLevel}`}
                          percent={gap.requiredLevel > 0 ? Math.round((gap.currentLevel / gap.requiredLevel) * 100) : 0}
                          gapLabel={gap.gap === 0 ? 'Ready' : `Gap ${gap.gap}`}
                          verified={gap.verified}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </Panel>
      </div>
    </div>
  );
}