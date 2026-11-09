import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BellPlus } from 'lucide-react';
import Button from '../components/ui/Button';
import Tabs from '../components/ui/Tabs';
import JobCard from '../components/shared/JobCard';
import DataBoundView from '../components/ui/DataBoundView';
import { SkeletonCard } from '../components/ui/Skeleton';
import useDataState from '../hooks/useDataState';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import { summarizeError } from '../lib/formErrors';
import styles from './JobsPage.module.css';

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
const locations = ['Cebu City', 'Mandaue', 'Lapu-Lapu', 'Remote'];
const PAGE_SIZE = 9;
const MAX_SEARCH_LENGTH = 200;

/**
 * Reads filters from the URL. Unknown names are never read, and values outside the allowed options are
 * dropped, so a malformed link still renders a usable page with the remaining valid filters.
 */
export function parseFilters(searchParams) {
  const tabParam = searchParams.get('tab');
  const tab = tabOptions.some((t) => t.key === tabParam) ? tabParam : 'all';
  const jobTypeParam = searchParams.get('jobType');
  const jobType = jobTypes.includes(jobTypeParam) ? jobTypeParam : '';
  const locationParam = searchParams.get('location');
  const location = locations.includes(locationParam) ? locationParam : '';
  const isRemote = searchParams.get('isRemote') === 'true';
  const rawSearch = searchParams.get('search') || '';
  const search = rawSearch.slice(0, MAX_SEARCH_LENGTH);
  const pageParam = searchParams.get('page');
  const pageNumber = /^\d+$/.test(pageParam || '') ? Number(pageParam) : 1;
  const page = pageNumber >= 1 && pageNumber <= 100000 ? pageNumber : 1;
  return { tab, jobType, location, isRemote, search, page };
}

/** Serialises only non-default filter values so the URL mirrors the current filters. */
export function filtersToParams({ tab, jobType, location, isRemote, search, page }) {
  const params = new URLSearchParams();
  if (tab !== 'all') params.set('tab', tab);
  if (jobType && tab === 'all') params.set('jobType', jobType);
  if (location) params.set('location', location);
  if (isRemote) params.set('isRemote', 'true');
  if (search) params.set('search', search);
  if (page > 1) params.set('page', String(page));
  return params;
}

function parsePost(post) {
  const jobType = post.jobType || 'Full-time';
  const description = post.description || '';
  const schedule = post.schedule || 'Full-time';
  let isSme = jobType !== 'Full-time';
  // Side-hustle detection also via schedule
  if (schedule === 'Side-hustle') isSme = true;

  const job = {
    id: post.postId,
    title: post.title,
    company: post.companyName || 'Unknown',
    companyId: post.companyId || null,
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
    schedule,
    matchPercent: typeof post.matchPercent === 'number' ? post.matchPercent : null,
    skills: [],
    requiredSkillLevels: [],
  };

  // Description fallback parsing for legacy posts without structured skills
  const lines = description.split('\n');
  for (const line of lines) {
    if (!line) continue;
    const salaryMatch = line.match(/^(salary|rate):\s*(.*)$/i);
    if (salaryMatch) {
      job.salaryRange = job.salaryRange || salaryMatch[2];
      continue;
    }
    const skillsMatch = line.match(/^skills:\s*(.*)$/i);
    if (skillsMatch) {
      job.skills = skillsMatch[1].split(',').map((skill) => skill.trim()).filter(Boolean);
      continue;
    }
  }

  // Employer-declared required skills (taxonomy with proficiency levels)
  if (Array.isArray(post.requiredSkills) && post.requiredSkills.length > 0) {
    job.skills = post.requiredSkills.map((skill) => skill.skillName);
    job.requiredSkillLevels = post.requiredSkills.map((skill) => ({
      name: skill.skillName,
      level: skill.requiredLevel,
    }));
  }

  job.kind = isSme ? 'sme' : 'corporate';
  job.kindLabel = isSme ? 'Side Hustle & Local SME' : 'Corporate & Full-Time';
  return job;
}

function buildQuery({ tab, search, jobType, location, isRemote, page }) {
  const params = new URLSearchParams();
  const type = tabToJobType[tab] || jobType;
  if (type) params.set('jobType', type);
  if (search.trim()) params.set('search', search.trim());
  if (location) params.set('location', location);
  if (isRemote) params.set('isRemote', 'true');
  params.set('page', String(page));
  params.set('pageSize', String(PAGE_SIZE));
  return params.toString();
}

// One row of placeholders: the page also renders short (empty / filtered) results, and a skeleton taller than
// the loaded page makes the footer jump up when data arrives.
const SKELETON_CARDS = 3;

function JobsSkeleton() {
  return (
    <div className={styles.grid}>
      {Array.from({ length: SKELETON_CARDS }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export default function JobsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);
  const { tab, search, jobType, location, isRemote, page } = filters;

  // Filters live in the URL; every change is written immediately (well inside 500ms) with no reload.
  const updateFilters = useCallback((patch, { resetPage = true } = {}) => {
    const next = { ...filters, ...patch, ...(resetPage ? { page: 1 } : null) };
    setSearchParams(filtersToParams(next), { replace: true });
  }, [filters, setSearchParams]);

  const clearFilters = () => setSearchParams(new URLSearchParams(), { replace: true });

  const query = buildQuery(filters);
  const state = useDataState(
    ({ signal }) => api.get(`/posts?${query}`, { signal })
      .then((data) => ({
        jobs: (data?.items || []).map(parsePost),
        total: data?.total || 0,
      }))
      .catch((err) => {
        throw new Error(summarizeError(err, 'Could not load jobs'));
      }),
    [query],
  );

  const total = state.data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className={`view-enter ${styles.page}`}>
      <div className={styles.heading}>
        <div>
          <div className={styles.eyebrow}>Skills to opportunity</div>
          <h1 className={styles.title}>Find work that fits.</h1>
          <p className={styles.subtitle}>
            Corporate roles and local opportunities stay visible side by side.
          </p>
        </div>
        <Button variant="primary" onClick={() => showToast('Job alert saved — we’ll notify you of new matches', 'success')}>
          <BellPlus size={14} /> Save alert
        </Button>
      </div>

      <div className={styles.filterBar} data-testid="jobs-filter-bar">
        <Tabs tabs={tabOptions} active={tab} onChange={(key) => updateFilters({ tab: key })} label="Job category" />

        <div className={styles.toolbar}>
          <input
            className={`field ${styles.field} ${styles.search}`}
            aria-label="Search jobs"
            placeholder="Search roles, skills, or locations"
            maxLength={MAX_SEARCH_LENGTH}
            value={search}
            onChange={(e) => updateFilters({ search: e.target.value })}
          />
          <select
            className={`field ${styles.field}`}
            aria-label="Job type"
            value={tab === 'all' ? jobType : ''}
            onChange={(e) => updateFilters({ jobType: e.target.value })}
            disabled={tab !== 'all'}
          >
            <option value="">Any type</option>
            {jobTypes.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
          <select
            className={`field ${styles.field}`}
            aria-label="Location"
            value={location}
            onChange={(e) => updateFilters({ location: e.target.value })}
          >
            <option value="">Any location</option>
            {locations.map((place) => (
              <option key={place}>{place}</option>
            ))}
          </select>
          <label className={`field ${styles.field} ${styles.check}`}>
            <input
              type="checkbox"
              checked={isRemote}
              onChange={(e) => updateFilters({ isRemote: e.target.checked })}
            />
            Remote only
          </label>
        </div>
      </div>

      <DataBoundView
        state={state}
        skeleton={<JobsSkeleton />}
        loadingLabel="Loading jobs..."
        errorTitle="Couldn’t load jobs"
        isEmpty={(data) => !data || data.jobs.length === 0}
        empty={{
          title: 'No jobs match your search.',
          description: 'No jobs were found with these filters. Clear them to see every open role.',
          action: { label: 'Clear all filters', onClick: clearFilters },
        }}
      >
        {(data) => (
          <>
            <div className={styles.grid}>
              {data.jobs.map((job) => (
                <JobCard key={job.id} job={job} showMatch />
              ))}
            </div>
            <div className={styles.pager}>
              <Button
                variant="ghost"
                disabled={page <= 1}
                onClick={() => updateFilters({ page: Math.max(1, page - 1) }, { resetPage: false })}
              >
                Previous
              </Button>
              <span className={styles.pagerInfo}>
                Page {page} of {totalPages} · {total} job{total === 1 ? '' : 's'}
              </span>
              <Button
                variant="ghost"
                disabled={page >= totalPages}
                onClick={() => updateFilters({ page: Math.min(totalPages, page + 1) }, { resetPage: false })}
              >
                Next
              </Button>
            </div>
          </>
        )}
      </DataBoundView>
    </div>
  );
}
