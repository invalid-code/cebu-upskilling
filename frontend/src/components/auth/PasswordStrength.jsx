import { getPasswordStrength } from '../../lib/passwordStrength';
import styles from './Auth.module.css';

/**
 * Password strength meter. Derived from `password` on every render, so it
 * updates on each keystroke. Shows exactly one text label (Weak/Fair/Good/Strong);
 * renders nothing for an empty password.
 */
export default function PasswordStrength({ password, id }) {
  const strength = getPasswordStrength(password);
  if (!strength) return null;
  return (
    <div className={styles.strength} id={id}>
      <div className={styles.strengthBars} aria-hidden="true">
        {[1, 2, 3, 4].map((n) => (
          <span
            key={n}
            className={`${styles.strengthBar} ${n <= strength.level ? styles.strengthBarOn : ''}`}
            data-level={strength.level}
          />
        ))}
      </div>
      <div className={styles.strengthText} role="status" aria-live="polite">
        <span>Password strength:</span>
        <span className={styles.strengthLabel}>{strength.label}</span>
      </div>
    </div>
  );
}
