import { computeMeterLevel } from '../../lib/water/computeMeterLevel.js';
import { useMotionPreference } from '../../hooks/useMotionPreference.js';
import styles from './LiquidMeter.module.css';

const VARIANTS = ['bar', 'vessel', 'ring'];
const TONES = ['primary', 'good', 'warn'];
const TONE_CLASS = { primary: styles.tonePrimary, good: styles.toneGood, warn: styles.toneWarn };

function isBlank(label) {
  return typeof label !== 'string' || label.trim() === '';
}

/**
 * Water-level meter. `label` is the required accessible name (e.g. "Course progress");
 * the computed value text ("73%" or "—") is always printed.
 * Only transform and opacity are animated.
 *
 * @param {object} props
 * @param {number | null | undefined} props.value 0-100; anything non-numeric shows "—"
 * @param {string} props.label required, non-blank
 * @param {'bar'|'vessel'|'ring'} [props.variant]
 * @param {'primary'|'good'|'warn'} [props.tone]
 * @param {string} [props.color] CSS colour overriding the tone
 * @param {number} [props.waveAmplitude] override of the computed amplitude (px, 0-4)
 * @param {string} [props.className]
 * @param {object} [props.style]
 */
export default function LiquidMeter({
  value,
  label,
  variant = 'bar',
  tone = 'primary',
  color,
  waveAmplitude,
  className,
  style,
}) {
  const { reduced } = useMotionPreference();

  if (isBlank(label)) {
    if (import.meta.env?.DEV !== false) {
      console.error('LiquidMeter: the `label` prop is required and must be a non-blank string.');
    }
    return null;
  }

  const meter = computeMeterLevel(value, reduced);
  const amplitude =
    typeof waveAmplitude === 'number' && Number.isFinite(waveAmplitude)
      ? reduced
        ? 0
        : Math.min(4, Math.max(0, waveAmplitude))
      : meter.waveAmplitude;

  const safeVariant = VARIANTS.includes(variant) ? variant : 'bar';
  const safeTone = TONES.includes(tone) ? tone : 'primary';
  const hasValue = meter.label !== '—';

  const cssVars = {
    '--level': meter.level,
    '--wave-amp': amplitude,
    ...(color ? { '--fill-color': color } : null),
  };
  const aria = {
    role: 'meter',
    'aria-label': label,
    'aria-valuemin': 0,
    'aria-valuemax': 100,
    'aria-valuetext': meter.label,
    ...(hasValue ? { 'aria-valuenow': meter.level } : null),
  };
  const rootClass = [styles.root, TONE_CLASS[safeTone], className].filter(Boolean).join(' ');
  const rootStyle = { ...cssVars, ...style };

  if (safeVariant === 'bar') {
    return (
      <div className={rootClass} style={rootStyle} {...aria}>
        <div className={`bar ${styles.track}`}>
          <i className={styles.fill} style={{ width: `${meter.level}%` }} />
        </div>
        <span className={styles.text}>{meter.label}</span>
      </div>
    );
  }

  return (
    <div className={rootClass} style={rootStyle} {...aria}>
      <div className={styles[safeVariant]}>
        <div className={styles.level} />
        <span className={styles.overlayText}>{meter.label}</span>
      </div>
      <span className={styles.text}>{label}</span>
    </div>
  );
}
