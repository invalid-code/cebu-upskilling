import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';

const styles = {
  wrap: {
    textAlign: 'center',
    padding: '28px 18px 22px',
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: '50%',
    background: 'var(--danger-soft)',
    color: 'var(--danger)',
    display: 'inline-grid',
    placeItems: 'center',
    marginBottom: 14,
  },
  iconWrapLarge: {
    width: 64,
    height: 64,
  },
  iconWrapMuted: {
    background: 'var(--coral-soft)',
    color: 'var(--coral)',
  },
  title: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 17,
    fontWeight: 800,
    color: 'var(--ink)',
    margin: '0 0 6px',
  },
  description: {
    fontSize: 13,
    color: 'var(--muted)',
    lineHeight: 1.5,
    maxWidth: 380,
    margin: '0 auto 16px',
  },
  actions: {
    display: 'flex',
    gap: 8,
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 16,
  },
  card: {
    position: 'relative',
    background: 'var(--surface)',
    border: '1px solid var(--line)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
  },
  cardError: {
    background: 'linear-gradient(180deg, var(--danger-soft) 0%, var(--surface) 62%)',
    borderColor: 'rgba(192,57,43,0.16)',
  },
  banner: {
    display: 'flex',
    gap: 12,
    alignItems: 'flex-start',
    padding: '14px 14px',
    background: 'var(--danger-soft)',
    border: '1px solid rgba(192,57,43,0.14)',
    borderRadius: 12,
    color: 'var(--danger)',
  },
  bannerIcon: {
    width: 30,
    height: 30,
    borderRadius: '50%',
    background: 'var(--danger)',
    color: 'var(--surface)',
    display: 'grid',
    placeItems: 'center',
    flexShrink: 0,
  },
  bannerText: {
    flex: 1,
    minWidth: 0,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: 800,
    color: 'var(--danger)',
    lineHeight: 1.2,
  },
  bannerDesc: {
    fontSize: 12,
    color: 'rgb(110,65,45)',
    lineHeight: 1.45,
    marginTop: 3,
  },
  fieldError: {
    display: 'flex',
    gap: 6,
    alignItems: 'flex-start',
    color: 'var(--danger)',
    fontSize: 12,
    fontWeight: 600,
    lineHeight: 1.4,
    marginTop: 4,
  },
  retryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: 'var(--danger)',
    color: 'var(--surface)',
    padding: '10px 16px',
    borderRadius: 10,
    fontWeight: 700,
    fontSize: 13,
    border: 0,
    cursor: 'pointer',
  },
  retryGhost: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: 'var(--surface)',
    color: 'var(--danger)',
    border: '1px solid var(--line)',
    padding: '10px 16px',
    borderRadius: 10,
    fontWeight: 700,
    fontSize: 13,
    cursor: 'pointer',
  },
};

export function InlineError({ title, description, icon: CustomIcon = AlertTriangle, onRetry, retryLabel = 'Try again' }) {
  const Icon = CustomIcon;
  return (
    <div style={styles.wrap} role="alert" aria-live="assertive">
      <div style={styles.iconWrap} aria-hidden="true">
        <Icon size={26} />
      </div>
      {title && <h4 style={styles.title}>{title}</h4>}
      {description && <p style={styles.description}>{description}</p>}
      {onRetry && (
        <div style={styles.actions}>
          <button type="button" onClick={onRetry} style={styles.retryBtn}>
            <RefreshCw size={14} /> {retryLabel}
          </button>
        </div>
      )}
    </div>
  );
}

export function ErrorCard({ title, description, onRetry, retryLabel = 'Try again', icon: CustomIcon }) {
  const Icon = CustomIcon || WifiOff;
  return (
    <div style={{ ...styles.card, ...styles.cardError, padding: '28px 24px', textAlign: 'center' }} role="alert" aria-live="assertive">
      <div style={{ ...styles.iconWrap, ...styles.iconWrapLarge }} aria-hidden="true">
        <Icon size={28} />
      </div>
      <h3 style={styles.title}>{title || 'Something went wrong'}</h3>
      {description && <p style={styles.description}>{description}</p>}
      {onRetry && (
        <button type="button" onClick={onRetry} style={styles.retryBtn}>
          <RefreshCw size={14} /> {retryLabel}
        </button>
      )}
    </div>
  );
}

export function ErrorBanner({ title, description, onRetry, retryLabel = 'Retry', onDismiss }) {
  return (
    <div style={styles.banner} role="alert" aria-live="assertive">
      <div style={styles.bannerIcon} aria-hidden="true">
        <AlertTriangle size={15} />
      </div>
      <div style={styles.bannerText}>
        <div style={styles.bannerTitle}>{title || 'Request failed'}</div>
        {description && <div style={styles.bannerDesc}>{description}</div>}
      </div>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
        {onRetry && (
          <button type="button" onClick={onRetry} style={{ ...styles.retryGhost, padding: '7px 12px', fontSize: 12 }}>
            <RefreshCw size={12} /> {retryLabel}
          </button>
        )}
        {onDismiss && (
          <button type="button" onClick={onDismiss} aria-label="Dismiss" style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(192,57,43,0.08)', color: 'var(--danger)', display: 'grid', placeItems: 'center', border: 0, cursor: 'pointer' }}>
            ×
          </button>
        )}
      </div>
    </div>
  );
}

export function FieldError({ children, id }) {
  if (!children) return null;
  return (
    <div id={id} style={styles.fieldError} role="alert">
      <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

export function RateLimitBanner({ retryAfter, onRetry }) {
  return (
    <ErrorBanner
      title="Too many requests"
      description={retryAfter ? `Please wait ${retryAfter}s before trying again.` : 'You’ve hit the rate limit — please wait a moment and retry.'}
      onRetry={onRetry}
      retryLabel="Retry"
    />
  );
}

export default InlineError;
