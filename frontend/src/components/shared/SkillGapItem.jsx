import ProgressBar from '../ui/ProgressBar';
import Tag from '../ui/Tag';

const styles = {
  gap: {
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
  subtitle: {
    fontSize: 11,
    color: 'var(--muted)',
  },
  level: {
    fontSize: 11,
    color: 'var(--muted)',
    textAlign: 'right',
  },
};

export default function SkillGapItem({ name, subtitle, percent, gapLabel, verified }) {
  const tagVariant = gapLabel === 'Ready' || gapLabel === 'Verified' ? 'good' : 'coral';

  return (
    <div className="gap" style={styles.gap}>
      <div>
        <h4 style={styles.title}>
          {name} {verified && <Tag variant="good">Verified</Tag>}
        </h4>
        <small style={styles.subtitle}>{subtitle}</small>
      </div>
      <ProgressBar
        percent={percent}
        color={percent >= 100 ? 'var(--teal2)' : 'var(--coral)'}
      />
      <div className="level" style={styles.level}>
        <Tag variant={tagVariant}>{gapLabel}</Tag>
      </div>
    </div>
  );
}
