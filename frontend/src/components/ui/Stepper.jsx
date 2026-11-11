import styles from './Stepper.module.css';

const STATUS_TEXT = {
  completed: 'Completed',
  current: 'Current',
  'not-started': 'Not started',
};

/** Status of the step at `index` relative to the zero-based `current` index. */
export function stepStatus(index, current) {
  if (index < current) return 'completed';
  if (index === current) return 'current';
  return 'not-started';
}

/**
 * Multi-step progress indicator used by Register and Course Studio.
 * Shows "Step N of TOTAL" and, per step, its number plus a text status
 * (Not started / Current / Completed), so state is never conveyed by colour alone.
 * `current` is the zero-based index of the active step.
 * When `onSelect` is given, steps are buttons that call `onSelect(index)`.
 */
export function Stepper({ steps, current, onSelect }) {
  const list = Array.isArray(steps) ? steps : [];
  const total = list.length;
  const active = Number.isInteger(current) ? Math.min(Math.max(current, 0), Math.max(total - 1, 0)) : 0;

  return (
    <div className={styles.stepper}>
      <p className={styles.summary}>
        Step {total === 0 ? 0 : active + 1} of {total}
      </p>
      <ol className={styles.list}>
        {list.map((step, index) => {
          const label = typeof step === 'string' ? step : step?.label ?? '';
          const status = stepStatus(index, active);
          const className = [
            styles.step,
            styles[status === 'not-started' ? 'notStarted' : status],
            typeof onSelect === 'function' ? '' : styles.static,
          ]
            .filter(Boolean)
            .join(' ');
          const content = (
            <>
              <span className={styles.badge} aria-hidden="true">
                <span>{status === 'completed' ? '✓' : index + 1}</span>
              </span>
              <span className={styles.text}>
                <span className={styles.label}>{label}</span>
                <span className={styles.status}>
                  Step {index + 1} of {total}: {STATUS_TEXT[status]}
                </span>
              </span>
            </>
          );
          return (
            <li
              key={typeof step === 'object' && step?.id != null ? step.id : `${index}-${label}`}
              className={`${styles.item} ${status === 'completed' ? styles.completed : ''}`}
            >
              {typeof onSelect === 'function' ? (
                <button
                  type="button"
                  className={className}
                  aria-current={status === 'current' ? 'step' : undefined}
                  onClick={() => onSelect(index)}
                >
                  {content}
                </button>
              ) : (
                <div className={className} aria-current={status === 'current' ? 'step' : undefined}>
                  {content}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default Stepper;
