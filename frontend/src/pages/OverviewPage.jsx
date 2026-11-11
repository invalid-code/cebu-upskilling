import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, BookOpen, Check, Clock, Send } from 'lucide-react';
import Button from '../components/ui/Button';
import DataBoundView from '../components/ui/DataBoundView';
import Skeleton, { SkeletonCard, SkeletonStat } from '../components/ui/Skeleton';
import EmptyState from '../components/shared/EmptyState';
import StatCard from '../components/shared/StatCard';
import CourseCard from '../components/shared/CourseCard';
import LiquidMeter from '../components/water/LiquidMeter';
import WaterCanvas from '../components/water/WaterCanvas';
import WaveDivider from '../components/water/WaveDivider';
import useDataState from '../hooks/useDataState';
import { useAuth } from '../context/AuthContext';
import { useApplications } from '../context/ApplicationsContext';
import { api } from '../api/client';
import styles from './OverviewPage.module.css';

const OPEN_STATUS_LABELS = { applied: 'Applied', review: 'In review', interview: 'Interview' };
const MAX_TIMELINE_ENTRIES = 3;

const percentOf = (current, required) => (required > 0 ? Math.round((current / required) * 100) : undefined);

const formatDate = (iso) => {
  const date = iso ? new Date(iso) : null;
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;
};

const hours = (value) => (Number.isFinite(value) ? `${value}h` : '—');
const count = (value) => (Number.isFinite(value) ? value : '—');

/** Open applications, newest first, capped for the "This week" timeline. */
export function selectOpenApplications(applications) {
  const time = (a) => {
    const t = a?.appliedAt ? new Date(a.appliedAt).getTime() : NaN;
    return Number.isNaN(t) ? -Infinity : t;
  };
  return (applications || [])
    .filter((a) => OPEN_STATUS_LABELS[a?.status || 'applied'])
    .sort((a, b) => time(b) - time(a))
    .slice(0, MAX_TIMELINE_ENTRIES);
}

function OverviewSkeleton() {
  return (
    <div className={styles.layout}>
      <div className={`${styles.next} ${styles.skelNext}`}><SkeletonCard minHeight="inherit" /></div>
      <div className={`${styles.region} ${styles.week} ${styles.skelWeek}`}>
        <div className={styles.regionBody}>
          <SkeletonStat />
          <SkeletonStat style={{ marginTop: 16 }} />
          <SkeletonStat style={{ marginTop: 16 }} />
        </div>
      </div>
      <div className={`${styles.region} ${styles.pathway} ${styles.skelPathway}`}>
        <div className={`${styles.regionBody} ${styles.skeletonStack}`}>
          <Skeleton height={20} width="40%" />
          <Skeleton height={14} width="100%" />
          <Skeleton height={14} width="100%" />
          <Skeleton height={14} width="100%" />
        </div>
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { applications, fetchApplications } = useApplications();

  const targetRole = user?.targetRole?.trim()
    || applications.find((a) => a.targetRole?.trim())?.targetRole?.trim()
    || '';

  const state = useDataState(
    async ({ signal }) => {
      const [courses, skillGroups, stats, recommendedAssessment] = await Promise.all([
        api.get('/courses', { signal }),
        targetRole ? api.get('/skillgaps', { signal }) : [],
        api.get('/stats/week', { signal }),
        targetRole
          ? Promise.resolve(api.get('/assessments/recommended', { signal })).catch(() => null)
          : null,
      ]);
      return { courses, skillGroups, stats, recommendedAssessment };
    },
    [targetRole],
  );

  // Retry re-requests the page data and the applications list.
  const boundState = {
    ...state,
    reload: () => {
      state.reload();
      fetchApplications?.(undefined, user, { force: true });
    },
  };

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className={`view-enter ${styles.page}`}>
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>{today} · Cebu City</p>
          <h1 className={styles.title}>Your dashboard</h1>
          {targetRole && (
            <p className={styles.subtitle}>You&apos;re building toward <strong>{targetRole}</strong>.</p>
          )}
        </div>
        <Button variant="primary" onClick={() => navigate('/skills')}>Update skills</Button>
      </div>

      <DataBoundView
        state={boundState}
        skeleton={<OverviewSkeleton />}
        loadingLabel="Loading your dashboard..."
        isEmpty={() => false}
      >
        {(data) => (
          <OverviewRegions
            data={data}
            targetRole={targetRole}
            applications={applications}
            navigate={navigate}
          />
        )}
      </DataBoundView>
    </div>
  );
}

function OverviewRegions({ data, targetRole, applications, navigate }) {
  const { courses, skillGroups, stats, recommendedAssessment } = data;

  // GET /api/skillgaps returns per-role groups; show the group for the target role, else the first.
  const gaps = useMemo(() => {
    if (!Array.isArray(skillGroups) || skillGroups.length === 0) return [];
    const match = targetRole
      ? skillGroups.find((g) => g?.role && g.role.toLowerCase() === targetRole.toLowerCase())
      : null;
    const group = match || skillGroups[0];
    return Array.isArray(group?.gaps) ? group.gaps : [];
  }, [skillGroups, targetRole]);

  const openGaps = gaps.filter((g) => g.gap > 0);
  const totalRequired = gaps.reduce((s, g) => s + g.requiredLevel, 0);
  const totalCurrent = gaps.reduce((s, g) => s + g.currentLevel, 0);
  const score = totalRequired > 0 ? Math.round((totalCurrent / totalRequired) * 100) : 0;

  const timeline = selectOpenApplications(applications);
  const recommended = (Array.isArray(courses) ? courses : []).slice(0, 3).map((c) => ({
    courseId: c.courseId,
    name: c.name,
    provider: c.genre?.name || 'Provider',
    mode: c.mode || 'Online',
    duration: c.technicalLevel ? `${c.technicalLevel} hours` : undefined,
    description: c.description,
  }));

  let nextMove;
  if (!targetRole) nextMove = 'No target role is set yet. Choose one to see your skill gaps.';
  else if (openGaps.length === 0) nextMove = `No skill gaps are open for ${targetRole}.`;
  else nextMove = `${openGaps.length} ${openGaps.length === 1 ? 'gap' : 'gaps'} left for ${targetRole}`;

  const assessed = gaps.filter((g) => g.currentLevel > 0).length;
  const dones = [
    Boolean(targetRole),
    gaps.length > 0 && assessed > 0,
    gaps.length > 0 && openGaps.length === 0,
    gaps.some((g) => g.verified),
    false,
  ];
  const currentStep = Math.min(dones.indexOf(false) + 1, dones.length);
  const topGapNames = [...openGaps].sort((a, b) => b.gap - a.gap).slice(0, 2).map((g) => g.skillName);
  const steps = [
    { title: 'Set your target role', desc: targetRole ? `${targetRole} · Cebu / Remote` : 'Choose a role to get started' },
    {
      title: 'Map your current skills',
      desc: gaps.length > 0
        ? `${assessed} of ${gaps.length} path skills have a current level`
        : 'Add your skills to your profile',
    },
    {
      title: 'Close the highest gaps',
      desc: topGapNames.length > 0 ? `Next: ${topGapNames.join(', ')}` : 'Your largest gaps appear here',
    },
    {
      title: 'Verify your progress',
      desc: recommendedAssessment?.skillName
        ? `Recommended assessment: ${recommendedAssessment.skillName}`
        : 'Take a proctored assessment',
    },
    { title: 'Get matched', desc: 'Discover opportunities that fit you' },
  ];

  const status = score >= 80 ? 'Qualified' : score >= 50 ? 'Almost there' : 'Getting started';

  return (
    <div className={styles.layout}>
      {/* ---- Next move ---- */}
      <section className={`${styles.region} ${styles.next}`} aria-labelledby="overview-next-move">
        <div className={styles.hero}>
          <WaterCanvas className={styles.heroWater} intensity={0.5} interactive />
          <h2 id="overview-next-move" className={styles.heroEyebrow}>Next move</h2>
          <p className={styles.heroHeadline}>{nextMove}</p>
          <p className={styles.heroProgress}>{`You're ${score}% of the way to your target role.`}</p>
          <p className={styles.heroHint}>
            {recommendedAssessment?.skillName
              ? `Complete the ${recommendedAssessment.skillName} assessment next. It is the fastest route to a stronger match.`
              : 'Take a skill assessment to see how close you are to your target role.'}
          </p>
          <Button variant="primary" onClick={() => navigate('/assessments')}>
            Continue pathway <ArrowUpRight size={14} aria-hidden="true" />
          </Button>
          <div className={styles.heroBase}><WaveDivider tone="surface" /></div>
        </div>
      </section>

      {/* ---- This week ---- */}
      <section className={`${styles.region} ${styles.week}`} aria-labelledby="overview-this-week">
        <div className={styles.regionBody}>
          <h2 id="overview-this-week" className={styles.regionTitle}>This week</h2>
          <div className={styles.statList}>
            <StatCard value={hours(stats?.learningTimeHours)} label="learning time" icon={Clock} />
            <StatCard value={count(stats?.coursesActive)} label="courses active" icon={BookOpen} />
            <StatCard value={count(stats?.jobsWorthApplying)} label="jobs worth applying" icon={Send} />
          </div>
          <h3 className={styles.subTitle}>Open applications</h3>
          {timeline.length === 0 ? (
            <p className={styles.muted}>You have no open applications.</p>
          ) : (
            <ol className={styles.timeline} aria-label="Open applications, newest first">
              {timeline.map((app) => {
                const date = formatDate(app.appliedAt);
                return (
                  <li key={app.id} className={styles.timelineItem}>
                    <p className={styles.timelineTitle}>{app.title}</p>
                    <p className={styles.timelineMeta}>
                      {app.company ? `${app.company} · ` : ''}
                      <span className={styles.timelineStatus}>{OPEN_STATUS_LABELS[app.status || 'applied']}</span>
                      {date ? ` · ${date}` : ''}
                    </p>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </section>

      {/* ---- Pathway ---- */}
      <section className={`${styles.region} ${styles.pathway}`} aria-labelledby="overview-pathway">
        <div className={styles.regionBody}>
          <h2 id="overview-pathway" className={styles.regionTitle}>Pathway</h2>

          <div className={styles.pathwayHeader}>
            <h3 className={styles.subTitle}>Pathway rail</h3>
            <span className={styles.badge}>{currentStep} of {steps.length} steps</span>
          </div>
          <ol className={styles.steps}>
            {steps.map((step, i) => {
              const num = i + 1;
              const done = num < currentStep;
              const current = num === currentStep;
              const stateClass = done ? styles.stepDone : current ? styles.stepCurrent : '';
              return (
                <li key={step.title} className={`${styles.step} ${stateClass}`} aria-current={current ? 'step' : undefined}>
                  <span className={styles.stepMark} aria-hidden="true">
                    {done ? <Check size={16} strokeWidth={3} /> : num}
                  </span>
                  <div>
                    <h4 className={styles.stepTitle}>
                      {step.title}
                      <span className={styles.srOnly}>{done ? ' (completed)' : current ? ' (current)' : ' (not started)'}</span>
                    </h4>
                    <p className={styles.stepDesc}>{step.desc}</p>
                  </div>
                </li>
              );
            })}
          </ol>

          <h3 className={styles.subTitle}>Current match</h3>
          {gaps.length === 0 ? (
            <EmptyState title="No score yet" description="Set a target role and add skills to generate your match score." />
          ) : (
            <div className={styles.matchBlock}>
              <div className={styles.matchText}>
                <p className={styles.matchStatus}>{status}</p>
                <p className={styles.matchDesc}>{`${score}% of required skill levels reached.`}</p>
              </div>
            </div>
          )}

          <h3 className={`${styles.subTitle} ${styles.sectionGap}`}>Your skill gaps</h3>
          {gaps.length === 0 ? (
            <EmptyState
              title={targetRole ? 'No skill gaps yet' : 'Set a target role to see your gaps'}
              description={targetRole
                ? 'Your profile is complete for this role.'
                : 'Choose a target role to compare your skills against.'}
            />
          ) : (
            <ul className={styles.skillList}>
              {gaps.map((gap) => (
                <li key={gap.skillId} className={styles.skillRow}>
                  <div>
                    <h4 className={styles.skillName}>{gap.skillName}</h4>
                    <small className={styles.skillMeta}>{`Required ${gap.requiredLevel} · Current ${gap.currentLevel}`}</small>
                  </div>
                  <LiquidMeter
                    className={styles.skillMeter}
                    label={gap.skillName}
                    value={percentOf(gap.currentLevel, gap.requiredLevel)}
                    tone={gap.gap === 0 ? 'good' : 'primary'}
                  />
                  <span className={gap.gap === 0 ? `${styles.gapTag} ${styles.gapTagReady}` : styles.gapTag}>
                    {gap.gap === 0 ? 'Ready' : `Gap ${gap.gap}`}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className={`${styles.linkRow} ${styles.sectionGap}`}>
            <h3 className={styles.subTitle}>Recommended for your path</h3>
            <button type="button" className={styles.linkButton} onClick={() => navigate('/courses')}>
              See all courses →
            </button>
          </div>
          {recommended.length === 0 ? (
            <EmptyState
              title="No courses available yet"
              description="Recommended courses will appear here once you add your skills and target role."
            />
          ) : (
            <div className={styles.courseGrid}>
              {recommended.map((course) => (
                <CourseCard key={`${course.name}|${course.provider}`} course={course} tagLabel="Skill builder" />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
