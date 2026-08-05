const styles = {
  bar: {
    height: 7,
    background: 'var(--teal-soft)',
    borderRadius: 99,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    display: 'block',
    borderRadius: 99,
  },
};

export default function ProgressBar({ percent = 0, color = 'var(--coral)', style }) {
  return (
    <div className="bar" style={{ ...styles.bar, ...style }}>
      <i
        style={{
          ...styles.fill,
          width: `${Math.min(100, Math.max(0, percent))}%`,
          background: color,
        }}
      />
    </div>
  );
}
