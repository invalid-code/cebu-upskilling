import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { computeMeterLevel } from './computeMeterLevel.js'

const NUM_RUNS = 200

const anyValue = fc.oneof(
  fc.double(),
  fc.integer({ min: -50, max: 150 }),
  fc.constantFrom(NaN, Infinity, -Infinity, undefined, null, 0, 100),
)

describe('Property 4: Meter wave amplitude', () => {
  // **Validates: Requirements 15.4, 15.5, 15.6**
  it('is 0 when reduced or level is 0/100, otherwise min(4, level / 10)', () => {
    fc.assert(
      fc.property(anyValue, fc.boolean(), (value, reduced) => {
        const { level, waveAmplitude } = computeMeterLevel(value, reduced)
        if (reduced || level === 0 || level === 100) {
          expect(waveAmplitude).toBe(0)
        } else {
          expect(waveAmplitude).toBe(Math.min(4, level / 10))
        }
      }),
      { numRuns: NUM_RUNS },
    )
  })

  it('is positive for mid-range values when motion is allowed', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 99 }), (value) => {
        const { waveAmplitude } = computeMeterLevel(value, false)
        expect(waveAmplitude).toBe(Math.min(4, value / 10))
        expect(waveAmplitude).toBeGreaterThan(0)
      }),
      { numRuns: NUM_RUNS },
    )
  })
})
