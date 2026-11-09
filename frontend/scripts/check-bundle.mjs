// Bundle checks on the Vite build output (run after `npm run build`).
//   1. Landing initial JS (entry + landing route chunk + their static imports) <= 184,320 gzip bytes.
//   2. No mediapipe / pdfjs / mammoth / water-shader chunk in the initial landing load.
// Reqs: 23.4, 23.6, 23.7, 16.11
import { readFileSync, existsSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const MAX_GZIP_BYTES = 184320
const FORBIDDEN = /mediapipe|pdfjs|mammoth|shader/i
const LANDING_KEY = 'src/pages/LandingPage.jsx'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')

export function collectInitialChunks(manifest) {
  const entry = Object.entries(manifest).find(([, c]) => c.isEntry)
  if (!entry) throw new Error('No entry chunk in manifest')
  const landing = manifest[LANDING_KEY]
  if (!landing) throw new Error(`Manifest has no ${LANDING_KEY}`)
  const seen = new Set()
  const visit = (key) => {
    if (seen.has(key)) return
    seen.add(key)
    for (const dep of manifest[key].imports ?? []) visit(dep) // static imports only
  }
  visit(entry[0])
  visit(LANDING_KEY)
  return [...seen]
}

export function checkBundle() {
  const manifestPath = join(dist, '.vite', 'manifest.json')
  if (!existsSync(manifestPath)) throw new Error('dist/.vite/manifest.json missing - run `npm run build` first')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  const keys = collectInitialChunks(manifest)
  const failures = []
  let total = 0
  const rows = []
  for (const key of keys) {
    const chunk = manifest[key]
    const bytes = gzipSync(readFileSync(join(dist, chunk.file))).length
    total += bytes
    rows.push(`  ${chunk.file}  ${bytes} B gzip`)
    if (FORBIDDEN.test(key) || FORBIDDEN.test(chunk.file) || FORBIDDEN.test(chunk.name ?? '')) {
      failures.push(`Forbidden chunk in initial landing load: ${chunk.file} (${key})`)
    }
  }
  if (total > MAX_GZIP_BYTES) {
    failures.push(`Landing initial JS is ${total} gzip bytes, exceeds budget ${MAX_GZIP_BYTES}`)
  }
  return { total, rows, failures }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const { total, rows, failures } = checkBundle()
    console.log('Landing initial JS chunks:\n' + rows.join('\n'))
    console.log(`Landing initial JS total: ${total} gzip bytes (budget ${MAX_GZIP_BYTES})`)
    if (failures.length) {
      for (const f of failures) console.error(`FAIL: ${f}`)
      process.exit(1)
    }
    console.log('Bundle check passed.')
  } catch (e) {
    console.error(`FAIL: ${e.message}`)
    process.exit(1)
  }
}
