// Ship gate: runs every check, blocks (exit 1) naming each failing check, permits shipping only if all pass.
// Reqs: 25.6, 25.7, 23.4, 23.6, 23.7, 16.11
// Usage: npm run ship-gate
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'

export const CHECKS = [
  { name: 'unit tests (npm test)', cmd: npm, args: ['test'] },
  { name: 'lint (npm run lint)', cmd: npm, args: ['run', 'lint'] },
  { name: 'build (npm run build)', cmd: npm, args: ['run', 'build'] },
  { name: 'bundle size and chunk isolation', cmd: process.execPath, args: [join('scripts', 'check-bundle.mjs')] },
  { name: 'Playwright suite (npm run test:e2e)', cmd: npm, args: ['run', 'test:e2e'] },
]

export function runGate(checks = CHECKS, run = defaultRun) {
  const failed = []
  for (const check of checks) {
    console.log(`\n=== ship-gate: ${check.name} ===`)
    if (run(check) !== 0) {
      failed.push(check.name)
      console.error(`ship-gate: FAILED - ${check.name}`)
    }
  }
  return failed
}

function defaultRun(check) {
  const r = spawnSync(check.cmd, check.args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' })
  return r.status ?? 1
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const failed = runGate()
  if (failed.length) {
    console.error(`\nship-gate: BLOCKED. Failing checks:\n${failed.map((n) => `  - ${n}`).join('\n')}`)
    process.exit(1)
  }
  console.log('\nship-gate: all checks passed. Shipping permitted.')
}
