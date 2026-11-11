import { AlertTriangle } from 'lucide-react';
import styles from './Auth.module.css';

/** Centered card with brand header, title and optional subtitle for the auth pages. */
export default function AuthCard({ title, subtitle, wide = false, centered = false, children }) {
  return (
    <div className={styles.page}>
      <div className={[styles.card, wide && styles.cardWide, centered && styles.centered].filter(Boolean).join(' ')}>
        <div className={styles.brand}>
          <div className={styles.mark} aria-hidden="true">CU</div>
          <strong className={styles.brandName}>Cebu Upskilling</strong>
        </div>
        <h1 className={styles.title}>{title}</h1>
        {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
        {children}
      </div>
    </div>
  );
}

/** Form-level error summary (server errors, rate limit). Renders nothing without a message. */
export function FormSummary({ children, id }) {
  if (!children) return null;
  return (
    <div id={id} className={styles.summary} role="alert">
      <AlertTriangle size={16} className={styles.summaryIcon} aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}
