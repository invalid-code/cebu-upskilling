const variants = {
  default: {
    background: 'var(--teal-soft)',
    color: 'var(--teal)',
  },
  coral: {
    background: 'var(--coral-soft)',
    color: 'rgb(110, 65, 45)',
  },
  sand: {
    background: 'var(--sand)',
    color: 'rgb(100, 85, 50)',
  },
  good: {
    background: 'rgb(210, 240, 220)',
    color: 'var(--good)',
  },
};

const base = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '5px 9px',
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 700,
  whiteSpace: 'nowrap',
};

export default function Tag({ variant = 'default', children, style }) {
  return (
    <span style={{ ...base, ...variants[variant], ...style }}>
      {children}
    </span>
  );
}
