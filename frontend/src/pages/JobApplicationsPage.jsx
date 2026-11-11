import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Mail, Target, X } from 'lucide-react';
import Tag from '../components/ui/Tag';
import EmptyState from '../components/shared/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import Button from '../components/ui/Button';
import DataTable from '../components/ui/DataTable';
import Skeleton, { SkeletonStatus } from '../components/ui/Skeleton';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import { resolveFileUrl } from '../utils/fileUrl';
import styles from './JobApplicationsPage.module.css';

const statusOptions = ['applied', 'review', 'interview', 'hired', 'rejected'];
const AI_UNAVAILABLE = 'Suggestions are unavailable right now';

function formatDate(isoString) {
  if (!isoString) return '';
  return new Date(isoString).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

const stop = (e) => e.stopPropagation();

function hasScore(info) {
  return info && typeof info.score === 'number' && Number.isFinite(info.score);
}

export default function JobApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [rankings, setRankings] = useState({});
  const [aiRanked, setAiRanked] = useState(false);
  const [aiUnavailable, setAiUnavailable] = useState(false);
  const [ranking, setRanking] = useState(false);
  const [postFilter, setPostFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const detailRequest = useRef(0);
  const { showToast } = useToast();

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    api.get('/applications/employer')
      .then((data) => setApplications(data || []))
      .catch((err) => setError(err?.message || 'Could not load applications'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const rankWithAi = async () => {
    const postIds = [...new Set(applications.map((app) => app.postId).filter(Boolean))];
    if (postIds.length === 0) return;
    setRanking(true);
    setAiUnavailable(false);
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
      if (err?.status === 502 || err?.status === 503) {
        // Keep applicants in their unranked order; status actions stay enabled.
        setAiUnavailable(true);
      } else {
        showToast(err?.message || 'Could not rank candidates');
      }
    } finally {
      setRanking(false);
    }
  };

  const posts = useMemo(() => {
    const byId = new Map();
    applications.forEach((app) => {
      if (app.postId == null) return;
      const entry = byId.get(app.postId) || { id: app.postId, title: app.postTitle || `Post ${app.postId}`, count: 0 };
      entry.count += 1;
      byId.set(app.postId, entry);
    });
    return [...byId.values()];
  }, [applications]);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = applications.filter((app) => {
      if (postFilter && String(app.postId) !== postFilter) return false;
      if (statusFilter && app.status !== statusFilter) return false;
      if (query && !`${app.learnerName || ''} ${app.learnerEmail || ''}`.toLowerCase().includes(query)) return false;
      return true;
    });
    if (!aiRanked) return filtered;
    return [...filtered].sort(
      (a, b) =>
        (a.postTitle || '').localeCompare(b.postTitle || '') ||
        (rankings[b.applicationId]?.score ?? 0) - (rankings[a.applicationId]?.score ?? 0),
    );
  }, [applications, postFilter, statusFilter, search, aiRanked, rankings]);

  const selected = applications.find((app) => app.applicationId === selectedId) || null;

  const openProfile = useCallback((id) => {
    const requestId = detailRequest.current + 1;
    detailRequest.current = requestId;
    setSelectedId(id);
    setDetail(null);
    setDetailError('');
    setDetailLoading(true);
    api.get(`/applications/employer/${id}`)
      .then((data) => {
        if (detailRequest.current === requestId) setDetail(data);
      })
      .catch((err) => {
        if (detailRequest.current === requestId) setDetailError(err?.message || 'Could not load applicant profile');
      })
      .finally(() => {
        if (detailRequest.current === requestId) setDetailLoading(false);
      });
  }, []);

  const closePane = () => {
    detailRequest.current += 1;
    setSelectedId(null);
    setDetail(null);
    setDetailLoading(false);
    setDetailError('');
  };

  const updateStatus = async (application, status) => {
    if (status === application.status) return;
    setUpdatingId(application.applicationId);
    try {
      await api.patch(`/applications/employer/${application.applicationId}`, { status });
      setApplications((prev) =>
        prev.map((app) => (app.applicationId === application.applicationId ? { ...app, status } : app)),
      );
      showToast(`Application marked as ${status}`, 'success');
    } catch (err) {
      showToast(err?.message || 'Could not update status', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'learnerName',
        label: 'Applicant',
        sortable: true,
        render: (app) => (
          <div>
            <button type="button" className={styles.name} aria-label={`View profile of ${app.learnerName}`}>
              {app.learnerName}
            </button>
            <p className={styles.meta}>{app.learnerEmail} · Applied {formatDate(app.appliedAt)}</p>
            {(app.resumeUrl || app.coverLetterUrl) && (
              <div className={styles.links}>
                {app.resumeUrl && (
                  <a className={styles.link} href={resolveFileUrl(app.resumeUrl)} target="_blank" rel="noreferrer" onClick={stop}>Resume</a>
                )}
                {app.coverLetterUrl && (
                  <a className={styles.link} href={resolveFileUrl(app.coverLetterUrl)} target="_blank" rel="noreferrer" onClick={stop}>Cover letter</a>
                )}
              </div>
            )}
          </div>
        ),
      },
      { key: 'postTitle', label: 'Post', sortable: true },
      {
        key: 'appliedAt',
        label: 'Applied',
        sortable: true,
        sortValue: (app) => (app.appliedAt ? new Date(app.appliedAt) : null),
        render: (app) => formatDate(app.appliedAt),
      },
      {
        key: 'rank',
        label: 'AI rank',
        sortable: true,
        sortValue: (app) => (hasScore(rankings[app.applicationId]) ? rankings[app.applicationId].score : null),
        render: (app) => {
          const info = rankings[app.applicationId];
          return hasScore(info)
            ? <span className={styles.rank} title={info.rationale}>{Math.round(info.score)}%</span>
            : <span className={styles.notRanked}>Not ranked</span>;
        },
      },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        render: (app) => (
          <span onClick={stop} onKeyDown={stop} role="presentation">
            <select
              className={styles.statusSelect}
              value={app.status}
              disabled={updatingId === app.applicationId}
              onChange={(e) => updateStatus(app, e.target.value)}
              aria-label={`Status for ${app.learnerName}`}
            >
              {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </span>
        ),
      },
    ],
    // updateStatus closes over setters and showToast only
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rankings, updatingId],
  );

  if (loading) {
    return (
      <div className="view-enter">
        <SkeletonStatus label="Loading applications...">
          <div className={styles.panel}>
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className={styles.skelRow}>
                <div className={styles.skelGrow}>
                  <Skeleton height={14} width="28%" style={{ marginBottom: 8 }} />
                  <Skeleton height={12} width="45%" />
                </div>
                <Skeleton height={26} width={84} radius={13} />
              </div>
            ))}
          </div>
        </SkeletonStatus>
      </div>
    );
  }

  const rankInfo = selected ? rankings[selected.applicationId] : null;
  const current = selected ? { ...(detail || {}), ...selected } : null;

  return (
    <div className="view-enter">
      <div className={styles.heading}>
        <div>
          <div className={styles.eyebrow}>Keep the pipeline moving</div>
          <h1 className={styles.title}>Job applications</h1>
        </div>
        <div className={styles.actions}>
          <Button variant="ghost" disabled={ranking || applications.length === 0} onClick={rankWithAi}>
            {ranking ? 'Ranking...' : '✨ Rank with AI'}
          </Button>
          <Link to="/post-job" style={{ textDecoration: 'none' }}>
            <Button variant="primary">Post a job</Button>
          </Link>
        </div>
      </div>

      {aiUnavailable && (
        <div className={styles.notice} role="status">{AI_UNAVAILABLE}</div>
      )}

      {error ? (
        <ErrorState title="Applications unavailable" error={error} onRetry={load} />
      ) : applications.length === 0 ? (
        <EmptyState
          title="No applications yet"
          description="Applications from learners will show up here with their resume and cover letter."
          action={{ label: 'Post a job', href: '/post-job' }}
        />
      ) : (
        <>
          <div className={styles.filters} role="group" aria-label="Filter applicants">
            <label className={styles.filter}>
              Post
              <select className={styles.control} value={postFilter} onChange={(e) => setPostFilter(e.target.value)}>
                <option value="">All posts</option>
                {posts.map((post) => (
                  <option key={post.id} value={String(post.id)}>{`${post.title} (${post.count})`}</option>
                ))}
              </select>
            </label>
            <label className={styles.filter}>
              Status
              <select className={styles.control} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All statuses</option>
                {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </label>
            <label className={styles.filter}>
              Search
              <input
                type="search"
                className={styles.control}
                value={search}
                placeholder="Name or email"
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
          </div>

          <div className={`${styles.layout} ${current ? styles.layoutWithPane : ''}`}>
            <div className={styles.panel}>
              <DataTable
                caption="Applicants for your job posts"
                columns={columns}
                rows={rows}
                getRowId={(app) => app.applicationId}
                onRowSelect={openProfile}
              />
            </div>

            {current && (
              <aside className={styles.pane} role="dialog" aria-modal="false" aria-label={`Applicant: ${current.learnerName}`}>
                <div className={styles.paneHead}>
                  <div>
                    <div className={styles.eyebrow}>Applicant profile</div>
                    <h2 className={styles.paneTitle}>{current.learnerName || 'Applicant'}</h2>
                  </div>
                  <button type="button" className={styles.close} onClick={closePane} aria-label="Close applicant detail">
                    <X size={16} aria-hidden="true" />
                  </button>
                </div>

                <div className={styles.field}>
                  <span className={styles.fieldLabel}>AI rank</span>
                  {hasScore(rankInfo) ? (
                    <span className={styles.rank}>
                      {Math.round(rankInfo.score)}%{rankInfo.rationale ? ` — ${rankInfo.rationale}` : ''}
                    </span>
                  ) : (
                    <span className={styles.notRanked}>Not ranked</span>
                  )}
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}><Mail size={14} aria-hidden="true" /> Email</span>
                  <span>{current.learnerEmail || '—'}</span>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}><Target size={14} aria-hidden="true" /> Target role</span>
                  <span>{detail?.targetRole || '—'}</span>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Applied for</span>
                  <span>{current.postTitle}</span>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Status</span>
                  <Tag>{current.status}</Tag>
                </div>

                <h3 className={styles.section}>Status actions</h3>
                <div className={styles.statusActions} role="group" aria-label="Change application status">
                  {statusOptions.map((status) => (
                    <button
                      key={status}
                      type="button"
                      className={styles.statusButton}
                      aria-pressed={current.status === status}
                      disabled={updatingId === current.applicationId}
                      onClick={() => updateStatus(selected, status)}
                    >
                      Mark {status}
                    </button>
                  ))}
                </div>

                {detailLoading ? (
                  <SkeletonStatus label="Loading profile...">
                    {Array.from({ length: 4 }, (_, i) => (
                      <div key={i} className={styles.skelRow}>
                        <Skeleton height={12} width={92} />
                        <Skeleton height={12} width="45%" />
                      </div>
                    ))}
                  </SkeletonStatus>
                ) : detailError ? (
                  <>
                    <h3 className={styles.section}>Skills</h3>
                    <p className={styles.error} role="alert">{detailError}</p>
                    <Button variant="ghost" onClick={() => openProfile(selected.applicationId)}>Retry</Button>
                  </>
                ) : detail ? (
                  <>
                    <h3 className={styles.section}>Submitted documents</h3>
                    {!detail.resumeUrl && !detail.coverLetterUrl ? (
                      <p className={styles.muted}>No documents uploaded with this application.</p>
                    ) : (
                      <div className={styles.links}>
                        {detail.resumeUrl && (
                          <a className={styles.link} href={resolveFileUrl(detail.resumeUrl)} target="_blank" rel="noreferrer">
                            <FileText size={14} aria-hidden="true" /> Resume
                          </a>
                        )}
                        {detail.coverLetterUrl && (
                          <a className={styles.link} href={resolveFileUrl(detail.coverLetterUrl)} target="_blank" rel="noreferrer">
                            <FileText size={14} aria-hidden="true" /> Cover letter
                          </a>
                        )}
                      </div>
                    )}

                    <h3 className={styles.section}>Skills ({detail.skills?.length || 0})</h3>
                    {detail.skills?.length ? (
                      <div className={styles.skills}>
                        {detail.skills.map((skill) => (
                          <div key={skill.name} className={styles.skill}>
                            <span className={styles.skillName}>
                              {skill.name}
                              {skill.verified && <Tag style={{ marginLeft: 8 }}>Verified</Tag>}
                            </span>
                            <span className={styles.level}>Level {skill.currentLevel}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className={styles.muted}>No skills tracked yet.</p>
                    )}
                  </>
                ) : null}
              </aside>
            )}
          </div>
        </>
      )}
    </div>
  );
}
