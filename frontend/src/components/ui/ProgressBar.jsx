import LiquidMeter from '../water/LiquidMeter';

/**
 * Thin wrapper over LiquidMeter variant="bar".
 * undefined/null/NaN `percent` displays "—", never "0%".
 */
export default function ProgressBar({ percent, color, style, label = 'Progress', tone }) {
  return <LiquidMeter variant="bar" value={percent} label={label} color={color} tone={tone} style={style} />;
}
