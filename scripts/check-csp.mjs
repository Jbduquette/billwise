// Verifies every inline <script> in dist/index.html is allowed by the Content-Security-Policy in
// netlify.toml. Run after a build (npm run deploy does this) so a stale hash can't ship a broken page.
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

const html = readFileSync('dist/index.html', 'utf8')
const toml = readFileSync('netlify.toml', 'utf8')
const allowed = new Set([...toml.matchAll(/'(sha256-[A-Za-z0-9+/=]+)'/g)].map((m) => m[1]))
const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(
  (m) => `sha256-${createHash('sha256').update(m[1]).digest('base64')}`,
)
const missing = inline.filter((h) => !allowed.has(h))
if (missing.length) {
  console.error(`✗ CSP is missing inline-script hash(es): ${missing.map((h) => `'${h}'`).join(' ')}\n  Update script-src in netlify.toml.`)
  process.exit(1)
}
console.log(`✓ CSP covers all ${inline.length} inline script(s)`)
