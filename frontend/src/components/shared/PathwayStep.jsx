const styles = {
  step: {
    display: 'grid',
    gridTemplateColumns: '28px 1fr',
    gap: 12,
    position: 'relative',
    padding: '0 0 22px',
  },
  dot: {
    width: 25,
    height: 25,
    borderRadius: '50%',
    background: 'var(--teal)',
    color: 'var(--surface)',
    display: 'grid',
    placeItems: 'center',
    fontSize: 12,
    fontWeight: 700,
    position: 'relative',
    zIndex: 1,
  },
  dotCurrent: {
    background: 'var(--coral)',
  },
  title: {
    fontSize: 14,
    margin: '1px 0 4px',
  },
  desc: {
    fontSize: 12,
    margin: 0,
    color: 'var(--muted)',
  },
};

export default function PathwayStep({ step, title, description, current, completed }) {
  return (
    <div className={`path-step ${current ? 'current' : ''}`} style={styles.step}>
      <div
        className="path-dot"
        style={{ ...styles.dot, ...(current ? styles.dotCurrent : {}) }}
      >
        {completed ? '✓' : step}
      </div>
      <div>
        <h4 style={styles.title}>{title}</h4>
        <p style={styles.desc}>{description}</p>
      </div>
    </div>
  );
}
