import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Mail, Target, UserRound } from 'lucide-react';
import Panel from '../components/ui/Panel';
import Tag from '../components/ui/Tag';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/shared/EmptyState';
import Button from '../components/ui/Button';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import { resolveFileUrl } from '../utils/fileUrl';

const styles = {
  heading: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'end',
    gap: 18,
    marginBottom: 24,
    flexWrap: 'wrap',
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
    fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)',
    margin: 0,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
  },
  item: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr) auto',
    gap: 16,
    alignItems: 'center',
    padding: '18px 0',
    borderBottom: '1px solid var(--line)',
  },
  itemLast: {
    borderBottom: 'none',
  },
  info: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    minWidth: 0,
  },
  title: {
    fontSize: 15,
    fontWeight: 700,
    margin: 0,
    color: 'var(--text, #1a2e28)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  nameButton: {
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: 15,
    fontWeight: 700,
    color: 'var(--teal)',
    textDecoration: 'underline',
    textUnderlineOffset: 3,
  },
  meta: {
    fontSize: 12,
    color: 'var(--muted)',
    margin: 0,
  },
  links: {
    display: 'flex',
    gap: 12,
    fontSize: 12,
    flexWrap: 'wrap',
  },
  link: {
    color: 'var(--teal)',
    textDecoration: 'none',
    fontWeight: 700,
  },
  statusSelect: {
    background: 'var(--surface2)',
    border: '1px solid var(--line)',
    borderRadius: 8,
    padding: '7px 10px',
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--ink)',
    minWidth: 120,
  },
  loading: {
    textAlign: 'center',
    padding: 45,
    color: 'var(--muted)',
    fontSize: 13,
  },
  postTitle: {
    color: 'var(--teal)',
    fontWeight: 700,
  },
  profileRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontSize: 13,
    color: 'var(--ink)',
    margin: '6px 0',
  },
  profileLabel: {
    color: 'var(--muted)',
    minWidth: 92,
    fontWeight: 700,
  },
  sectionTitle: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 15,
    margin: '18px 0 8px',
  },
  skillList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  skillRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    fontSize: 13,
    borderBottom: '1px solid var(--line)',
    paddingBottom: 8,
  },
  skillName: {
    fontWeight: 700,
  },
  skillLevel: {
    color: 'var(--muted)',
    fontSize: 12,
  },
  docButtons: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    marginTop: 6,
  },
  docButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--teal)',
    textDecoration: 'none',
    padding: '9px 14px',
    border: '1px solid var(--line)',
    borderRadius: 10,
    background: 'var(--surface)',
  },
  noDocs: {
    fontSize: 12,
    color: 'var(--muted)',
    margin: 0,
  },
};

const statusOptions = ['applied', 'review', 'interview', 'hired', 'rejected'];

function formatDate(isoString) {
  if (!isoString) return '';
  return new Date(isoString).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function JobApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [rankings, setRankings] = useState({});
  const [aiRanked, setAiRanked] = useState(false);
  const [ranking, setRanking] = useState(false);
  const { showToast } = useToast();

  const load = () => {
    setLoading(true);
    api.get('/applications/employer')
      .then((data) => setApplications(data || []))
      .catch((err) => setError(err?.message || 'Could not load applications'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const rankWithAi = async () => {
    const postIds = [...new Set(applications.map((app) => app.postId).filter(Boolean))];
    if (postIds.length === 0) return;
    setRanking(true);
    try {
      const merged = {};
      for (const postId of postIds) {
        // eslint-disable-next-line no-await-in-loop
        const data = await api.get(`/hiring-agent/posts/${postId}/rank-applicants`);
        (data?.candidates || []).forEach((candidate) => {
          merged[candidate.applicationId] = { score: candidate.score, rationale: candidate.rationale };
        });
      }
      setRankings(merged);
      setAiRanked(true);
      showToast('Candidates ranked by AI');
    } catch (err) {
      showToast(err?.message || 'Could not rank candidates');
    } finally {
      setRanking(false);
    }
  };

  const rankedApplications = aiRanked
    ? [...applications].sort((a, b) =>
        (a.postTitle || '').localeCompare(b.postTitle || '') || (rankings[b.applicationId]?.score ?? 0) - (rankings[a.applicationId]?.score ?? 0))
    : applications;

  const openProfile = (application) => {
    setSelected(application);
    setDetail(null);
    setDetailError('');
    setDetailLoading(true);
    api.get(`/applications/employer/${application.applicationId}`)
      .then(setDetail)
      .catch((err) => setDetailError(err?.message || 'Could not load applicant profile'))
      .finally(() => setDetailLoading(false));
  };

  const updateStatus = async (application, status) => {
    if (status === application.status) return;
    setUpdatingId(application.applicationId);
    try {
      await api.patch(`/applications/employer/${application.applicationId}`, { status });
      setApplications((prev) =>
        prev.map((app) => (app.applicationId === application.applicationId ? { ...app, status } : app)),
      );
      if (detail?.applicationId === application.applicationId) setDetail((d) => (d ? { ...d, status } : d));
      showToast(`Application marked as ${status}`, 'success');
    } catch (err) {
      showToast(err?.message || 'Could not update status', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) return <div style={styles.loading}>Loading applications...</div>;

  return (
    <div className="view-enter">
      <div style={styles.heading}>
        <div>
          <div style={styles.eyebrow}>Keep the pipeline moving</div>
          <h1 style={styles.h1}>Job applications</h1>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="ghost" disabled={ranking || applications.length === 0} onClick={rankWithAi}>
            {ranking ? 'Ranking...' : '✨ Rank with AI'}
          </Button>
          <Link to="/post-job" style={{ textDecoration: 'none' }}>
            <Button variant="primary">Post a job</Button>
          </Link>
        </div>
      </div>

      <Panel>
        {error ? (
          <EmptyState title="Applications unavailable" description={error} />
        ) : applications.length === 0 ? (
          <EmptyState
            title="No applications yet"
            description="Applications from learners will show up here with their resume and cover letter."
          />
        ) : (
          <div style={styles.list}>
            {rankedApplications.map((application, index) => {
              const isLast = index === rankedApplications.length - 1;
              const rankingInfo = rankings[application.applicationId];
              return (
                <div key={application.applicationId} style={isLast ? { ...styles.item, ...styles.itemLast } : styles.item}>
                  <div style={styles.info}>
                    <button
                      style={styles.nameButton}
                      onClick={() => openProfile(application)}
                      aria-label={`View profile of ${application.learnerName}`}
                      title="View applicant profile"
                    >
                      {application.learnerName}
                    </button>
                    <p style={styles.meta}>{application.learnerEmail} · Applied {formatDate(application.appliedAt)}</p>
                    {rankingInfo && (
                      <p style={{ ...styles.meta, fontWeight: 700 }} title={rankingInfo.rationale}>
                        ✨ AI fit: {Math.round(rankingInfo.score)}% — {rankingInfo.rationale}
                      </p>
                    )}
                    <div style={styles.links}>
                      <span style={styles.postTitle}>{application.postTitle}</span>
                      {application.resumeUrl && (
                        <a style={styles.link} href={resolveFileUrl(application.resumeUrl)} target="_blank" rel="noreferrer">Resume</a>
                      )}
                      {application.coverLetterUrl && (
                        <a style={styles.link} href={resolveFileUrl(application.coverLetterUrl)} target="_blank" rel="noreferrer">Cover letter</a>
                      )}
                    </div>
                  </div>
                  <Tag>{application.status}</Tag>
                  <select
                    style={styles.statusSelect}
                    value={application.status}
                    disabled={updatingId === application.applicationId}
                    onChange={(e) => updateStatus(application, e.target.value)}
                    aria-label={`Status for ${application.learnerName}`}
                  >
                    {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        eyebrow="Applicant profile"
        title={detail?.learnerName || selected?.learnerName || 'Applicant'}
      >
        {detailLoading ? (
          <div style={styles.loading}>Loading profile...</div>
        ) : detailError ? (
          <p style={{ color: 'var(--coral)', margin: 0 }}>{detailError}</p>
        ) : detail ? (
          <>
            <div style={styles.profileRow}><span style={styles.profileLabel}><Mail size={14} /> Email</span><span>{detail.learnerEmail || '—'}</span></div>
            <div style={styles.profileRow}><span style={styles.profileLabel}><Target size={14} /> Target role</span><span>{detail.targetRole || '—'}</span></div>
            <div style={styles.profileRow}><span style={styles.profileLabel}><UserRound size={14} /> Applied for</span><span>{detail.postTitle}</span></div>
            <div style={styles.profileRow}><span style={styles.profileLabel}>Status</span><Tag>{detail.status}</Tag></div>
            <div style={styles.profileRow}><span style={styles.profileLabel}>Applied</span><span>{formatDate(detail.appliedAt)}</span></div>

            <h4 style={styles.sectionTitle}>Submitted documents</h4>
            {!detail.resumeUrl && !detail.coverLetterUrl ? (
              <p style={styles.noDocs}>No documents uploaded with this application.</p>
            ) : (
              <div style={styles.docButtons}>
                {detail.resumeUrl && (
                  <a style={styles.docButton} href={resolveFileUrl(detail.resumeUrl)} target="_blank" rel="noreferrer">
                    <FileText size={15} /> Resume
                  </a>
                )}
                {detail.coverLetterUrl && (
                  <a style={styles.docButton} href={resolveFileUrl(detail.coverLetterUrl)} target="_blank" rel="noreferrer">
                    <FileText size={15} /> Cover letter
                  </a>
                )}
              </div>
            )}

            <h4 style={styles.sectionTitle}>Skills ({detail.skills?.length || 0})</h4>
            {detail.skills?.length ? (
              <div style={styles.skillList}>
                {detail.skills.map((skill) => (
                  <div key={skill.name} style={styles.skillRow}>
                    <span style={styles.skillName}>
                      {skill.name}
                      {skill.verified && <Tag style={{ marginLeft: 8 }}>Verified</Tag>}
                    </span>
                    <span style={styles.skillLevel}>Level {skill.currentLevel}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={styles.noDocs}>No skills tracked yet.</p>
            )}
          </>
        ) : null}
      </Modal>
    </div>
  );
}