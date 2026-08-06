const styles = {
  empty: {
    textAlign: 'center',
    padding: '28px 16px',
    color: 'var(--muted)',
  },
  title: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 15,
    color: 'var(--ink)',
    margin: '0 0 5px',
  },
  desc: {
    fontSize: 12,
    margin: 0,
    lineHeight: 1.45,
  },
};

export default function EmptyState({ title, description, children }) {
  return (
    <div className="empty-state" style={styles.empty}>
      {title && <h4 style={styles.title}>{title}</h4>}
      {description && <p style={styles.desc}>{description}</p>}
      {children}
    </div>
  );
}
