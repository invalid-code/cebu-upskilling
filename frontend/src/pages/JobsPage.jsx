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
  pager: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
    marginTop: 24,
  },
  pagerInfo: {
    fontSize: 12,
    color: 'var(--muted)',
  },
  pagerButton: {
    minHeight: 34,
    padding: '6px 14px',
  },
};

const tabOptions = [
  { key: 'all', label: 'All roles' },
  { key: 'corporate', label: 'Corporate & Full-Time' },
  { key: 'sme', label: 'Side Hustles & Local SME' },
];

const tabToJobType = {
  all: '',
  corporate: 'Full-time',
  sme: 'Part-time',
};

const jobTypes = ['Full-time', 'Part-time', 'Contract', 'Side-hustle'];

function parsePost(post) {
  const jobType = post.jobType || 'Full-time';
  const isSme = jobType !== 'Full-time';
  return {
    id: post.postId,
    title: post.title,
    company: post.companyName || 'Unknown',
    targetRole: post.targetRole || post.title,
    location: post.location || '',
    salaryRange: post.salaryRange || '',
    jobType,
    experienceLevel: post.experienceLevel || '',
    requirements: post.requirements || '',
    benefits: post.benefits || '',
    isRemote: !!post.isRemote,
    expiresAt: post.expiresAt || null,
    isActive: post.isActive,
    companyLogoUrl: post.companyLogoUrl || '',
    createdAt: post.createdAt || null,
    kind: isSme ? 'sme' : 'corporate',
    kindLabel: isSme ? 'Side Hustle & Local SME' : 'Corporate & Full-Time',
  };
}

function buildQuery({ tab, search, jobType, location, isRemote, page, pageSize }) {
  const params = new URLSearchParams();
  const type = tabToJobType[tab] || jobType;
  if (type) params.set('jobType', type);
  if (search.trim()) params.set('search', search.trim());
  if (location) params.set('location', location);
  if (isRemote) params.set('isRemote', 'true');
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  return params.toString();
}

export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(9);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [jobType, setJobType] = useState('');
  const [location, setLocation] = useState('');
  const [isRemote, setIsRemote] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    const query = buildQuery({ tab: activeTab, search, jobType, location, isRemote, page, pageSize });
    api.get(`/posts?${query}`, { signal: controller.signal })
      .then((data) => {
        const items = (data?.items || []).map(parsePost);
        setJobs(items);
        setTotal(data?.total || 0);
        setError('');
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message || 'Could not load jobs');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [activeTab, search, jobType, location, isRemote, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const changeTab = (key) => {
    setActiveTab(key);
    setPage(1);
  };

  const applyFilter = (setter, value) => {
    setter(value);
    setPage(1);
  };

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

      <Tabs tabs={tabOptions} active={activeTab} onChange={changeTab} />

      <div style={styles.toolbar}>
        <input
          className="field"
          style={{ ...styles.field, minWidth: 230 }}
          placeholder="Search roles, skills, or locations"
          value={search}
          onChange={(e) => applyFilter(setSearch, e.target.value)}
        />
        <select
          className="field"
          style={styles.field}
          value={jobType}
          onChange={(e) => applyFilter(setJobType, e.target.value)}
          disabled={activeTab !== 'all'}
        >
          <option value="">Any type</option>
          {jobTypes.map((type) => (
            <option key={type}>{type}</option>
          ))}
        </select>
        <select className="field" style={styles.field} value={location} onChange={(e) => applyFilter(setLocation, e.target.value)}>
          <option value="">Any location</option>
          <option>Cebu City</option>
          <option>Mandaue</option>
          <option>Lapu-Lapu</option>
          <option>Remote</option>
        </select>
        <label className="field" style={{ ...styles.field, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={isRemote}
            onChange={(e) => applyFilter(setIsRemote, e.target.checked)}
          />
          Remote only
        </label>
      </div>

      {loading ? (
        <div style={styles.loading}>Loading jobs...</div>
      ) : (
        <div style={styles.grid}>
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}

      {!loading && jobs.length === 0 && (
        <div style={styles.empty}>
          {error ? "Couldn't load jobs. Check back later." : 'No jobs match your search.'}
        </div>
      )}

      {!loading && jobs.length > 0 && (
        <div style={styles.pager}>
          <Button
            variant="ghost"
            style={styles.pagerButton}
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span style={styles.pagerInfo}>
            Page {page} of {totalPages} · {total} job{total === 1 ? '' : 's'}
          </span>
          <Button
            variant="ghost"
            style={styles.pagerButton}
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}