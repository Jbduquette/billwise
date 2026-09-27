// Renders the brand templates in scripts/brand/ to PNGs in public/ using headless Chrome.
// Usage: npm run brand   (set CHROME_PATH if Chrome isn't in the default location)
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const candidates = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean)
const chrome = candidates.find((p) => existsSync(p))
if (!chrome) throw new Error('Chrome not found. Set CHROME_PATH.')

const jobs = [
  { page: 'icon.html', out: 'apple-touch-icon.png', w: 180, h: 180 },
  { page: 'icon.html', out: 'icon-192.png', w: 192, h: 192 },
  { page: 'icon.html', out: 'icon-512.png', w: 512, h: 512 },
  { page: 'og.html', out: 'og-image.png', w: 1200, h: 630 },
]

const profile = mkdtempSync(join(tmpdir(), 'billwise-brand-'))
try {
  for (const { page, out, w, h } of jobs) {
    execFileSync(chrome, [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      '--default-background-color=00000000',
      `--user-data-dir=${profile}`,
      `--window-size=${w},${h}`,
      `--screenshot=${join(root, 'public', out)}`,
      '--virtual-time-budget=2000',
      `${pathToFileURL(join(root, 'scripts', 'brand', page)).href}?s=${w}`,
    ], { stdio: 'ignore' })
    console.log(`✓ public/${out} (${w}×${h})`)
  }
} finally {
  rmSync(profile, { recursive: true, force: true })
}
