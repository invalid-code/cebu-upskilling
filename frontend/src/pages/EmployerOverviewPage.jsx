import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
            description="Connect a company to your account to start posting jobs and tracking hiring demand."
          >
            <Button variant="primary" onClick={() => navigate('/business-dashboard')}>
              Set up your company
            </Button>
          </EmptyState>
        </Panel>
      ) : (
        <Panel>
          <div style={styles.statGrid}>
            <StatCard value={stats.company.jobPostings} label="job postings" icon={BriefcaseBusiness} />
            <StatCard value={stats.company.recruiters} label="recruiters at company" icon={Users} />
            <StatCard value={stats.talentPool.totalLearners} label="learners in talent pool" icon={UserCheck} />
            <StatCard value={stats.talentPool.avgSkillLevel.toFixed(1)} label="avg. skill level" icon={BarChart3} />
          </div>
        </Panel>
      )}
    </div>
  );
}