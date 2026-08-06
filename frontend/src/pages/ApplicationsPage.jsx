import Panel from '../components/ui/Panel';
import EmptyState from '../components/shared/EmptyState';
import { useApplications } from '../context/ApplicationsContext';

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
    gap: 12,
  },
  item: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    border: '1px solid var(--line)',
    borderRadius: 12,
    background: 'var(--surface)',
  },
  info: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: 600,
    margin: 0,
  },
  company: {
    fontSize: 12,
    color: 'var(--muted)',
    margin: 0,
  },
  meta: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  badge: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--teal)',
    background: 'rgba(20, 184, 166, 0.1)',
    padding: '4px 10px',
    borderRadius: 20,
  },
  salary: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontWeight: 700,
    fontSize: 13,
  },
  skills: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  skill: {
    fontSize: 10,
    color: 'var(--muted)',
    background: 'rgba(0,0,0,0.04)',
    padding: '2px 8px',
    borderRadius: 8,
  },
};

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
            {applications.map((job) => (
              <div key={job.id} style={styles.item}>
                <div style={styles.info}>
                  <h4 style={styles.title}>{job.title}</h4>
                  <p style={styles.company}>{job.company} · {job.location}</p>
                  <div style={styles.skills}>
                    {job.skills?.map((skill) => (
                      <span key={skill} style={styles.skill}>{skill}</span>
                    ))}
                  </div>
                </div>
                <div style={styles.meta}>
                  <span style={styles.salary}>{job.salary}</span>
                  <span style={styles.badge}>Applied</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
