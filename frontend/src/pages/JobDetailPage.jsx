import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Panel from '../components/ui/Panel';
import Tag from '../components/ui/Tag';
import Button from '../components/ui/Button';
import EmptyState from '../components/shared/EmptyState';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import { useApplications } from '../context/ApplicationsContext';
import { MapPin, Building2, Clock, BriefcaseBusiness, Wallet, CalendarDays, Upload } from 'lucide-react';

const styles = {
  back: {
    display: 'inline-block',
    marginBottom: 18,
    fontSize: 13,
    color: 'var(--teal)',
    textDecoration: 'none',
    fontWeight: 700,
  },
  heading: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'start',
    gap: 18,
    flexWrap: 'wrap',
  },
  h1: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 'clamp(1.6rem, 3vw, 2.4rem)',
    margin: '6px 0 6px',
  },
  company: {
    color: 'var(--muted)',
    fontSize: 13,
    margin: 0,
  },
  tags: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    margin: '12px 0 4px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 340px',
    gap: 18,
    marginTop: 22,
  },
  sectionTitle: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 17,
    margin: '0 0 12px',
  },
  body: {
    fontSize: 14,
    lineHeight: 1.7,
    color: 'var(--ink)',
    whiteSpace: 'pre-line',
    margin: 0,
  },
  list: {
    margin: 0,
    paddingLeft: 18,
    fontSize: 14,
    lineHeight: 1.9,
  },
  facts: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    marginTop: 16,
  },
  fact: {
    display: 'flex',
    gap: 10,
    alignItems: 'center',
    fontSize: 13,
    color: 'var(--ink)',
  },
  factLabel: {
    color: 'var(--muted)',
    minWidth: 92,
    fontSize: 12,
  },
  applyBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  fileRow: {
    display: 'flex',
    gap: 10,
    alignItems: 'center',
  },
  fileLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: 700,
  },
  fileInput: {
    fontSize: 12,
    cursor: 'pointer',
  },
  fileName: {
    fontSize: 11,
    color: 'var(--muted)',
  },
  loading: {
    textAlign: 'center',
    padding: 45,
    color: 'var(--muted)',
    fontSize: 13,
  },
  expired: {
    color: 'var(--coral)',
    fontSize: 12,
    fontWeight: 700,
  },
};

function formatDate(isoString) {
  if (!isoString) return '';
  return new Date(isoString).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function Section({ title, children }) {
  return (
    <Panel style={{ marginBottom: 18 }}>
      <h2 style={styles.sectionTitle}>{title}</h2>
      {children}
    </Panel>
  );
}

export default function JobDetailPage() {
  const { postId } = useParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [applying, setApplying] = useState(false);
  const { showToast } = useToast();
  const { applyToJob, isApplied } = useApplications();

  useEffect(() => {
    setLoading(true);
    api.get(`/posts/${postId}`)
      .then((data) => setJob(data))
      .catch((err) => setError(err.message || 'Could not load job'))
      .finally(() => setLoading(false));
  }, [postId]);

  if (loading) return <div style={styles.loading}>Loading job...</div>;
  if (error || !job) {
    return (
      <Panel>
        <EmptyState title="Job unavailable" description={error || 'This posting could not be found.'} />
      </Panel>
    );
  }

  const applied = isApplied(job.postId);
  const requirements = (job.requirements || '').split('\n').map((line) => line.trim()).filter(Boolean);
  const benefits = (job.benefits || '').split('\n').map((line) => line.trim()).filter(Boolean);
  const expired = job.expiresAt && new Date(job.expiresAt) < new Date();

  const handleApply = async () => {
    if (!resumeFile) {
      showToast('A resume is required to apply for this job');
      return;
    }
    setApplying(true);
    try {
      const uploaded = await api.upload('/media/documents', resumeFile);
      if (!uploaded?.url) throw new Error('Resume upload did not complete — please try again');
      const resumeUrl = uploaded.url;

      let coverLetterUrl = null;
      if (coverFile) {
        const coverUploaded = await api.upload('/media/documents', coverFile);
        if (!coverUploaded?.url) throw new Error('Cover letter upload did not complete — please try again');
        coverLetterUrl = coverUploaded.url;
      }

      await applyToJob(job, { resumeUrl, coverLetterUrl });
      showToast('Application submitted');
    } catch (err) {
      showToast(err?.message || 'Could not submit application');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="view-enter">
      <Link to="/jobs" style={styles.back}>← Back to jobs</Link>

      <Panel>
        <div style={styles.heading}>
          <div>
            <div style={styles.tags}>
              <Tag>{job.jobType || 'Full-time'}</Tag>
              <Tag variant={job.isRemote ? 'good' : 'sand'}>{job.isRemote ? 'Remote' : 'On-site'}</Tag>
              {job.experienceLevel && <Tag variant="coral">{job.experienceLevel}</Tag>}
              {expired && <span style={styles.expired}>Expired</span>}
            </div>
            <h1 style={styles.h1}>{job.title}</h1>
            <p style={styles.company}>{job.companyName}</p>
          </div>
          <div style={styles.facts}>
            {job.location && (
              <div style={styles.fact}><MapPin size={15} /><span style={styles.factLabel}>Location</span>{job.location}</div>
            )}
            {job.salaryRange && (
              <div style={styles.fact}><Wallet size={15} /><span style={styles.factLabel}>Salary</span>{job.salaryRange}</div>
            )}
            {job.targetRole && (
              <div style={styles.fact}><BriefcaseBusiness size={15} /><span style={styles.factLabel}>Target role</span>{job.targetRole}</div>
            )}
            {job.createdAt && (
              <div style={styles.fact}><CalendarDays size={15} /><span style={styles.factLabel}>Posted</span>{formatDate(job.createdAt)}</div>
            )}
            {job.expiresAt && (
              <div style={styles.fact}><Clock size={15} /><span style={styles.factLabel}>Closes</span>{formatDate(job.expiresAt)}</div>
            )}
            <div style={styles.fact}><Building2 size={15} /><span style={styles.factLabel}>Type</span>{job.isActive === false ? 'Inactive' : 'Active'}</div>
          </div>
        </div>
      </Panel>

      <div style={styles.grid}>
        <div>
          <Section title="About the role">
            <p style={styles.body}>{job.description || 'No description provided.'}</p>
          </Section>
          {requirements.length > 0 && (
            <Section title="Requirements">
              <ul style={styles.list}>{requirements.map((line) => <li key={line}>{line}</li>)}</ul>
            </Section>
          )}
          {benefits.length > 0 && (
            <Section title="Benefits">
              <ul style={styles.list}>{benefits.map((line) => <li key={line}>{line}</li>)}</ul>
            </Section>
          )}
        </div>

        <div>
          <Panel style={styles.applyBox}>
            {applied ? (
              <EmptyState title="Application submitted" description="The employer has been notified. Track progress on your Applications page." />
            ) : (
              <>
                <h2 style={styles.sectionTitle}>Apply for this role</h2>
                <div style={styles.fileRow}>
                  <span style={styles.fileLabel}>Resume *</span>
                  <label style={styles.fileInput}>
                    <Upload size={13} /> {resumeFile ? resumeFile.name : 'Choose file'}
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg"
                      style={{ display: 'none' }}
                      onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
                <div style={styles.fileRow}>
                  <span style={styles.fileLabel}>Cover letter</span>
                  <label style={styles.fileInput}>
                    <Upload size={13} /> {coverFile ? coverFile.name : 'Choose file'}
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.txt,.md"
                      style={{ display: 'none' }}
                      onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
                <p style={styles.fileName}>Resume is required. Cover letter is optional — PDF, Word, or text up to 10 MB.</p>
                <Button variant="secondary" onClick={handleApply} disabled={applying || expired}>
                  {applying ? 'Submitting...' : 'Submit application'}
                </Button>
              </>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}