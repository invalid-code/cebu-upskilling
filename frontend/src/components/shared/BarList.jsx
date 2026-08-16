const styles = {
  title: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 19,
    margin: '0 0 18px',
  },
  list: { display: 'grid', gap: 15 },
  row: { display: 'grid', gridTemplateColumns: 'minmax(90px, 150px) 1fr auto', gap: 10, alignItems: 'center' },
  label: { fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  track: { height: 10, background: 'var(--surface2)', borderRadius: 999, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999, minWidth: 2, transition: 'width 0.25s ease' },
  value: { fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--muted)' },
  sublabel: { gridColumn: '2 / -1', marginTop: -6, fontSize: 12, color: 'var(--muted)' },
};

export default function BarList({ title, items = [] }) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <section aria-label={title}>
      <h3 style={styles.title}>{title}</h3>
      {items.length === 0 ? (
        <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>No data available yet.</p>
      ) : (
        <div style={styles.list}>
          {items.map((item) => (
            <div key={item.label} style={styles.row}>
              <span style={styles.label} title={item.label}>{item.label}</span>
              <div style={styles.track} aria-label={`${item.label}: ${item.value}`}>
                <div style={{ ...styles.fill, width: `${(item.value / max) * 100}%`, background: item.color || 'var(--teal)' }} />
              </div>
              <span style={styles.value}>{item.value}</span>
              {item.sublabel && <span style={styles.sublabel}>{item.sublabel}</span>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
