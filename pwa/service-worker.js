// Billwise service worker: makes the installed app open instantly and work offline.
// This is a template. At build time pwa/vite-plugin.mjs fills in the version and the precache list,
// and writes the result to dist/sw.js. The service worker never runs in `npm run dev`.

const VERSION = '__VERSION__'
const PRECACHE = __PRECACHE__
const CACHE = `billwise-${VERSION}`

const scope = self.registration.scope
const INDEX = new URL('index.html', scope).href

// Fill the cache with this edition. `cache: 'reload'` skips the HTTP cache so a stale copy can't sneak in.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE.map((p) => new Request(new URL(p, scope), { cache: 'reload' })))),
  )
})

// A new edition waits until the page asks for it (the "Reload" toast), so a running page never loses
// its code mid-session. Once active, drop every older edition's cache.
self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k.startsWith('billwise-') && k !== CACHE).map((k) => caches.delete(k)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  if (req.mode === 'navigate') {
    const path = url.origin + url.pathname
    if (path === scope || path === INDEX) {
      // The app shell comes from the cache, so the app opens offline and never waits on the network.
      event.respondWith(caches.match(INDEX, { cacheName: CACHE, ignoreVary: true }).then((hit) => hit || fetch(req)))
    } else {
      // Mistyped paths (/bills, /Calendar/) go to the network's 404 redirect page; offline, go home.
      event.respondWith(fetch(req).catch(() => Response.redirect(scope, 302)))
    }
    return
  }

  // ignoreVary: the precache is keyed by URL alone. Servers answer with `Vary: Origin`, and Chrome sends an
  // Origin header with <script crossorigin> requests, so a strict match would miss and fail offline.
  event.respondWith(caches.match(req, { cacheName: CACHE, ignoreVary: true }).then((hit) => hit || fetch(req)))
})

// Tapping a reminder brings Billwise forward, or opens it if it was closed.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const open = windows.find((c) => c.url.startsWith(scope))
      return open ? open.focus() : self.clients.openWindow(scope)
    })(),
  )
})
