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
