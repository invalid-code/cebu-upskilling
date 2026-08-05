const base = {
  background: 'var(--surface)',
  border: '1px solid var(--line)',
  borderRadius: 18,
  padding: 22,
  boxShadow: '0 8px 30px rgba(30, 50, 40, 0.04)',
};

export default function Panel({ children, style, ...props }) {
  return (
    <div className="panel" style={{ ...base, ...style }} {...props}>
      {children}
    </div>
  );
}
