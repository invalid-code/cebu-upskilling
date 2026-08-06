import Panel from '../components/ui/Panel';
import EmptyState from '../components/shared/EmptyState';

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
};

export default function CredentialsPage() {
  return (
    <div className="view-enter">
      <div style={styles.heading}>
        <div>
          <div style={styles.eyebrow}>Your portable record</div>
          <h1 style={styles.h1}>Credentials</h1>
          <p style={styles.subtitle}>
            A long-term record of the skills you can show, not just claim.
          </p>
        </div>
      </div>

      <Panel>
        <EmptyState
          title="No credentials yet"
          description="Skills you verify through proctored assessments will be stored here as portable credentials."
        />
      </Panel>
    </div>
  );
}
