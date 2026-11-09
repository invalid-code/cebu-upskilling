import { useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { useRipple } from '../../hooks/useRipple';

const variants = {
  primary: {
    background: 'var(--coral)',
    color: 'var(--on-accent)',
  },
  secondary: {
    background: 'var(--teal)',
    color: 'var(--on-accent)',
  },
  ghost: {
    background: 'var(--surface2)',
    color: 'var(--teal)',
  },
};

const base = {
  minHeight: 42,
  padding: '10px 15px',
  borderRadius: 'var(--radius)',
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

export default function Button({ variant = 'primary', children, style, loading = false, ref, ...props }) {
  const isDisabled = loading || props.disabled;
  const innerRef = useRef(null);
  // Ripple press feedback is for the primary button only.
  useRipple(variant === 'primary' ? innerRef : null);
  const setRef = (node) => {
    innerRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };
  return (
    <button
      {...props}
      ref={setRef}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      style={{ ...base, ...variants[variant], ...(variant === 'primary' ? { position: 'relative', overflow: 'hidden' } : {}), ...(isDisabled ? disabledStyle : {}), ...style }}
      onMouseEnter={(e) => { if (!isDisabled) e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}
    >
      {loading && <Loader2 size={14} aria-hidden="true" style={{ animation: 'spin 0.9s linear infinite' }} />}
      {children}
    </button>
  );
}
