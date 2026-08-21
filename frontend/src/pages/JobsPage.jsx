import { useState, useEffect } from 'react';
import Button from '../components/ui/Button';
import Tabs from '../components/ui/Tabs';
import JobCard from '../components/shared/JobCard';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import { BellPlus } from 'lucide-react';

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
  toolbar: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 18,
  },
  field: {
    background: 'var(--surface)',
    border: '1px solid var(--line)',
    borderRadius: 10,
    minHeight: 42,
    padding: '9px 12px',
    color: 'var(--ink)',
    fontSize: 14,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 14,
  },
  loading: {
    textAlign: 'center',
    padding: 45,
    color: 'var(--muted)',
    fontSize: 13,
  },
  empty: {
    padding: 45,
    textAlign: 'center',
    border: '1px dashed var(--line)',
    borderRadius: 15,
    background: 'var(--surface)',
    color: 'var(--muted)',
    fontSize: 13,
  },
};

const tabOptions = [
  { key: 'all', label: 'All roles' },
  { key: 'corporate', label: 'Corporate & Full-Time' },
  { key: 'sme', label: 'Side Hustles & Local SME' },
];

function parsePost(post) {
  const description = post.description || '';
  const lines = description.split('\n').map((line) => line.trim());
  const job = {
    id: post.postId,
    title: post.title,
    company: post.company?.name || 'Unknown',
    targetRole: post.targetRole || post.title,
    location: '',
    salary: '',
    match: '',
    skills: [],
    requiredSkillLevels: [],
  };

  for (const line of lines) {
    if (!line) continue;
    const salaryMatch = line.match(/^(salary|rate):\s*(.*)$/i);
    if (salaryMatch) {
      job.salary = salaryMatch[2];
      continue;
    }
    const matchMatch = line.match(/^match:\s*(.*)$/i);
    if (matchMatch) {
      job.match = matchMatch[2];
      continue;
    }
    const skillsMatch = line.match(/^skills:\s*(.*)$/i);
    if (skillsMatch) {
      job.skills = skillsMatch[1].split(',').map((skill) => skill.trim()).filter(Boolean);
      continue;
    }
    if (!job.location) job.location = line;
  }

  // Employer-declared required skills (taxonomy with proficiency levels)
  // are the source of truth when present; fall back to description regex.
  if (Array.isArray(post.requiredSkills) && post.requiredSkills.length > 0) {
    job.skills = post.requiredSkills.map((skill) => skill.skillName);
    job.requiredSkillLevels = post.requiredSkills.map((skill) => ({
      name: skill.skillName,
      level: skill.requiredLevel,
    }));
  }

  const schedule = post.schedule || 'Full-time';
  job.schedule = schedule;

  const isRange = / - |–|—| to /i.test(job.salary);
  const isSme = /rate:|\/project/i.test(description) || (!isRange && !!job.salary) || schedule === 'Side-hustle';
  job.kind = isSme ? 'sme' : 'corporate';
  job.kindLabel = isSme ? 'Side Hustle & Local SME' : 'Corporate & Full-Time';
  return job;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [schedule, setSchedule] = useState('');
  const [location, setLocation] = useState('');
  const { showToast } = useToast();

  useEffect(() => {
    const controller = new AbortController();
    api.get('/posts', { signal: controller.signal })
      .then((data) => setJobs((data || []).map(parsePost)))
      .catch((err) => setError(err.message || 'Could not load jobs'))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const filteredJobs = jobs.filter((job) => {
    if (activeTab !== 'all' && job.kind !== activeTab) return false;
    if (search && !job.title.toLowerCase().includes(search.toLowerCase()) &&
        !job.company.toLowerCase().includes(search.toLowerCase()) &&
        !job.skills.some((s) => s.toLowerCase().includes(search.toLowerCase()))) return false;
    if (schedule && job.schedule !== schedule) return false;
    if (location && job.location && !job.location.toLowerCase().includes(location.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="view-enter">
      <div style={styles.heading}>
        <div>
          <div style={styles.eyebrow}>Skills to opportunity</div>
          <h1 style={styles.h1}>Find work that fits.</h1>
          <p style={styles.subtitle}>
            Corporate roles and local opportunities stay visible side by side.
          </p>
        </div>
        <Button variant="primary" onClick={() => showToast('Job alert saved')}>
          <BellPlus size={14} /> Save alert
        </Button>
      </div>

      <Tabs tabs={tabOptions} active={activeTab} onChange={setActiveTab} />

      <div style={styles.toolbar}>
        <input
          className="field"
          style={{ ...styles.field, minWidth: 230 }}
          placeholder="Search roles, skills, or locations"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="field" style={styles.field} value={schedule} onChange={(e) => setSchedule(e.target.value)}>
          <option value="">Any schedule</option>
          <option>Full-time</option>
          <option>Part-time</option>
          <option>Side-hustle</option>
        </select>
        <select className="field" style={styles.field} value={location} onChange={(e) => setLocation(e.target.value)}>
          <option value="">Any location</option>
          <option>Cebu City</option>
          <option>Mandaue</option>
          <option>Remote</option>
        </select>
      </div>

      {loading ? (
        <div style={styles.loading}>Loading jobs...</div>
      ) : (
        <div style={styles.grid}>
          {filteredJobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}

      {!loading && filteredJobs.length === 0 && (
        <div style={styles.empty}>
          {error ? `Couldn't load jobs. Check back later.` : 'No jobs match your search.'}
        </div>
      )}
    </div>
  );
}
