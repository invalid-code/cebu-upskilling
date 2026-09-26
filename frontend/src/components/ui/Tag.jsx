import { chipTeal } from '../../styles/shared';
const variants = {
  default: { ...chipTeal },
  coral: {
    background: 'var(--coral-soft)',
    color: 'var(--coral-ink)',
  },
  sand: {
    background: 'var(--sand)',
    color: 'var(--sand-ink)',
  },
  good: {
    background: 'var(--good-soft)',
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
