import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { computeMeterLevel } from './computeMeterLevel.js'

const NUM_RUNS = 200

// Feature: frontend-design, Property 3: Meter bounds and label
describe('Property 3: Meter bounds and label', () => {
  /**
   * **Validates: Requirements 15.1, 15.2, 15.3, 15.11**
   */
  const finiteOrInfinite = fc.oneof(
    fc.double({ noNaN: true, min: -1e6, max: 1e6 }),
    fc.integer({ min: -200, max: 300 }),
    fc.double({ noNaN: true }), // includes +/-Infinity and extreme magnitudes
    fc.constantFrom(Infinity, -Infinity, 0, -0, 0.5, 99.5, 100, 100.5, -0.5),
  )

  it('level is an integer within 0-100 and label is `${level}%` for any numeric value', () => {
    fc.assert(
      fc.property(finiteOrInfinite, fc.boolean(), (value, reduced) => {
        const { level, label } = computeMeterLevel(value, reduced)
        expect(Number.isInteger(level)).toBe(true)
        expect(level).toBeGreaterThanOrEqual(0)
        expect(level).toBeLessThanOrEqual(100)
        expect(label).toBe(`${level}%`)
      }),
      { numRuns: NUM_RUNS },
    )
  })

  it('clamps to 0-100 and rounds half up for in-range values', () => {
    fc.assert(
      fc.property(fc.double({ noNaN: true, min: 0, max: 100, noDefaultInfinity: true }), (value) => {
        expect(computeMeterLevel(value, false).level).toBe(Math.floor(value + 0.5))
      }),
      { numRuns: NUM_RUNS },
    )
    fc.assert(
      fc.property(fc.double({ noNaN: true, max: 0 }), (value) => {
        expect(computeMeterLevel(value, false).level).toBe(0)
      }),
      { numRuns: NUM_RUNS },
    )
    fc.assert(
      fc.property(fc.double({ noNaN: true, min: 100 }), (value) => {
        expect(computeMeterLevel(value, false).level).toBe(100)
      }),
      { numRuns: NUM_RUNS },
    )
  })

  it('half values round up', () => {
    expect(computeMeterLevel(0.5, false).level).toBe(1)
    expect(computeMeterLevel(49.5, false).level).toBe(50)
    expect(computeMeterLevel(99.5, false).level).toBe(100)
    expect(computeMeterLevel(0.4, false).level).toBe(0)
  })

  it('+Infinity maps to 100% and -Infinity maps to 0%', () => {
    expect(computeMeterLevel(Infinity, false)).toMatchObject({ level: 100, label: '100%' })
    expect(computeMeterLevel(-Infinity, false)).toMatchObject({ level: 0, label: '0%' })
  })

  it('undefined, null, NaN and non-numeric values give level 0, amplitude 0 and label "—"', () => {
    const invalid = fc.constantFrom(undefined, null, NaN, '50', {}, [], true)
    fc.assert(
      fc.property(invalid, fc.boolean(), (value, reduced) => {
        expect(computeMeterLevel(value, reduced)).toEqual({ level: 0, waveAmplitude: 0, label: '—' })
      }),
      { numRuns: NUM_RUNS },
    )
    for (const v of [undefined, null, NaN]) {
      expect(computeMeterLevel(v, false)).toEqual({ level: 0, waveAmplitude: 0, label: '—' })
    }
  })

  it('a valid zero is labelled "0%", never "—"', () => {
    expect(computeMeterLevel(0, false).label).toBe('0%')
  })
})
