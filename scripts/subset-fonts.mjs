// Builds the self-hosted fonts in public/fonts from the Fontsource variable sources:
// Latin-1 plus typographic punctuation, with each face's axes limited to the ranges the design uses.
// Usage: npm run fonts
import subsetFont from 'subset-font'
import { readFileSync, writeFileSync } from 'node:fs'
const src = 'node_modules/@fontsource-variable'
// Latin-1 (accented names like café) + typographic punctuation, arrows and common currency signs.
let text = ''
for (let c = 0x20; c <= 0x7e; c++) text += String.fromCharCode(c)
for (let c = 0xa0; c <= 0xff; c++) text += String.fromCharCode(c)
text += '‘’“”–—…•·×→←↑↓€£¥₹₩₱₽₺′″‹›«»№™−'
const jobs = [
  ['fraunces/files/fraunces-latin-opsz-normal.woff2', 'fraunces.woff2', { wght: { min: 300, max: 600 }, opsz: { min: 9, max: 144 } }],
  ['fraunces/files/fraunces-latin-wght-italic.woff2', 'fraunces-italic.woff2', { wght: { min: 300, max: 500 } }],
  ['instrument-sans/files/instrument-sans-latin-wght-normal.woff2', 'instrument-sans.woff2', { wght: { min: 400, max: 700 } }],
]
for (const [from, to, variationAxes] of jobs) {
  const input = readFileSync(`${src}/${from}`)
  const out = await subsetFont(input, text, { targetFormat: 'woff2', variationAxes })
  writeFileSync(`public/fonts/${to}`, out)
  console.log(`✓ public/fonts/${to}: ${(input.length / 1024).toFixed(1)}KB -> ${(out.length / 1024).toFixed(1)}KB`)
}
