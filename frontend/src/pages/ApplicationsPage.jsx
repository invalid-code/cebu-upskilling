import { Link } from 'react-router-dom';
import Panel from '../components/ui/Panel';
import Button from '../components/ui/Button';
import EmptyState from '../components/shared/EmptyState';
import { useApplications } from '../context/ApplicationsContext';

const statusConfig = {
  applied: {
    label: 'Applied',
    background: 'rgba(20, 184, 166, 0.1)',
    color: 'var(--teal)',
  },
  interview: {
    label: 'Interview',
    background: 'var(--coral-soft)',
    color: 'var(--coral)',
  },
  review: {
    label: 'Under review',
    background: 'rgba(234, 179, 8, 0.15)',
    color: '#b45309',
  },
  saved: {
    label: 'Saved',
    background: 'var(--teal-soft)',
    color: 'var(--teal)',
  },
  rejected: {
    label: 'Rejected',
    background: 'rgba(239, 68, 68, 0.1)',
    color: '#dc2626',
  },
  hired: {
    label: 'Hired',
    background: 'rgba(20, 184, 166, 0.15)',
    color: 'var(--good, #0f766e)',
  },
};

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
  list: {
    display: 'flex',
    flexDirection: 'column',
  },
  item: {
    display: 'flex',
    justifyContent: 'space-between',
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
  },
  title: {
    fontSize: 15,
    fontWeight: 700,
    margin: 0,
    color: 'var(--text, #1a2e28)',
  },
  meta: {
    fontSize: 12,
    color: 'var(--muted)',
    margin: 0,
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  badge: (status) => {
    const config = statusConfig[status] || statusConfig.applied;
    return {
      fontSize: 11,
      fontWeight: 600,
      color: config.color,
      background: config.background,
      padding: '5px 12px',
      borderRadius: 20,
      whiteSpace: 'nowrap',
    };
  },
  openButton: {
    padding: '6px 16px',
    minHeight: 32,
    fontSize: 12,
    background: 'transparent',
    color: 'var(--teal)',
    border: '1px solid var(--teal)',
    borderRadius: 8,
  },
};

function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

export default function ApplicationsPage() {
  const { applications } = useApplications();

  return (
    <div className="view-enter">
      <div style={styles.heading}>
        <div>
          <div style={styles.eyebrow}>Keep the loop closed</div>
          <h1 style={styles.h1}>Applications</h1>
          <p style={styles.subtitle}>
            See what needs your attention, not just what happened.
          </p>
        </div>
      </div>

      <Panel>
        {applications.length === 0 ? (
          <EmptyState
            title="No applications yet"
            description="Jobs you apply to will show up here with their status."
          />
        ) : (
          <div style={styles.list}>
            {applications.map((job, index) => {
              const isLast = index === applications.length - 1;
              const status = job.status || 'applied';
              const statusLabel = statusConfig[status]?.label || 'Applied';
              const dateLabel = job.savedAt ? `Saved ${formatDate(job.savedAt)}` : `Applied ${formatDate(job.appliedAt)}`;

              return (
                <div
                  key={job.id}
                  style={isLast ? { ...styles.item, ...styles.itemLast } : styles.item}
                >
                  <div style={styles.info}>
                    <h4 style={styles.title}>{job.title}</h4>
                    <p style={styles.meta}>{job.company} · {dateLabel}</p>
                  </div>
                  <div style={styles.actions}>
                    <span style={styles.badge(status)}>{statusLabel}</span>
                    <Link to={`/jobs/${job.id}`} style={{ textDecoration: 'none' }}>
                      <Button variant="ghost" style={styles.openButton}>
                        Open
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}
