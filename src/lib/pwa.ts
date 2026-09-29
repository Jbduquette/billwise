/**
 * The installable app: service-worker registration, "new edition ready" updates and the install prompt.
 * State lives outside React so it can start before the first render; read it with usePwa().
 */

/** Chrome/Edge's install prompt (not yet in the DOM typings). */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export interface PwaState {
  /** Running as the installed app rather than in a browser tab. */
  installed: boolean
  /** The browser offered an install prompt we can show from a button. */
  canInstall: boolean
  /** Installed from this tab just now (the tab itself is still a browser tab). */
  justInstalled: boolean
  /** A new edition has downloaded and is waiting for a reload. */
  updateReady: boolean
}

const standaloneQuery = typeof window !== 'undefined' ? window.matchMedia('(display-mode: standalone)') : null
const isStandalone = () =>
  Boolean(standaloneQuery?.matches || (navigator as Navigator & { standalone?: boolean }).standalone)

let state: PwaState = { installed: false, canInstall: false, justInstalled: false, updateReady: false }
const listeners = new Set<() => void>()
let installEvent: BeforeInstallPromptEvent | null = null
let waiting: ServiceWorker | null = null
let reloading = false

function set(patch: Partial<PwaState>) {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

export const getPwaState = () => state
export function subscribePwa(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

/** iPhone/iPad Safari, which installs only through Share → Add to Home Screen. */
export const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

/** Call once, before the first render, so an early install prompt isn't missed. */
export function initPwa() {
  set({ installed: isStandalone() })
  standaloneQuery?.addEventListener('change', () => set({ installed: isStandalone() }))

  // Keep the browser's own install affordances; just hold on to the event for the Settings button.
  window.addEventListener('beforeinstallprompt', (e) => {
    installEvent = e as BeforeInstallPromptEvent
    set({ canInstall: true })
  })
  window.addEventListener('appinstalled', () => {
    installEvent = null
    set({ canInstall: false, justInstalled: true })
  })

  // The service worker only exists in production builds (npm run build / preview / deploy).
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) window.location.reload()
  })

  const register = async () => {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js', { scope: './' })
      const markWaiting = (sw: ServiceWorker) => {
        // Only an *update* waits; the very first install has no controller and just takes over.
        if (!navigator.serviceWorker.controller) return
        waiting = sw
        set({ updateReady: true })
      }
      const track = (sw: ServiceWorker) =>
        sw.addEventListener('statechange', () => {
          if (sw.state === 'installed') markWaiting(sw)
        })

      if (reg.waiting) markWaiting(reg.waiting)
      if (reg.installing) track(reg.installing)
      reg.addEventListener('updatefound', () => reg.installing && track(reg.installing))

      // An installed app can stay open for days: look for a new edition hourly and whenever it comes back
      // into view (at most every 15 minutes).
      let lastCheck = Date.now()
      const check = () => {
        if (Date.now() - lastCheck < 15 * 60_000) return
        lastCheck = Date.now()
        reg.update().catch(() => {})
      }
      window.setInterval(check, 60 * 60_000)
      document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check())

      // Ask the browser not to clear the ledger under storage pressure. Installed apps are usually granted
      // this silently; in a tab some browsers would show a prompt, so only ask when installed.
      if (isStandalone()) void navigator.storage?.persist?.().catch(() => {})
    } catch {
      /* no service worker (blocked, or file://): the site still works online */
    }
  }

  if (document.readyState === 'complete') void register()
  else window.addEventListener('load', () => void register(), { once: true })
}

/** Switch to the waiting edition. The page reloads once the new service worker takes control. */
export function applyUpdate() {
  if (!waiting) return window.location.reload()
  reloading = true
  waiting.postMessage('skip-waiting')
}

/** Show the browser's install dialog. Resolves with what the person chose. */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const e = installEvent
  if (!e) return 'unavailable'
  // The event can only be used once.
  installEvent = null
  set({ canInstall: false })
  try {
    await e.prompt()
    const { outcome } = await e.userChoice
    if (outcome === 'accepted') set({ justInstalled: true })
    return outcome
  } catch {
    return 'unavailable'
  }
}
