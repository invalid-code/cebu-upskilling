import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import Panel from '../components/ui/Panel';
import EmptyState from '../components/shared/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import Skeleton, { SkeletonStatus } from '../components/ui/Skeleton';
import { useApplications } from '../context/ApplicationsContext';
import { useAuth } from '../context/AuthContext';
import styles from './ApplicationsPage.module.css';

// The text label always names the current status; colour is only a secondary cue.
const STATUS_LABELS = {
  applied: 'Applied',
  interview: 'Interview',
  review: 'Under review',
  saved: 'Saved',
  rejected: 'Rejected',
  hired: 'Hired',
};

const STATUS_TONE = {
  applied: styles.toneInfo,
  interview: styles.toneAccent,
  review: styles.toneWarn,
  saved: styles.toneInfo,
  rejected: styles.toneDanger,
  hired: styles.toneGood,
};

// Timeline stage names are distinct from status labels so each status is named once, in the label.
const TIMELINE = ['Submitted', 'Reviewing', 'Interviewing', 'Decision'];

/** Index of the current timeline stage for a status; -1 means no stage reached yet (saved). */
const STAGE_OF = { saved: -1, applied: 0, review: 1, interview: 2, hired: 3, rejected: 3 };

function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

function StatusTimeline({ status }) {
  const current = STAGE_OF[status] ?? 0;
  return (
    <ol className={styles.timeline} aria-label="Application progress">
      {TIMELINE.map((stage, index) => {
        const state = index < current ? 'completed' : index === current ? 'current' : 'upcoming';
        const decision = index === 3 && (status === 'hired' || status === 'rejected');
        return (
          <li
            key={stage}
            className={`${styles.stage} ${styles[`stage_${state}`]}`}
            aria-current={state === 'current' ? 'step' : undefined}
          >
            <span className={styles.marker} aria-hidden="true">
              {state === 'completed' ? <Check size={12} strokeWidth={3} /> : null}
            </span>
            <span className={styles.stageName}>{stage}</span>
            <span className={styles.srOnly}>
              {state === 'completed' ? ' (completed)' : state === 'current' ? ' (current)' : ' (not reached)'}
              {decision ? `: ${STATUS_LABELS[status]}` : ''}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function ApplicationsSkeleton() {
  return (
    <>
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className={styles.skeletonItem}>
          <Skeleton height={16} width="45%" />
          <Skeleton height={12} width="30%" style={{ marginTop: 8 }} />
          <Skeleton height={20} width="100%" style={{ marginTop: 16 }} />
        </div>
      ))}
    </>
  );
}

export default function ApplicationsPage() {
  const { applications, loading, error, fetchApplications } = useApplications();
  const { user } = useAuth();
  const retry = () => fetchApplications?.(undefined, user, { force: true });

  const list = (
    <ul className={styles.list}>
      {applications.map((job) => {
        const status = job.status || 'applied';
        const statusLabel = STATUS_LABELS[status] || STATUS_LABELS.applied;
        const dateLabel = job.savedAt ? `Saved ${formatDate(job.savedAt)}` : `Applied ${formatDate(job.appliedAt)}`;
        return (
          <li key={job.id} className={styles.item}>
            <div className={styles.top}>
              <div className={styles.info}>
                <h2 className={styles.jobTitle}>{job.title}</h2>
                <p className={styles.meta}>{job.company} · {dateLabel}</p>
              </div>
              <div className={styles.actions}>
                <span className={styles.statusWrap}>
                  <span className={styles.statusCaption}>Status</span>
                  <span className={`${styles.badge} ${STATUS_TONE[status] || styles.toneInfo}`}>{statusLabel}</span>
                </span>
                <Link to={`/jobs/${job.id}`} className={styles.open}>Open</Link>
              </div>
            </div>
            <StatusTimeline status={status} />
          </li>
        );
      })}
    </ul>
  );

  let body;
  if (loading) {
    body = (
      <SkeletonStatus label="Loading applications...">
        <ApplicationsSkeleton />
      </SkeletonStatus>
    );
  } else if (error) {
    body = (
      <ErrorState error={error} onRetry={retry} title="We couldn’t load your applications">
        {applications.length > 0 ? list : null}
      </ErrorState>
    );
  } else if (applications.length === 0) {
    body = (
      <EmptyState
        title="No applications yet"
        description="Jobs you apply to will show up here with their status."
      />
    );
  } else {
    body = list;
  }

  return (
    <div className={`view-enter ${styles.page}`}>
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>Keep the loop closed</p>
          <h1 className={styles.title}>Applications</h1>
          <p className={styles.subtitle}>See what needs your attention, not just what happened.</p>
        </div>
      </div>
      <Panel>{body}</Panel>
    </div>
  );
}
