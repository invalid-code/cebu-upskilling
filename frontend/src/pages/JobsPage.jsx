import { useState } from 'react';
import Button from '../components/ui/Button';
import Tabs from '../components/ui/Tabs';
import JobCard from '../components/shared/JobCard';
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
    maxWidth: 62,
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
};

const tabOptions = [
  { key: 'all', label: 'All roles' },
  { key: 'corporate', label: 'Corporate & Full-Time' },
  { key: 'sme', label: 'Side Hustles & Local SME' },
];

const mockJobs = [
  {
    id: 1,
    kind: 'corporate',
    kindLabel: 'Corporate & Full-Time',
    title: 'Frontend Developer (React)',
    company: 'Serbisyo Digital',
    location: 'Cebu / Remote',
    salary: '₱45,000–₱60,000 / month',
    match: '96% Highly Qualified',
    skills: ['React', 'TypeScript'],
  },
  {
    id: 2,
    kind: 'sme',
    kindLabel: 'Side Hustle & Local SME',
    title: 'Landing Page Builder',
    company: 'Mango Apps',
    location: 'Remote / Cebu',
    salary: '₱12,000–₱18,000 / project',
    match: '82% Qualified',
    skills: ['HTML/CSS', 'Figma'],
  },
  {
    id: 3,
    kind: 'sme',
    kindLabel: 'Side Hustle & Local SME',
    title: 'Junior Web Assistant',
    company: 'Banilad Retail Co.',
    location: 'Cebu City',
    salary: '₱18,000–₱22,000 / month',
    match: '67% Qualified',
    skills: ['WordPress', 'Communication'],
  },
];

export default function JobsPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [schedule, setSchedule] = useState('');
  const [location, setLocation] = useState('');
  const { showToast } = useToast();

  const filteredJobs = mockJobs.filter((job) => {
    if (activeTab !== 'all' && job.kind !== activeTab) return false;
    if (search && !job.title.toLowerCase().includes(search.toLowerCase()) &&
        !job.company.toLowerCase().includes(search.toLowerCase())) return false;
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

      <div style={styles.grid}>
        {filteredJobs.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>

      {filteredJobs.length === 0 && (
        <div style={{ padding: 45, textAlign: 'center', border: '1px dashed var(--line)', borderRadius: 15, background: 'var(--surface)' }}>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>No jobs match your search.</p>
        </div>
      )}
    </div>
  );
}
