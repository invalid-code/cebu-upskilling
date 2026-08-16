import { useEffect, useState } from 'react';
import { BarChart3, BriefcaseBusiness, UserCheck, Users } from 'lucide-react';
import Panel from '../components/ui/Panel';
import Tag from '../components/ui/Tag';
import EmptyState from '../components/shared/EmptyState';
import StatCard from '../components/shared/StatCard';
import BarList from '../components/shared/BarList';
import { api } from '../api/client';

const styles = {
  heading: { display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 18, marginBottom: 28 },
  eyebrow: { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, color: 'var(--coral)', marginBottom: 12 },
  h1: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(2rem, 4vw, 3.3rem)' },
  date: { fontSize: 13, color: 'var(--muted)', margin: 0 },
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 18 },
  section: { marginTop: 28 },
  sectionTitle: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, margin: '0 0 16px' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 650 },
  th: { textAlign: 'left', color: 'var(--muted)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 12px 10px 0' },
  td: { borderTop: '1px solid var(--line)', padding: '14px 12px 14px 0', fontSize: 13, verticalAlign: 'top' },
  title: { fontWeight: 700 },
  courseList: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  muted: { color: 'var(--muted)' },
  charts: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 18 },
  loading: { textAlign: 'center', padding: 45, color: 'var(--muted)', fontSize: 13 },
  error: { color: 'var(--coral)', margin: 0 },
};

export default function BusinessDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/stats/business')
      .then(setStats)
      .catch((err) => setError(err.message || 'Unable to load business dashboard.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={styles.loading}>Loading business dashboard...</div>;
  if (error) return <Panel><EmptyState title="Business dashboard unavailable" description={error} /></Panel>;

  const postings = stats?.jobPostings || [];
  const skills = stats?.skillDemand || [];
  const today = new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date());

  return (
    <div className="view-enter">
      <div style={styles.heading}>
        <div>
          <div style={styles.eyebrow}>Employer insights</div>
          <h1 style={styles.h1}>Business Dashboard</h1>
        </div>
        <p style={styles.date}>{today}</p>
      </div>

      <Panel>
        <div style={styles.statGrid}>
          <StatCard value={stats.company.jobPostings} label="job postings" icon={BriefcaseBusiness} />
          <StatCard value={stats.company.recruiters} label="recruiters at company" icon={Users} />
          <StatCard value={stats.talentPool.totalLearners} label="learners in talent pool" icon={UserCheck} />
          <StatCard value={stats.talentPool.avgSkillLevel.toFixed(1)} label="avg. skill level" icon={BarChart3} />
        </div>
      </Panel>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Your job postings</h2>
        <Panel>
          {postings.length === 0 ? <EmptyState title="No job postings yet" description="Post a role to start tracking your hiring demand." /> : (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead><tr><th style={styles.th}>Title</th><th style={styles.th}>Required courses</th><th style={styles.th}>Technical level</th><th style={styles.th}>Mode</th></tr></thead>
                <tbody>{postings.map((post) => {
                  const courses = post.requiredCourses || [];
                  return <tr key={post.postId}>
                    <td style={styles.td}><div style={styles.title}>{post.title}</div>{post.description && <div style={{ ...styles.muted, marginTop: 4 }}>{post.description}</div>}</td>
                    <td style={styles.td}><div style={styles.courseList}>{courses.length ? courses.map((course) => <Tag key={course.courseId}>{course.name}</Tag>) : <span style={styles.muted}>None</span>}</div></td>
                    <td style={styles.td}>{courses.length ? `${Math.max(...courses.map((course) => course.technicalLevel))} hours` : '—'}</td>
                    <td style={styles.td}>{courses.length ? courses.map((course) => course.mode).filter((mode, i, all) => all.indexOf(mode) === i).join(', ') : '—'}</td>
                  </tr>;
                })}</tbody>
              </table>
            </div>
          )}
        </Panel>
      </section>

      <section style={{ ...styles.section, ...styles.charts }}>
        <Panel><BarList title="Skills in demand" items={skills.map((skill) => ({ label: skill.skillName, value: skill.requiredForRoles, sublabel: `Demand: ${skill.requiredForRoles} roles · Avg. required level ${skill.avgRequiredLevel}`, color: 'var(--coral)' }))} /></Panel>
        <Panel><BarList title="Learner coverage per skill" items={skills.map((skill) => ({ label: skill.skillName, value: skill.learnerCount, sublabel: skill.avgLearnerLevel == null ? 'No learners tracked yet' : `${skill.learnerCount} learners · Avg. level ${skill.avgLearnerLevel}` }))} /></Panel>
      </section>
    </div>
  );
}
