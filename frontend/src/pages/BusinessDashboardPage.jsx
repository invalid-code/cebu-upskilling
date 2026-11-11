import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, BriefcaseBusiness, Inbox, PlusCircle, UserCheck, Users } from 'lucide-react';
import Panel from '../components/ui/Panel';
import Tag from '../components/ui/Tag';
import EmptyState from '../components/shared/EmptyState';
import StatCard from '../components/shared/StatCard';
import BarList from '../components/shared/BarList';
import ErrorState from '../components/ui/ErrorState';
import Skeleton, { SkeletonStat, SkeletonStatus, SkeletonText } from '../components/ui/Skeleton';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import styles from './BusinessDashboardPage.module.css';

/** The demand request must answer within this window, otherwise the chart slot shows an error. */
export const DEMAND_TIMEOUT_MS = 10000;

/** Keeps only series entries that can actually be plotted; never invents points. */
function toDemandPoints(series) {
  if (!Array.isArray(series)) return [];
  return series.filter((point) => point
    && typeof point.skillName === 'string'
    && typeof point.requiredForRoles === 'number'
    && Number.isFinite(point.requiredForRoles));
}

function DemandChart({ points }) {
  const max = Math.max(...points.map((p) => p.requiredForRoles), 1);
  const ticks = [...new Set([0, Math.ceil(max / 2), max])];
  return (
    <section aria-label="Skills in demand" data-testid="demand-chart">
      <h3 className={styles.chartTitle}>Skills in demand</h3>
      <div className={styles.chart}>
        {points.map((p) => (
          <div key={p.skillName} className={styles.chartRow}>
            <span className={styles.chartLabel} title={p.skillName}>{p.skillName}</span>
            <div className={styles.chartTrack} role="img" aria-label={`${p.skillName}: ${p.requiredForRoles} roles`}>
              <div className={styles.chartBar} style={{ width: `${(p.requiredForRoles / max) * 100}%` }} />
              <span className={styles.chartValue}>{p.requiredForRoles}</span>
            </div>
          </div>
        ))}
        <div className={styles.axis} aria-hidden="true">
          {ticks.map((t) => <span key={t}>{t}</span>)}
        </div>
        <p className={styles.chartNote}>Number of roles requiring each skill.</p>
      </div>
    </section>
  );
}

function LoadingSkeleton() {
  return (
    <div className="view-enter">
      <SkeletonStatus label="Loading business dashboard...">
        <div className={styles.quickLinks}>
          <Skeleton height={44} width={130} radius={10} />
          <Skeleton height={44} width={148} radius={10} />
        </div>
        <Panel>
          <div className={styles.statGrid}>
            {Array.from({ length: 4 }, (_, i) => <SkeletonStat key={i} />)}
          </div>
        </Panel>
        <section className={styles.section}>
          <Skeleton height={22} width={190} radius={8} style={{ marginBottom: 16 }} />
          <Panel>
            <div className={styles.skeletonStack}>
              {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} height={44} width="100%" radius={10} />)}
            </div>
          </Panel>
        </section>
        <section className={`${styles.section} ${styles.charts}`}>
          <Panel><SkeletonText lines={5} lineHeight={12} gap={14} /></Panel>
          <Panel><SkeletonText lines={5} lineHeight={12} gap={14} lastWidth="45%" /></Panel>
        </section>
      </SkeletonStatus>
    </div>
  );
}

export default function BusinessDashboardPage() {
  const [stats, setStats] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState(null);
  const [retrying, setRetrying] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [retryKey, setRetryKey] = useState(0);
  const { showToast } = useToast();

  useEffect(() => {
    let active = true;
    const fail = (message) => {
      if (!active) return;
      active = false; // ignore any late response after failure/timeout
      setError(message || 'Unable to load business dashboard.');
      setStatus('error');
      setRetrying(false);
    };
    const timer = setTimeout(() => fail('The request timed out after 10 seconds.'), DEMAND_TIMEOUT_MS);

    api.get('/stats/business')
      .then((data) => {
        if (!active) return;
        active = false;
        clearTimeout(timer);
        setStats(data);
        setError(null);
        setStatus('ready');
        setRetrying(false);
      })
      .catch((err) => {
        clearTimeout(timer);
        fail(err?.message);
      });

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [retryKey]);

  const handleRetry = () => {
    setRetrying(true);
    setRetryKey((k) => k + 1);
  };

  const handleDelete = (post) => {
    if (deletingId) return;
    if (!confirm('Are you sure you want to delete this job posting?')) return;
    setDeletingId(post.postId);
    // NOTE: path is relative to the API base ("/api") — never prefix it with "/api".
    api.delete(`/posts/${post.postId}`)
      .then(() => {
        showToast('Job posting deleted', 'success');
        return api.get('/stats/business').then(setStats).catch(() => {});
      })
      .catch((err) => showToast(err.message || 'Failed to delete posting', 'error'))
      .finally(() => setDeletingId(null));
  };

  if (status === 'loading') return <LoadingSkeleton />;

  const postings = stats?.jobPostings || [];
  const demandPoints = toDemandPoints(stats?.skillDemand);
  const avgSkill = stats?.talentPool?.avgSkillLevel;
  const today = new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date());

  let chartArea;
  if (status === 'error') {
    chartArea = (
      <div className={styles.chartSlot}>
        <ErrorState title="Business dashboard unavailable" error={error} onRetry={handleRetry} pending={retrying} />
      </div>
    );
  } else if (demandPoints.length === 0) {
    chartArea = (
      <div className={styles.chartSlot}>
        <Panel>
          <EmptyState title="No skill demand yet" description="Demand appears once your job postings list required skills." />
        </Panel>
      </div>
    );
  } else {
    chartArea = (
      <>
        <Panel><DemandChart points={demandPoints} /></Panel>
        <Panel>
          <BarList
            title="Learner coverage per skill"
            items={demandPoints.map((skill) => ({
              label: skill.skillName,
              value: skill.learnerCount ?? 0,
              sublabel: skill.avgLearnerLevel == null ? 'No learners tracked yet' : `${skill.learnerCount} learners · Avg. level ${skill.avgLearnerLevel}`,
            }))}
          />
        </Panel>
      </>
    );
  }

  return (
    <div className={`view-enter ${styles.page}`}>
      <div className={styles.heading}>
        <div>
          <div className={styles.eyebrow}>Employer insights</div>
          <h1 className={styles.title}>Business Dashboard</h1>
        </div>
        <p className={styles.date}>{today}</p>
      </div>

      <div className={styles.quickLinks}>
        <Link to="/post-job" className={styles.quickLink}><PlusCircle size={15} aria-hidden="true" /> Post a job</Link>
        <Link to="/job-applications" className={styles.quickLink}><Inbox size={15} aria-hidden="true" /> Applications</Link>
      </div>

      {stats && (
        <>
          <Panel>
            <div className={styles.statGrid}>
              <StatCard value={stats.company?.jobPostings ?? '—'} label="job postings" icon={BriefcaseBusiness} />
              <StatCard value={stats.company?.recruiters ?? '—'} label="recruiters at company" icon={Users} />
              <StatCard value={stats.talentPool?.totalLearners ?? '—'} label="learners in talent pool" icon={UserCheck} />
              <StatCard value={typeof avgSkill === 'number' ? avgSkill.toFixed(1) : '—'} label="avg. skill level" icon={BarChart3} />
            </div>
          </Panel>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Your job postings</h2>
            <Panel>
              {postings.length === 0 ? <EmptyState title="No job postings yet" description="Post a role to start tracking your hiring demand." /> : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <caption className={styles.srOnly}>Your job postings</caption>
                    <thead><tr>
                      <th scope="col" className={styles.th}>Title</th>
                      <th scope="col" className={styles.th}>Job type</th>
                      <th scope="col" className={styles.th}>Location</th>
                      <th scope="col" className={styles.th}>Salary</th>
                      <th scope="col" className={styles.th}>Experience</th>
                      <th scope="col" className={styles.th}>Status</th>
                    </tr></thead>
                    <tbody>{postings.map((post) => (
                      <tr key={post.postId}>
                        <td className={styles.td}>
                          <div className={styles.postTitle}>{post.title}</div>
                          {post.description && <div className={styles.postDesc}>{post.description.slice(0, 80)}{post.description.length > 80 ? '...' : ''}</div>}
                          <div className={styles.postActions}>
                            <Link to={`/edit-job/${post.postId}`} className={styles.postingLink}>Edit posting</Link>
                            <button
                              type="button"
                              className={styles.deleteButton}
                              disabled={deletingId === post.postId}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(post);
                              }}
                            >
                              {deletingId === post.postId ? 'Deleting…' : 'Delete'}
                            </button>
                          </div>
                        </td>
                        <td className={styles.td}>{post.jobType || '—'}</td>
                        <td className={styles.td}>
                          {post.location || '—'}
                          {post.isRemote && <Tag>Remote</Tag>}
                        </td>
                        <td className={styles.td}>{post.salaryRange || '—'}</td>
                        <td className={styles.td}>{post.experienceLevel || '—'}</td>
                        <td className={styles.td}>{post.isActive ? <Tag>Active</Tag> : <span className={styles.muted}>Inactive</span>}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </Panel>
          </section>
        </>
      )}

      <section className={`${styles.section} ${styles.charts}`} aria-label="Skill demand">
        {chartArea}
      </section>
    </div>
  );
}
