import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';
import pageStyles from './PageStates.module.css';

/** Extracts a displayable message from a string or an `{ error }` / Error-like value. */
export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  if (typeof error.error === 'string' && error.error) return error.error;
  if (typeof error.message === 'string' && error.message) return error.message;
  return fallback;
}

/**
 * Page-level error state: shows the error message and a Retry button.
 * Retry is disabled while a retry is pending. Pass `children` to keep previously loaded data visible.
 */
export default function ErrorState({ error, onRetry, pending = false, title = 'We couldn\u2019t load this', children }) {
  return (
    <div>
      <div className={pageStyles.error} role="alert">
        <span className={pageStyles.errorIcon} aria-hidden="true"><AlertTriangle size={24} /></span>
        <h3 className={pageStyles.title}>{title}</h3>
        <p className={pageStyles.errorMessage}>{getErrorMessage(error)}</p>
        {onRetry && (
          <button type="button" className={pageStyles.retry} onClick={onRetry} disabled={pending} aria-busy={pending || undefined}>
            <RefreshCw size={14} aria-hidden="true" /> Retry
          </button>
        )}
      </div>
      {children && <div className={pageStyles.retained}>{children}</div>}
    </div>
  );
}

const styles = {
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
  title: {
    fontFamily: 'var(--font-display)',
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
  card: {
    position: 'relative',
    background: 'var(--surface)',
    border: '1px solid var(--line)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
  },
  cardError: {
    background: 'linear-gradient(180deg, var(--danger-soft) 0%, var(--surface) 62%)',
    borderColor: 'rgba(183,54,41,0.16)',
  },
  banner: {
    display: 'flex',
    gap: 12,
    alignItems: 'flex-start',
    padding: '14px 14px',
    background: 'var(--danger-soft)',
    border: '1px solid rgba(183,54,41,0.14)',
    borderRadius: 12,
    color: 'var(--danger)',
  },
  bannerIcon: {
    width: 30,
    height: 30,
    borderRadius: '50%',
    background: 'var(--danger)',
    color: 'var(--on-accent)',
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
    color: 'var(--coral-ink)',
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
    color: 'var(--on-accent)',
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
          <button type="button" onClick={onDismiss} aria-label="Dismiss" style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(183,54,41,0.08)', color: 'var(--danger)', display: 'grid', placeItems: 'center', border: 0, cursor: 'pointer' }}>
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
