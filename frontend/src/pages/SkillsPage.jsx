import { useState } from 'react';
import { Building2, Check, ChevronDown } from 'lucide-react';
import Button from '../components/ui/Button';
import Tag from '../components/ui/Tag';
import DataBoundView from '../components/ui/DataBoundView';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/shared/EmptyState';
import TargetRoleCard from '../components/shared/TargetRoleCard';
import LiquidMeter from '../components/water/LiquidMeter';
import useDataState from '../hooks/useDataState';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useApplications } from '../context/ApplicationsContext';
import { api } from '../api/client';
import styles from './SkillsPage.module.css';

const groupKey = (group) => (group.postId != null ? `post-${group.postId}` : `role-${group.role}`);
const percentOf = (current, required) => (required > 0 ? Math.round((current / required) * 100) : undefined);

function SkillRow({ gap }) {
  const verified = Boolean(gap.verified);
  return (
    <li className={`${styles.skillRow} ${verified ? styles.skillSolid : styles.skillOutlined}`}>
      <div>
        <h4 className={styles.skillName}>
          {gap.skillName}
          {verified ? (
            <span className={`${styles.badge} ${styles.badgeVerified}`}>
              <Check size={12} strokeWidth={3} aria-hidden="true" />Verified
            </span>
          ) : (
            <span className={`${styles.badge} ${styles.badgeDeclared}`}>Declared</span>
          )}
        </h4>
        <small className={styles.skillMeta}>{`Required ${gap.requiredLevel} · Current ${gap.currentLevel}`}</small>
      </div>
      <LiquidMeter
        className={styles.skillMeter}
        label={`${gap.skillName} proficiency`}
        value={percentOf(gap.currentLevel, gap.requiredLevel)}
        tone={gap.gap === 0 ? 'good' : 'primary'}
      />
      <span className={gap.gap === 0 ? `${styles.gapTag} ${styles.gapTagReady}` : styles.gapTag}>
        {gap.gap === 0 ? 'Ready' : `Gap ${gap.gap}`}
      </span>
    </li>
  );
}

function SkillsSkeleton() {
  return (
    <>
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className={styles.skeletonGroup}>
          <div className={styles.skeletonRow}>
            <Skeleton height={14} width="38%" />
            <Skeleton height={22} width={70} radius={11} />
          </div>
          <Skeleton height={10} width="100%" radius={5} />
        </div>
      ))}
    </>
  );
}

export default function SkillsPage() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const { applications } = useApplications();
  const hasApplied = applications.length > 0;
  // undefined = default to the first group; null = everything collapsed.
  const [expandedKey, setExpandedKey] = useState(undefined);

  const profileTargetRole = user?.targetRole?.trim() || '';
  const appliedTargetRole = applications.find((a) => a.targetRole?.trim())?.targetRole?.trim() || '';

  const hasRoleInput = Boolean(profileTargetRole || appliedTargetRole);
  const shouldLoad = hasApplied || hasRoleInput;

  const state = useDataState(
    async ({ signal }) => (shouldLoad ? (await api.get('/skillgaps/groups', { signal })) || [] : []),
    [shouldLoad],
  );

  const groups = Array.isArray(state.data) ? state.data : [];
  const primaryGroup = groups.find((g) => g.postId == null) || groups[0];
  const resolvedTargetRole = profileTargetRole || appliedTargetRole || primaryGroup?.role || null;
  const hasRole = Boolean(resolvedTargetRole);

  const profileStats = (() => {
    if (!primaryGroup || primaryGroup.gaps.length === 0) return { completeness: null, topGap: null };
    const totalRequired = primaryGroup.gaps.reduce((s, g) => s + g.requiredLevel, 0);
    const totalCurrent = primaryGroup.gaps.reduce((s, g) => s + g.currentLevel, 0);
    const completeness = totalRequired > 0 ? Math.round((totalCurrent / totalRequired) * 100) : 0;
    const topGap = primaryGroup.gaps.find((g) => g.gap > 0);
    return { completeness, topGap: topGap?.skillName || null };
  })();

  const effectiveExpanded = expandedKey === undefined ? (groups[0] ? groupKey(groups[0]) : null) : expandedKey;
  const toggleGroup = (key) => setExpandedKey(effectiveExpanded === key ? null : key);

  const empty = {
    title: !hasApplied
      ? 'Apply for a job to see required skills'
      : hasRole ? 'No assessed skills yet' : 'Set a target role to see required skills',
    description: !hasApplied
      ? 'Required skills appear once you apply for a role.'
      : hasRole
        ? 'Take an assessment to verify your skills.'
        : 'Choose a target role to compare your skills against.',
  };

  return (
    <div className={`view-enter ${styles.page}`}>
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>Your evidence</p>
          <h1 className={styles.title}>Skill profile</h1>
          <p className={styles.subtitle}>Self-declared skills are useful. Verified skills travel further.</p>
        </div>
        <Button variant="primary" onClick={() => showToast('Assessment flow opened — pick a skill to verify', 'info')}>
          Assess a skill
        </Button>
      </div>

      <div className={styles.grid}>
        <section className={`${styles.panel} ${styles.col5}`}>
          {hasRole ? (
            <TargetRoleCard
              targetRole={resolvedTargetRole}
              address={user?.address}
              remoteFriendly={user?.remoteFriendly}
              profileCompleteness={profileStats.completeness}
              topGap={profileStats.topGap}
            />
          ) : (
            <>
              <p className={styles.eyebrow}>Target role</p>
              <p className={styles.prompt}>
                Choose a target role so we can show the skills you need, your match, and which
                assessments to take.
              </p>
            </>
          )}
        </section>

        <section className={`${styles.panel} ${styles.col7}`}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Proficiency scale</h2>
            <Tag>Exact team standard</Tag>
          </div>
          <div className={styles.scaleRow}>
            <Tag variant="coral">1 · No Knowledge</Tag>
            <Tag>2 · Beginner</Tag>
            <Tag>3 · Intermediate</Tag>
            <Tag>4 · Advanced</Tag>
            <Tag variant="good">5 · Expert</Tag>
          </div>
        </section>

        <section className={`${styles.panel} ${styles.col12}`}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Assessed skills</h2>
            <span className={styles.hint}>Verified skills are solid and labelled “Verified”; the rest are outlined and labelled “Declared”.</span>
          </div>
          {shouldLoad ? (
            <DataBoundView
              state={state}
              skeleton={<SkillsSkeleton />}
              loadingLabel="Loading skills..."
              empty={empty}
            >
              {(data) => data.map((group) => {
                const key = groupKey(group);
                const isExpanded = effectiveExpanded === key;
                const scoreClass = group.matchPercent >= 80 ? styles.scoreGood : group.matchPercent >= 50 ? styles.scoreMid : styles.scoreLow;
                return (
                  <div key={key} className={styles.group}>
                    <button
                      type="button"
                      className={styles.groupHeader}
                      aria-expanded={isExpanded}
                      onClick={() => toggleGroup(key)}
                    >
                      <span className={styles.groupIcon} aria-hidden="true"><Building2 size={20} /></span>
                      <span className={styles.groupMeta}>
                        <span className={styles.groupRole}>{group.role}</span>
                        <span className={styles.groupCompany}>
                          {group.companyName ? `${group.companyName} · job applied` : 'Your target role'}
                        </span>
                      </span>
                      <span className={styles.groupScore}>
                        <span className={`${styles.groupScoreValue} ${scoreClass}`}>{group.matchPercent}%</span>
                        <span className={styles.groupScoreLabel}>match</span>
                      </span>
                      <ChevronDown
                        size={18}
                        aria-hidden="true"
                        className={`${styles.chevron} ${isExpanded ? styles.chevronOpen : ''}`}
                      />
                    </button>
                    {isExpanded && (
                      <div className={styles.groupBody}>
                        {group.postId != null && (
                          <p className={styles.note}>
                            Gap for {group.role} required by {group.companyName}. Expand to see each required skill.
                          </p>
                        )}
                        <ul className={styles.skillList}>
                          {group.gaps.map((gap) => <SkillRow key={gap.skillId} gap={gap} />)}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </DataBoundView>
          ) : (
            <EmptyState {...empty} />
          )}
        </section>
      </div>
    </div>
  );
}
