import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BarChart3, BriefcaseBusiness, UserCheck, Users } from 'lucide-react';
import Button from '../components/ui/Button';
import Panel from '../components/ui/Panel';
import EmptyState from '../components/shared/EmptyState';
import StatCard from '../components/shared/StatCard';
import { api } from '../api/client';

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
  },
  statGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: 18,
  },
  loading: {
    textAlign: 'center',
    padding: 45,
    color: 'var(--muted)',
    fontSize: 13,
  },
  section: {
    marginTop: 22,
  },
  sectionHead: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 12,
    margin: '0 0 12px',
  },
  sectionTitle: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 19,
    margin: 0,
  },
  viewAll: {
    color: 'var(--teal)',
    fontWeight: 700,
    fontSize: 13,
    textDecoration: 'none',
    whiteSpace: 'nowrap',
  },
  postingRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    padding: '12px 0',
    borderTop: '1px solid var(--line)',
  },
  postingRowFirst: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    padding: '12px 0',
  },
  postingTitle: {
    fontWeight: 700,
    fontSize: 14,
    color: 'var(--ink)',
    textDecoration: 'none',
  },
  postingMeta: {
    color: 'var(--muted)',
    fontSize: 12,
    margin: '3px 0 0',
  },
  statusActive: {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: 'var(--teal)',
    whiteSpace: 'nowrap',
  },
  statusInactive: {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: 'var(--muted)',
    whiteSpace: 'nowrap',
  },
};

export default function EmployerOverviewPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  useEffect(() => {
    api.get('/stats/business')
      .then(setStats)
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="view-enter">
      <div style={styles.heading}>
        <div>
          <div style={styles.eyebrow}>{today} · Employer</div>
          <h1 style={styles.h1}>Welcome back.</h1>
          <p style={styles.subtitle}>
            Manage your hiring demand and track the talent pool in Cebu.
          </p>
        </div>
        <Button variant="primary" onClick={() => navigate('/business-dashboard')}>
          View business dashboard
        </Button>
      </div>

      {loading ? (
        <div style={styles.loading}>Loading business summary...</div>
      ) : error ? (
        <Panel>
          <EmptyState
            title="No company profile yet"
            description="Complete your company profile to build trust with candidates, then start posting jobs."
          >
            <Button variant="primary" onClick={() => navigate('/company-profile')}>
              Set up your company
            </Button>
          </EmptyState>
        </Panel>
      ) : (
        <>
          <Panel>
            <div style={styles.statGrid}>
              <StatCard value={stats.company.jobPostings} label="job postings" icon={BriefcaseBusiness} />
              <StatCard value={stats.company.recruiters} label="recruiters at company" icon={Users} />
              <StatCard value={stats.talentPool.totalLearners} label="learners in talent pool" icon={UserCheck} />
              <StatCard value={stats.talentPool.avgSkillLevel.toFixed(1)} label="avg. skill level" icon={BarChart3} />
            </div>
          </Panel>
          <section style={styles.section} aria-label="Your job postings">
            <div style={styles.sectionHead}>
              <h2 style={styles.sectionTitle}>Your job postings</h2>
              {(stats.jobPostings?.length || 0) > 0 && <Link to="/business-dashboard" style={styles.viewAll}>View all →</Link>}
            </div>
            <Panel>
              {(stats.jobPostings?.length || 0) === 0 ? (
                <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13 }}>
                  No postings yet. <Link to="/post-job" style={{ color: 'var(--teal)', fontWeight: 700, textDecoration: 'none' }}>Post a job →</Link>
                </p>
              ) : (
                <div>
                  {stats.jobPostings.slice(0, 3).map((post, index) => (
                    <div key={post.postId} style={index === 0 ? styles.postingRowFirst : styles.postingRow}>
                      <div>
                        <Link to={`/edit-job/${post.postId}`} style={styles.postingTitle}>{post.title}</Link>
                        <p style={styles.postingMeta}>{[post.jobType, post.location].filter(Boolean).join(' · ') || '—'}</p>
                      </div>
                      <span style={post.isActive ? styles.statusActive : styles.statusInactive}>{post.isActive ? 'Active' : 'Inactive'}</span>
                    </div>
                  ))}
                  {stats.jobPostings.length > 3 && (
                    <p style={{ margin: '10px 0 0', color: 'var(--muted)', fontSize: 12 }}>+{stats.jobPostings.length - 3} more in the business dashboard</p>
                  )}
                </div>
              )}
            </Panel>
          </section>
        </>
      )}
    </div>
  );
}