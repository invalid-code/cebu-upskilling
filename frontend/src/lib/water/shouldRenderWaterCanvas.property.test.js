import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { shouldRenderWaterCanvas } from './shouldRenderWaterCanvas.js'

const NUM_RUNS = 200

const envArb = fc.record({
  reduced: fc.boolean(),
  saveData: fc.boolean(),
  webgl2: fc.boolean(),
  cores: fc.integer({ min: 0, max: 32 }),
  inView: fc.boolean(),
  tabVisible: fc.boolean(),
})
const countArb = fc.integer({ min: 0, max: 5 })

const isBlocked = (env, count) =>
  env.reduced || env.saveData || !env.webgl2 || env.cores <= 2 || count >= 1

// Feature: frontend-design, Property 6: Canvas gating and single ambient canvas
describe('Property 6: Canvas gating and single ambient canvas', () => {
  /**
   * **Validates: Requirements 16.1, 16.2, 16.3, 16.4, 16.5**
   */
  it('returns static and never animates when any blocking condition holds', () => {
    fc.assert(
      fc.property(envArb, countArb, (env, count) => {
        fc.pre(isBlocked(env, count))
        const result = shouldRenderWaterCanvas(env, count)
        expect(result).toBe('static')
        expect(result).not.toBe('animate')
      }),
      { numRuns: NUM_RUNS },
    )
  })

  it('returns paused when unblocked and not in view or tab hidden', () => {
    fc.assert(
      fc.property(envArb, countArb, (env, count) => {
        fc.pre(!isBlocked(env, count) && (!env.inView || !env.tabVisible))
        expect(shouldRenderWaterCanvas(env, count)).toBe('paused')
      }),
      { numRuns: NUM_RUNS },
    )
  })

  it('returns animate otherwise', () => {
    fc.assert(
      fc.property(fc.integer({ min: 3, max: 32 }), (cores) => {
        const env = { reduced: false, saveData: false, webgl2: true, cores, inView: true, tabVisible: true }
        expect(shouldRenderWaterCanvas(env, 0)).toBe('animate')
      }),
      { numRuns: NUM_RUNS },
    )
  })

  it('at most one canvas animates: a second canvas is never animate', () => {
    fc.assert(
      fc.property(envArb, fc.integer({ min: 1, max: 5 }), (env, count) => {
        expect(shouldRenderWaterCanvas(env, count)).not.toBe('animate')
      }),
      { numRuns: NUM_RUNS },
    )
  })
})
