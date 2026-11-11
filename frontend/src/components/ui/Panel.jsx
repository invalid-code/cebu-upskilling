const base = {
  background: 'var(--surface)',
  border: '1px solid var(--line)',
  borderRadius: 'var(--radius-lg)',
  padding: 22,
  boxShadow: '0 8px 30px rgba(14, 25, 40, 0.04)',
};

export default function Panel({ children, style, ...props }) {
  return (
    <div className="panel" style={{ ...base, ...style }} {...props}>
      {children}
    </div>
  );
}
