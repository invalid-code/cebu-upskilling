import { Loader2 } from 'lucide-react';

const variants = {
  primary: {
    background: 'var(--coral)',
    color: '#fff',
  },
  secondary: {
    background: 'var(--teal)',
    color: '#fff',
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

const disabledStyle = {
  opacity: 0.62,
  cursor: 'not-allowed',
  transform: 'none',
};

export default function Button({ variant = 'primary', children, style, loading = false, ...props }) {
  const isDisabled = loading || props.disabled;
  return (
    <button
      {...props}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      style={{ ...base, ...variants[variant], ...(isDisabled ? disabledStyle : {}), ...style }}
      onMouseEnter={(e) => { if (!isDisabled) e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}
    >
      {loading && <Loader2 size={14} aria-hidden="true" style={{ animation: 'spin 0.9s linear infinite' }} />}
      {children}
    </button>
  );
}
