// Vite plugin: writes dist/sw.js from pwa/service-worker.js once the build is on disk, listing every
// file the app needs offline. The version is a hash of those files, so each deploy that changes anything
// ships a new service worker and installed apps pick it up.
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

// Files the app never needs offline: the 404 redirect page, crawler/share files and font licences.
const SKIP_PRECACHE = /^(sw\.js|404\.(html|js)|robots\.txt|og-image\.png|.*\.txt)$/

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]))

/** @returns {import('vite').Plugin} */
export function serviceWorker() {
  let outDir = 'dist'
  return {
    name: 'billwise-service-worker',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      const files = walk(outDir)
        .map((f) => relative(outDir, f).split('\\').join('/'))
        .filter((f) => !SKIP_PRECACHE.test(f))
        .sort()
      const template = readFileSync(join(here, 'service-worker.js'), 'utf8')
      const hash = createHash('sha256').update(template)
      for (const f of files) hash.update(f).update(readFileSync(join(outDir, f)))
      const version = hash.digest('hex').slice(0, 12)
      const source = template
        .replace("'__VERSION__'", JSON.stringify(version))
        .replace('__PRECACHE__', JSON.stringify(files))
      writeFileSync(join(outDir, 'sw.js'), source)
      console.log(`sw.js: edition ${version}, ${files.length} files precached`)
    },
  }
}
