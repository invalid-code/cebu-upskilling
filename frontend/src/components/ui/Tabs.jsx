const styles = {
  bar: {
    display: 'flex',
    gap: 7,
    borderBottom: '1px solid var(--line)',
    marginBottom: 18,
    overflow: 'auto',
  },
  tab: {
    background: 'transparent',
    color: 'var(--muted)',
    padding: '11px 12px',
    borderBottom: '2px solid transparent',
    whiteSpace: 'nowrap',
    fontWeight: 700,
    fontSize: 13,
    border: 0,
    cursor: 'pointer',
  },
  active: {
    color: 'var(--teal)',
    borderBottomColor: 'var(--coral)',
  },
};

export default function Tabs({ tabs, active, onChange }) {
  return (
    <div className="tabs" style={styles.bar}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          className="tab"
          style={{ ...styles.tab, ...(active === tab.key ? styles.active : {}) }}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
