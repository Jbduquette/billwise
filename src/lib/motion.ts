/** Shared easing: fast out, long settle. */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const

/**
 * Entrance flourishes (figures setting, rules drawing) play on the first screen only.
 * After that, content appears instantly on navigation; only real changes animate.
 */
export const intro = { done: false }

export function finishIntroSoon() {
  window.setTimeout(() => {
    intro.done = true
  }, 1400)
}

/**
 * Entries skipped in the last moment. A row that leaves an open list because it was skipped
 * must not draw the "settled" pen-stroke on its way out; the row checks this set on exit.
 */
const recentSkips = new Set<string>()

export function markRecentlySkipped(key: string) {
  recentSkips.add(key)
  window.setTimeout(() => recentSkips.delete(key), 2000)
}

export const wasRecentlySkipped = (key: string) => recentSkips.has(key)

/** Entries settled moments ago in this session: their PAID stamp lands, rather than already being there. */
const recentPays = new Set<string>()

export function markRecentlyPaid(key: string) {
  recentPays.add(key)
  window.setTimeout(() => recentPays.delete(key), 2000)
}

export const wasRecentlyPaid = (key: string) => recentPays.has(key)
