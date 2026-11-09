import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Panel from '../components/ui/Panel';
import Tag from '../components/ui/Tag';
import Button from '../components/ui/Button';
import CompanyAvatar from '../components/shared/CompanyAvatar';
import ErrorState, { ErrorBanner } from '../components/ui/ErrorState';
import Skeleton, { SkeletonStatus, SkeletonText } from '../components/ui/Skeleton';
import DataBoundView from '../components/ui/DataBoundView';
import LiquidMeter from '../components/water/LiquidMeter';
import useDataState from '../hooks/useDataState';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useApplications } from '../context/ApplicationsContext';
import { MapPin, Building2, Clock, BriefcaseBusiness, Wallet, CalendarDays, Upload, Check } from 'lucide-react';
import styles from './JobDetailPage.module.css';

function formatDate(isoString) {
  if (!isoString) return '';
  return new Date(isoString).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function Section({ title, children }) {
  return (
    <Panel className={`panel ${styles.section}`}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {children}
    </Panel>
  );
}

/**
 * Required skills the learner lacks for this job. Prefers the skill-gap group computed for this post;
 * otherwise compares the posting's required skills with the learner's levels from any group.
 */
function computeSkillGaps(job, groups) {
  const list = Array.isArray(groups) ? groups : [];
  const group = list.find((g) => g.postId != null && String(g.postId) === String(job.postId));
  if (group && Array.isArray(group.gaps)) {
    const lacking = group.gaps
      .filter((g) => g.gap > 0)
      .map((g) => ({
        skillId: g.skillId,
        skillName: g.skillName,
        category: g.category || null,
        requiredLevel: g.requiredLevel,
        currentLevel: g.currentLevel ?? 0,
      }));
    return { lacking, hasRequirements: group.gaps.length > 0 };
  }
  const required = Array.isArray(job.requiredSkills) ? job.requiredSkills : [];
  const levels = new Map();
  list.forEach((g) => (g.gaps || []).forEach((s) => levels.set(String(s.skillId), s.currentLevel ?? 0)));
  const lacking = required
    .map((s) => ({
      skillId: s.skillId,
      skillName: s.skillName,
      category: s.category || null,
      requiredLevel: s.requiredLevel,
      currentLevel: levels.get(String(s.skillId)) ?? 0,
    }))
    .filter((s) => s.currentLevel < s.requiredLevel);
  return { lacking, hasRequirements: required.length > 0 };
}

function SkillGapPanel({ job }) {
  const navigate = useNavigate();
  const state = useDataState(
    async ({ signal }) => computeSkillGaps(job, await api.get('/skillgaps/groups', { signal })),
    [job.postId],
  );
  const noRequirements = state.data && !state.data.hasRequirements;

  // Filters CoursesPage by the skill's category via the `category` query parameter.
  const closeGap = (skill) => {
    navigate(skill.category ? `/courses?category=${encodeURIComponent(skill.category)}` : '/courses');
  };

  return (
    <Panel className={`panel ${styles.gapPanel}`} aria-labelledby="skill-gap-heading">
      <h2 id="skill-gap-heading" className={styles.sectionTitle}>Your skill gap</h2>
      <DataBoundView
        state={state}
        loadingLabel="Loading skill gap..."
        skeleton={<SkeletonText lines={4} lineHeight={13} gap={10} />}
        minHeight={120}
        isEmpty={(data) => data == null || data.lacking.length === 0}
        empty={{
          title: noRequirements ? 'No required skills listed' : 'No skill gaps',
          description: noRequirements
            ? 'This posting does not list required skills.'
            : 'You meet every required skill for this role.',
        }}
      >
        {(data) => (
          <ul className={styles.gapList}>
            {data.lacking.map((skill) => (
              <li key={skill.skillId} className={styles.gapItem}>
                <div className={styles.gapHead}>
                  <span className={styles.gapName}>{skill.skillName}</span>
                  <span className={styles.gapLevels}>{`Required ${skill.requiredLevel} · Current ${skill.currentLevel}`}</span>
                </div>
                <LiquidMeter
                  label={`${skill.skillName} proficiency`}
                  value={skill.requiredLevel > 0 ? Math.round((skill.currentLevel / skill.requiredLevel) * 100) : undefined}
                />
                <Button
                  variant="ghost"
                  aria-label={`Close gap: ${skill.skillName}`}
                  onClick={() => closeGap(skill)}
                >
                  Close gap
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DataBoundView>
    </Panel>
  );
}

function JobDetailSkeleton() {
  return (
    <SkeletonStatus label="Loading job...">
      <Panel className={`panel ${styles.section}`}>
        <div className={styles.skeletonHead}>
          <div className={styles.skeletonGrow}>
            <Skeleton height={26} width="55%" radius={8} style={{ marginBottom: 10 }} />
            <Skeleton height={13} width="30%" style={{ marginBottom: 14 }} />
            <div className={styles.skeletonTags}>
              <Skeleton height={24} width={82} radius={12} />
              <Skeleton height={24} width={70} radius={12} />
              <Skeleton height={24} width={96} radius={12} />
            </div>
          </div>
          <Skeleton height={44} width={140} radius={10} />
        </div>
      </Panel>
      <Panel className={`panel ${styles.section}`}>
        <Skeleton height={16} width={130} style={{ marginBottom: 14 }} />
        <SkeletonText lines={4} lineHeight={13} gap={9} lastWidth="65%" />
      </Panel>
      <Panel>
        <Skeleton height={16} width={100} style={{ marginBottom: 14 }} />
        <SkeletonText lines={3} lineHeight={13} gap={9} lastWidth="50%" />
      </Panel>
    </SkeletonStatus>
  );
}

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt', '.md', '.png', '.jpg', '.jpeg', '.webp'];

function validateFile(file) {
  if (!file) return null;
  if (file.size > 10 * 1024 * 1024) return 'File must be ≤ 10 MB';
  const dot = file.name ? file.name.lastIndexOf('.') : -1;
  const ext = dot >= 0 ? file.name.slice(dot).toLowerCase() : '';
  if (!ALLOWED_EXTENSIONS.includes(ext)) return 'Unsupported file type — upload a PDF, Word, text, or image file';
  return null;
}

function JobDetail({ job }) {
  const [company, setCompany] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [applyError, setApplyError] = useState('');
  const [applying, setApplying] = useState(false);
  const submittingRef = useRef(false);
  const { showToast } = useToast();
  const { user } = useAuth();
  const { applyToJob, isApplied } = useApplications();
  const profileResumeUrl = user?.resumeUrl || null;

  useEffect(() => {
    if (!job?.companyId) return;
    let cancelled = false;
    api.get(`/companies/${job.companyId}`)
      .then((data) => {
        if (!cancelled) setCompany(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [job?.companyId]);

  const applied = isApplied(job.postId);
  const requirements = (job.requirements || '').split('\n').map((line) => line.trim()).filter(Boolean);
  const benefits = (job.benefits || '').split('\n').map((line) => line.trim()).filter(Boolean);
  const expired = job.expiresAt && new Date(job.expiresAt) < new Date();

  const handleApply = async () => {
    // Already applied or a submit in flight: no duplicate request and no error toast.
    if (applied || submittingRef.current) return;
    const fileErr = validateFile(resumeFile) || validateFile(coverFile);
    if (fileErr) {
      setApplyError(fileErr);
      showToast(fileErr, 'error');
      return;
    }
    if (!resumeFile && !profileResumeUrl) {
      const msg = 'A resume is required to apply for this job';
      setApplyError(msg);
      showToast(msg, 'error');
      return;
    }
    setApplyError('');
    submittingRef.current = true;
    setApplying(true);
    try {
      // A newly chosen file always wins; otherwise the profile resume
      // (uploaded at registration) is attached automatically.
      let resumeUrl = profileResumeUrl;
      if (resumeFile) {
        const uploaded = await api.upload('/media/documents', resumeFile);
        if (!uploaded?.url) throw new Error('Resume upload did not complete — please try again');
        resumeUrl = uploaded.url;
      }

      let coverLetterUrl = null;
      if (coverFile) {
        const coverUploaded = await api.upload('/media/documents', coverFile);
        if (!coverUploaded?.url) throw new Error('Cover letter upload did not complete — please try again');
        coverLetterUrl = coverUploaded.url;
      }

      await applyToJob(job, { resumeUrl, coverLetterUrl });
      showToast('Application submitted — good luck!', 'success');
    } catch (err) {
      // Network or server failure: say it was not submitted; the apply control stays enabled for retry.
      setApplyError(err?.message || 'Could not submit application');
      showToast('Your application was not submitted. Please try again.', 'error');
    } finally {
      submittingRef.current = false;
      setApplying(false);
    }
  };

  const employerMeta = company
    ? [company.industry, company.companySize ? `${company.companySize} employees` : '', company.location]
      .filter(Boolean).join(' · ') || 'View all openings'
    : '';

  return (
    <div className={`view-enter ${styles.page}`}>
      <Link to="/jobs" className={styles.back}>← Back to jobs</Link>

      <Panel className={`panel ${styles.section}`}>
        <div className={styles.heading}>
          <div>
            <div className={styles.tags}>
              <Tag>{job.jobType || 'Full-time'}</Tag>
              <Tag variant={job.isRemote ? 'good' : 'sand'}>{job.isRemote ? 'Remote' : 'On-site'}</Tag>
              {job.experienceLevel && <Tag variant="coral">{job.experienceLevel}</Tag>}
              {expired && <span className={styles.expired}>Expired</span>}
            </div>
            <h1 className={styles.title}>{job.title}</h1>
            <div className={styles.company}>
              {(job.companyLogoUrl || company?.logoUrl || job.companyName) && (
                <CompanyAvatar name={job.companyName} src={company?.logoUrl || job.companyLogoUrl} size={30} />
              )}
              {job.companyId ? (
                <Link to={`/companies/${job.companyId}`} className={styles.employerName}>{job.companyName}</Link>
              ) : (
                job.companyName
              )}
              {company && (company.industry || company.location) && (
                <span>{[company.industry, company.location].filter(Boolean).join(' · ')}</span>
              )}
            </div>
          </div>
          <div className={styles.facts}>
            {job.location && (
              <div className={styles.fact}><MapPin size={15} aria-hidden="true" /><span className={styles.factLabel}>Location</span>{job.location}</div>
            )}
            {job.salaryRange && (
              <div className={styles.fact}><Wallet size={15} aria-hidden="true" /><span className={styles.factLabel}>Salary</span>{job.salaryRange}</div>
            )}
            {job.targetRole && (
              <div className={styles.fact}><BriefcaseBusiness size={15} aria-hidden="true" /><span className={styles.factLabel}>Target role</span>{job.targetRole}</div>
            )}
            {job.createdAt && (
              <div className={styles.fact}><CalendarDays size={15} aria-hidden="true" /><span className={styles.factLabel}>Posted</span>{formatDate(job.createdAt)}</div>
            )}
            {job.expiresAt && (
              <div className={styles.fact}><Clock size={15} aria-hidden="true" /><span className={styles.factLabel}>Closes</span>{formatDate(job.expiresAt)}</div>
            )}
            <div className={styles.fact}><Building2 size={15} aria-hidden="true" /><span className={styles.factLabel}>Type</span>{job.isActive === false ? 'Inactive' : 'Active'}</div>
          </div>
        </div>
      </Panel>

      <div className={styles.grid}>
        <div>
          <Section title="About the role">
            <p className={styles.body}>{job.description || 'No description provided.'}</p>
          </Section>
          {requirements.length > 0 && (
            <Section title="Requirements">
              <ul className={styles.list}>{requirements.map((line) => <li key={line}>{line}</li>)}</ul>
            </Section>
          )}
          {benefits.length > 0 && (
            <Section title="Benefits">
              <ul className={styles.list}>{benefits.map((line) => <li key={line}>{line}</li>)}</ul>
            </Section>
          )}
        </div>

        <div className={styles.side}>
          {company && (
            <Panel className={`panel ${styles.section}`}>
              <h2 className={styles.sectionTitle}>About the employer</h2>
              <div className={styles.employerRow}>
                <CompanyAvatar name={company.name} src={company.logoUrl} size={46} />
                <div>
                  <Link to={`/companies/${company.companyId}`} className={styles.employerName}>{company.name}</Link>
                  <p className={styles.employerMeta}>{employerMeta}</p>
                </div>
              </div>
              {company.description && <p className={styles.employerBody}>{company.description}</p>}
              <Link to={`/companies/${company.companyId}`} className={styles.employerLink}>
                View all roles at {company.name} →
              </Link>
            </Panel>
          )}
        </div>
      </div>

      {/* Gap breakdown sits beside the apply panel at 1024px and up (two columns in .actionRow). */}
      <div className={styles.actionRow}>
        <SkillGapPanel job={job} />
        <Panel className={`panel ${styles.applyBox}`}>
              {applied ? (
                <>
                  <h2 className={styles.sectionTitle}>
                    <Check size={16} aria-hidden="true" /> Application submitted
                  </h2>
                  <p className={styles.fileName}>The employer has been notified. Track progress on your Applications page.</p>
                  <Button variant="secondary" disabled>Already applied</Button>
                </>
              ) : (
                <>
                  <h2 className={styles.sectionTitle}>Apply for this role</h2>
                  {applyError && <ErrorBanner title="Application failed" description={applyError} onDismiss={() => setApplyError('')} />}
                  <div className={styles.fileRow}>
                    <span className={styles.fileLabel}>Resume{!profileResumeUrl && !resumeFile ? ' *' : ''}</span>
                    <label className={styles.fileInput}>
                      <Upload size={13} aria-hidden="true" /> {resumeFile ? resumeFile.name : 'Choose file'}
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg,.webp"
                        className={styles.hiddenInput}
                        onChange={(e) => { setApplyError(''); setResumeFile(e.target.files?.[0] || null); }}
                      />
                    </label>
                  </div>
                  <div className={styles.fileRow}>
                    <span className={styles.fileLabel}>Cover letter</span>
                    <label className={styles.fileInput}>
                      <Upload size={13} aria-hidden="true" /> {coverFile ? coverFile.name : 'Choose file'}
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg,.webp"
                        className={styles.hiddenInput}
                        onChange={(e) => { setApplyError(''); setCoverFile(e.target.files?.[0] || null); }}
                      />
                    </label>
                  </div>
                  <p className={styles.fileName}>
                    {profileResumeUrl && !resumeFile
                      ? 'Your profile resume will be attached — or choose a file to send a different one.'
                      : 'Resume is required. Cover letter is optional — PDF, Word, or text up to 10 MB.'}
                  </p>
                  <Button variant="secondary" onClick={handleApply} disabled={applying || expired}>
                    {applying ? 'Submitting...' : 'Submit application'}
                  </Button>
                </>
              )}
            </Panel>
      </div>
    </div>
  );
}

export default function JobDetailPage() {
  const { postId } = useParams();
  const state = useDataState(({ signal }) => api.get(`/posts/${postId}`, { signal }), [postId]);

  if (state.status === 'loading' && !state.data) return <JobDetailSkeleton />;
  if (!state.data) {
    return (
      <ErrorState
        title="Job unavailable"
        error={state.error?.message ? state.error : 'This posting could not be found. It may have been removed or the link is incorrect.'}
        onRetry={state.reload}
      />
    );
  }
  return <JobDetail job={state.data} />;
}
