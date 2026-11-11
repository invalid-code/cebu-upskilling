/**
 * Compute the display state of a liquid meter.
 *
 * @param {number | null | undefined} value raw value, clamped to 0-100
 * @param {boolean} reduced true when reduced motion is preferred
 * @returns {{ level: number, waveAmplitude: number, label: string }}
 */
export function computeMeterLevel(value, reduced) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return { level: 0, waveAmplitude: 0, label: '—' }
  }

  // Math.round rounds halves up; the clamp also handles +/-Infinity.
  const level = Math.round(Math.min(100, Math.max(0, value)))
  const waveAmplitude = reduced === true || level === 0 || level === 100 ? 0 : Math.min(4, level / 10)

  return { level, waveAmplitude, label: `${level}%` }
}

export default computeMeterLevel
