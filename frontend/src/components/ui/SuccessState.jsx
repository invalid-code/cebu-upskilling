import { CheckCircle2, Sparkles, Award, ArrowRight } from 'lucide-react';

const styles = {
  wrap: {
    textAlign: 'center',
    padding: '28px 18px 22px',
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: '50%',
    background: 'var(--teal-soft)',
    color: 'var(--teal)',
    display: 'inline-grid',
    placeItems: 'center',
    marginBottom: 14,
  },
  iconWrapLarge: {
    width: 64,
    height: 64,
  },
  title: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 18,
    fontWeight: 800,
    color: 'var(--ink)',
    margin: '0 0 6px',
  },
  description: {
    fontSize: 13,
    color: 'var(--muted)',
    lineHeight: 1.5,
    maxWidth: 360,
    margin: '0 auto 16px',
  },
  actions: {
    display: 'flex',
    gap: 8,
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 16,
  },
  confetti: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    overflow: 'hidden',
    borderRadius: 'inherit',
  },
  card: {
    position: 'relative',
    background: 'var(--surface)',
    border: '1px solid var(--line)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
  },
  cardSuccess: {
    background: 'linear-gradient(180deg, var(--teal-soft) 0%, var(--surface) 52%)',
    borderColor: 'rgba(26,107,90,0.16)',
  },
};

export function InlineSuccess({ title, description, icon: CustomIcon }) {
  const Icon = CustomIcon || CheckCircle2;
  return (
    <div style={styles.wrap} role="status" aria-live="polite">
      <div style={styles.iconWrap} aria-hidden="true">
        <Icon size={28} />
      </div>
      {title && <h4 style={styles.title}>{title}</h4>}
      {description && <p style={styles.description}>{description}</p>}
    </div>
  );
}

export function SuccessBanner({ title, description, icon: CustomIcon, children }) {
  const Icon = CustomIcon || Sparkles;
  return (
    <div style={{ ...styles.card, ...styles.cardSuccess, padding: '18px 20px', display: 'flex', gap: 14, alignItems: 'center' }} role="status" aria-live="polite">
      <div style={{ ...styles.iconWrap, marginBottom: 0, width: 44, height: 44 }} aria-hidden="true">
        <Icon size={20} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>{title}</div>
        {description && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, lineHeight: 1.5 }}>{description}</div>}
      </div>
      {children && <div style={{ flexShrink: 0 }}>{children}</div>}
    </div>
  );
}

export function SuccessCard({ title, description, eyebrow, icon: CustomIcon, children, actionLabel, onAction }) {
  const Icon = CustomIcon || Award;
  return (
    <div style={{ ...styles.card, ...styles.cardSuccess, padding: '28px 24px', textAlign: 'center' }} role="status" aria-live="polite">
      <div style={{ ...styles.iconWrap, ...styles.iconWrapLarge }} aria-hidden="true">
        <Icon size={30} />
      </div>
      {eyebrow && <div style={{ color: 'var(--teal)', fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>{eyebrow}</div>}
      <h3 style={styles.title}>{title}</h3>
      {description && <p style={styles.description}>{description}</p>}
      {children}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          style={{
            marginTop: 16,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--teal)',
            color: 'var(--surface)',
            padding: '10px 16px',
            borderRadius: 10,
            fontWeight: 700,
            fontSize: 13,
            border: 0,
            cursor: 'pointer',
          }}
        >
          {actionLabel} <ArrowRight size={14} />
        </button>
      )}
    </div>
  );
}

export default InlineSuccess;
