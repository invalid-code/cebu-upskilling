import { useMotionPreference } from '../../hooks/useMotionPreference';
import styles from './TideTransition.module.css';

/**
 * Route transition wrapper. Changing `transitionKey` remounts the wrapper, which plays a 220ms
 * opacity fade-in with 6px vertical drift (--ease-tide). No displacement filter is ever applied.
 * Under prefers-reduced-motion the content is rendered with no animation, so the change is immediate.
 */
export default function TideTransition({ transitionKey, children }) {
  const { reduced } = useMotionPreference();

  if (reduced) {
    return (
      <div key={transitionKey} className={styles.root} data-tide="reduced">
        {children}
      </div>
    );
  }

  return (
    <div key={transitionKey} className={`${styles.root} ${styles.enter}`} data-tide="animated">
      {children}
    </div>
  );
}
