import styles from '../ui/PageStates.module.css';

/**
 * Empty state: explanatory text plus at most one primary action.
 * Pass the action as `action={{ label, onClick }}` (or `{ label, href }`).
 * `children` remains supported for existing callers.
 */
export default function EmptyState({ title, description, action, children }) {
  return (
    <div className={`empty-state ${styles.empty}`}>
      {title && <h4 className={styles.title}>{title}</h4>}
      {description && <p className={styles.desc}>{description}</p>}
      {action && (action.href ? (
        <a className={styles.action} href={action.href} onClick={action.onClick}>{action.label}</a>
      ) : (
        <button type="button" className={`${styles.retry} ${styles.action}`} onClick={action.onClick}>
          {action.label}
        </button>
      ))}
      {children}
    </div>
  );
}
