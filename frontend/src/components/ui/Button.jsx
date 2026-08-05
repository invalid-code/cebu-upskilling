const variants = {
  primary: {
    background: 'var(--coral)',
    color: 'var(--surface)',
  },
  secondary: {
    background: 'var(--teal)',
    color: 'var(--surface)',
  },
  ghost: {
    background: 'var(--surface2)',
    color: 'var(--teal)',
  },
};

const base = {
  minHeight: 42,
  padding: '10px 15px',
  borderRadius: 10,
  fontWeight: 700,
  fontSize: 13,
  display: 'inline-flex',
  gap: 8,
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'transform 0.15s var(--ease), background 0.15s',
  border: 0,
  cursor: 'pointer',
};

export default function Button({ variant = 'primary', children, style, ...props }) {
  return (
    <button
      style={{ ...base, ...variants[variant], ...style }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}
      {...props}
    >
      {children}
    </button>
  );
}
