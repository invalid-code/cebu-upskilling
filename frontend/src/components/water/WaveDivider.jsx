import { useMotionPreference } from '../../hooks/useMotionPreference';
import styles from './WaveDivider.module.css';

// Two identical periods across a 1440 wide viewBox so a -50% translate loops seamlessly.
const WAVE_BACK = 'M0 36 C180 6 540 66 720 36 C900 6 1260 66 1440 36 L1440 80 L0 80 Z';
const WAVE_FRONT = 'M0 48 C180 72 540 24 720 48 C900 72 1260 24 1440 48 L1440 80 L0 80 Z';

const TONES = ['soft', 'surface', 'primary'];

/**
 * Decorative two-layer SVG wave between sections.
 * Drift animates transform only; frozen (no animation) under prefers-reduced-motion.
 */
export default function WaveDivider({ flip = false, tone = 'soft' }) {
  const { reduced } = useMotionPreference();
  const safeTone = TONES.includes(tone) ? tone : 'soft';
  const layerClass = reduced ? styles.layer : `${styles.layer} ${styles.drift}`;

  return (
    <div
      className={`${styles.divider} ${styles[safeTone]}`}
      data-flip={flip ? 'true' : 'false'}
      data-frozen={reduced ? 'true' : 'false'}
      data-testid="wave-divider"
      aria-hidden="true"
      style={flip ? { transform: 'scaleY(-1)' } : undefined}
    >
      <svg className={`${layerClass} ${styles.back}`} viewBox="0 0 1440 80" preserveAspectRatio="none" focusable="false">
        <path d={WAVE_BACK} fill="currentColor" />
      </svg>
      <svg className={`${layerClass} ${styles.front}`} viewBox="0 0 1440 80" preserveAspectRatio="none" focusable="false">
        <path d={WAVE_FRONT} fill="currentColor" />
      </svg>
    </div>
  );
}
