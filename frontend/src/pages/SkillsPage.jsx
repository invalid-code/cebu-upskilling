import Button from '../components/ui/Button';
import Panel from '../components/ui/Panel';
import Tag from '../components/ui/Tag';
import EmptyState from '../components/shared/EmptyState';
import { useToast } from '../context/ToastContext';

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
  col12: { gridColumn: '1 / -1' },
  col7: { gridColumn: 'span 7' },
  col5: { gridColumn: 'span 5' },
  sectionTitle: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    margin: '30px 0 15px',
  },
  sectionH3: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 19,
  },
  scaleRow: {
    display: 'flex',
    gap: 7,
    flexWrap: 'wrap',
  },
};

export default function SkillsPage() {
  const { showToast } = useToast();

  return (
    <div className="view-enter">
      <div style={styles.heading}>
        <div>
          <div style={styles.eyebrow}>Your evidence</div>
          <h1 style={styles.h1}>Skill profile</h1>
          <p style={styles.subtitle}>
            Self-declared skills are useful. Verified skills travel further.
          </p>
        </div>
        <Button variant="primary" onClick={() => showToast('Assessment flow opened')}>
          Assess a skill
        </Button>
      </div>

      <div style={styles.grid}>
        <Panel style={styles.col5}>
          <div style={styles.eyebrow}>Target role</div>
          <EmptyState
            title="No target role set"
            description="Choose a role to see skill gaps and recommendations."
          />
        </Panel>

        <Panel style={styles.col7}>
          <div style={{ ...styles.sectionTitle, margin: '0 0 12px' }}>
            <h3 style={styles.sectionH3}>Proficiency scale</h3>
            <Tag>Exact team standard</Tag>
          </div>
          <div style={styles.scaleRow}>
            <Tag variant="coral">1 · No Knowledge</Tag>
            <Tag>2 · Beginner</Tag>
            <Tag>3 · Intermediate</Tag>
            <Tag>4 · Advanced</Tag>
            <Tag variant="good">5 · Expert</Tag>
          </div>
        </Panel>

        <Panel style={styles.col12}>
          <div style={{ ...styles.sectionTitle, margin: '0 0 12px' }}>
            <h3 style={styles.sectionH3}>Assessed skills</h3>
            <span style={{ color: 'var(--muted)', fontSize: 12 }}>Verified skills have a check</span>
          </div>
          <EmptyState
            title="No assessed skills yet"
            description="Take an assessment to verify your skills."
          />
        </Panel>
      </div>
    </div>
  );
}
