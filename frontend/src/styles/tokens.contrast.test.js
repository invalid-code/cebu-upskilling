import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'

// Feature: frontend-design, Property 8: Contrast
// **Validates: Requirements 14.2**

const css = readFileSync(resolve(process.cwd(), 'src/styles/tokens.css'), 'utf8')

function parseBlock(selectorPattern) {
  const match = css.match(new RegExp(`${selectorPattern}\\s*\\{([^}]*)\\}`))
  const vars = {}
  for (const m of match[1].matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;/g)) vars[m[1]] = m[2]
  return vars
}

const light = parseBlock(':root(?![.\\w])')
const dark = { ...light, ...parseBlock(':root\\.dark') }

const TEXT = 4.5 // normal text
const LARGE = 3 // large text and UI boundaries / graphical objects

// Declared [foreground, background, minimum ratio] pairs used in both themes.
const PAIRS = [
  // Body and secondary text on every surface
  ['--ink', '--bg', TEXT],
  ['--ink', '--surface', TEXT],
  ['--ink', '--surface2', TEXT],
  ['--muted', '--bg', TEXT],
  ['--muted', '--surface', TEXT],
  ['--muted', '--surface2', TEXT],
  // Primary and accent text
  ['--teal', '--bg', TEXT],
  ['--teal', '--surface', TEXT],
  ['--teal', '--teal-soft', TEXT],
  ['--coral', '--surface', TEXT],
  ['--coral-ink', '--coral-soft', TEXT],
  // Status text
  ['--good', '--surface', TEXT],
  ['--good', '--good-soft', TEXT],
  ['--danger', '--surface', TEXT],
  ['--danger', '--danger-soft', TEXT],
  ['--amber-ink', '--surface', TEXT],
  ['--amber-ink', '--warn-soft', TEXT],
  ['--violet', '--violet-soft', TEXT],
  ['--sand-ink', '--sand', TEXT],
  // Text on solid accent fills (buttons, badges, toasts)
  ['--on-accent', '--teal', TEXT],
  ['--on-accent', '--coral', TEXT],
  ['--on-accent', '--good', TEXT],
  ['--on-accent', '--danger', TEXT],
  // Rail / mobile nav
  ['--rail-text', '--rail-bg', TEXT],
  ['--rail-muted', '--rail-bg', TEXT],
  ['--rail-strong', '--rail-bg', TEXT],
  ['--rail-active-text', '--rail-active-bg', TEXT],
  // UI boundaries and graphical objects (3:1): focus ring, meter fill, status dots
  ['--teal', '--bg', LARGE],
  ['--teal', '--surface', LARGE],
  ['--teal', '--surface2', LARGE],
  ['--status-live', '--surface', LARGE],
  ['--status-wait', '--surface', LARGE],
  ['--status-idle', '--surface', LARGE],
]

const THEMES = { light, dark }

function channel(v) {
  const c = v / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function luminance(hex) {
  const n = parseInt(hex.slice(1), 16)
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

describe('design tokens contrast (Property 8)', () => {
  it('parses both themes', () => {
    expect(Object.keys(light).length).toBeGreaterThan(30)
    expect(dark['--bg']).toBe('#06151c')
  })

  it('every declared pair meets its minimum ratio in light and dark', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.keys(THEMES)),
        fc.constantFrom(...PAIRS),
        (theme, [fg, bg, min]) => {
          const tokens = THEMES[theme]
          expect(tokens[fg], `${fg} missing`).toBeDefined()
          expect(tokens[bg], `${bg} missing`).toBeDefined()
          const ratio = contrast(tokens[fg], tokens[bg])
          expect(ratio, `${theme}: ${fg} ${tokens[fg]} on ${bg} ${tokens[bg]} = ${ratio.toFixed(2)} (< ${min})`)
            .toBeGreaterThanOrEqual(min)
        },
      ),
      { numRuns: 200 },
    )
  })

  it('exhaustively covers every pair once per theme', () => {
    for (const [theme, tokens] of Object.entries(THEMES)) {
      for (const [fg, bg, min] of PAIRS) {
        expect(contrast(tokens[fg], tokens[bg]), `${theme}: ${fg} on ${bg}`).toBeGreaterThanOrEqual(min)
      }
    }
  })
})
