// Renders scripts/review/board.html (the running dev app, framed at several sizes) to review/*.png.
// Usage: npm run dev  (in another terminal), then  npm run review [-- "route:theme:w:h,..."]
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const chrome = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome'].find((p) => p && existsSync(p))
if (!chrome) throw new Error('Chrome not found. Set CHROME_PATH.')

const frames = process.argv[2] ?? 'dashboard:light:1440:1180,dashboard:dark:390:844,bills:light:390:844'
const specs = frames.split(',').map((f) => f.split(':'))
const width = specs.reduce((s, [, , w]) => s + Number(w) + 40, 40)
const height = Math.max(...specs.map(([, , , h]) => Number(h))) + 110
const name = process.argv[3] ?? 'board'

mkdirSync(join(root, 'review'), { recursive: true })
const profile = mkdtempSync(join(tmpdir(), 'billwise-review-'))
try {
  const url = `${process.env.DEV_URL ?? 'http://localhost:5173'}/scripts/review/board.html?frames=${encodeURIComponent(frames)}`
  execFileSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', `--user-data-dir=${profile}`, `--window-size=${width},${height}`, '--virtual-time-budget=15000', `--screenshot=${join(root, 'review', `${name}.png`)}`, url], { stdio: 'ignore' })
  console.log(`✓ review/${name}.png (${width}×${height})`)
} finally {
  rmSync(profile, { recursive: true, force: true })
}
