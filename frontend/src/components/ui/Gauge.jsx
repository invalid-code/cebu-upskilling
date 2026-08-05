const styles = {
  wrap: {
    width: 126,
    height: 126,
    borderRadius: '50%',
    display: 'grid',
    placeItems: 'center',
    position: 'relative',
    flexShrink: 0,
  },
  bg: {
    position: 'absolute',
    inset: 0,
    borderRadius: '50%',
  },
  inner: {
    position: 'absolute',
    inset: 12,
    background: 'var(--surface)',
    borderRadius: '50%',
  },
  label: {
    position: 'relative',
    zIndex: 1,
    fontFamily: "'Space Grotesk', sans-serif",
    fontWeight: 700,
    fontSize: 29,
    color: 'var(--teal)',
  },
};

export default function Gauge({ percent = 0, size = 126 }) {
  const scaled = { ...styles.wrap, width: size, height: size };
  return (
    <div style={scaled}>
      <div
        style={{
          ...styles.bg,
          background: `conic-gradient(var(--coral) 0 ${percent}%, var(--teal-soft) ${percent}% 100%)`,
        }}
      />
      <div style={{ ...styles.inner, inset: size * 0.095 }} />
      <span style={styles.label}>{percent}%</span>
    </div>
  );
}
