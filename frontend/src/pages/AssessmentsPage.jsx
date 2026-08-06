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
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(12, 1fr)',
    gap: 16,
  },
  col7: { gridColumn: 'span 7' },
  col5: { gridColumn: 'span 5' },
};

export default function AssessmentsPage() {
  return (
    <div className="view-enter">
      <div style={styles.heading}>
        <div>
          <div style={styles.eyebrow}>Proof that moves with you</div>
          <h1 style={styles.h1}>Assessments</h1>
          <p style={styles.subtitle}>
            Verified results strengthen your profile and your job match.
          </p>
        </div>
      </div>

      <div style={styles.grid}>
        <Panel style={styles.col7}>
          <EmptyState
            title="No recommended assessment"
            description="When a skill needs verification, we will suggest the fastest assessment here."
          />
        </Panel>

        <Panel style={styles.col5}>
          <h3 style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Recent results</h3>
          <EmptyState
            title="No results yet"
            description="Verified assessment results will appear here."
          />
        </Panel>
      </div>
    </div>
  );
}
