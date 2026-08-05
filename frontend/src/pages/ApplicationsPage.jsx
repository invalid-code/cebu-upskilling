import Panel from '../components/ui/Panel';
import StatusBadge from '../components/ui/StatusBadge';
import Button from '../components/ui/Button';

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
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 96px 86px',
    gap: 14,
    alignItems: 'center',
    borderBottom: '1px solid var(--line)',
    padding: '14px 0',
  },
  title: {
    fontSize: 14,
    marginBottom: 4,
  },
  subtitle2: {
    fontSize: 11,
    color: 'var(--muted)',
  },
};

const applications = [
  { title: 'Frontend Developer (React)', company: 'Serbisyo Digital', date: 'Applied Jul 15', status: 'interview' },
  { title: 'Landing Page Builder', company: 'Mango Apps', date: 'Applied Jul 12', status: 'review' },
  { title: 'Junior Web Assistant', company: 'Banilad Retail Co.', date: 'Saved Jul 10', status: 'default' },
];

export default function ApplicationsPage() {
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
        {applications.map((app) => (
          <div key={app.title} style={styles.row}>
            <div>
              <h4 style={styles.title}>{app.title}</h4>
              <small style={styles.subtitle2}>{app.company} · {app.date}</small>
            </div>
            <StatusBadge status={app.status} />
            <Button variant="ghost" style={{ padding: '5px 8px', minHeight: 28 }}>
              Open
            </Button>
          </div>
        ))}
      </Panel>
    </div>
  );
}
