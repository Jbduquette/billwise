/**
 * Registers the web fonts once the first frame has painted. Text is readable
 * immediately in the metric-matched fallbacks (see index.css), and the fonts
 * never compete with the app bundle for bandwidth on slow connections.
 */
const FACES: { family: string; file: string; style: 'normal' | 'italic'; weight: string }[] = [
  { family: 'Fraunces', file: 'fraunces.woff2', style: 'normal', weight: '100 900' },
  { family: 'Fraunces', file: 'fraunces-italic.woff2', style: 'italic', weight: '100 900' },
  { family: 'Instrument Sans', file: 'instrument-sans.woff2', style: 'normal', weight: '400 700' },
]

export function loadFonts() {
  if (typeof FontFace === 'undefined' || !document.fonts) return
  let started = false
  const start = () => {
    if (started) return
    started = true
    for (const f of FACES) {
      const url = new URL(`fonts/${f.file}`, document.baseURI).href
      const face = new FontFace(f.family, `url("${url}") format("woff2")`, { style: f.style, weight: f.weight, display: 'swap' })
      document.fonts.add(face)
      face.load().catch(() => {
        /* offline or blocked: the fallbacks stay in place */
      })
    }
  }
  // Two frames: the first schedules after React's commit, the second runs after it has painted.
  requestAnimationFrame(() => requestAnimationFrame(start))
  // Backup for tabs that never paint (opened in the background, some in-app browsers): frames don't fire there.
  window.setTimeout(start, 400)
}
