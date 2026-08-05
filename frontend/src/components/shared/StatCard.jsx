const styles = {
  stat: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'end',
    borderBottom: '1px solid var(--line)',
    padding: '0 0 15px',
    marginBottom: 17,
  },
  value: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontWeight: 700,
    fontSize: 30,
    fontVariantNumeric: 'tabular-nums',
    color: 'var(--teal)',
    display: 'block',
  },
  label: {
    fontSize: 12,
    color: 'var(--muted)',
  },
};

export default function StatCard({ value, label, icon: Icon }) {
  return (
    <div className="stat" style={styles.stat}>
      <div>
        <strong style={styles.value}>{value}</strong>
        <span style={styles.label}>{label}</span>
      </div>
      {Icon && <Icon size={20} style={{ color: 'var(--coral)' }} />}
    </div>
  );
}
