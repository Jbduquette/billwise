import { useCallback, useSyncExternalStore } from 'react'

export type Route = 'dashboard' | 'bills' | 'calendar' | 'settings'

const ROUTES: Record<string, Route> = {
  '': 'dashboard',
  '/': 'dashboard',
  '/bills': 'bills',
  '/calendar': 'calendar',
  '/settings': 'settings',
}

export const hrefFor = (r: Route) => (r === 'dashboard' ? '#/' : `#/${r}`)

function read(): Route {
  const path = window.location.hash.replace(/^#/, '').split('?')[0]
  return ROUTES[path] ?? 'dashboard'
}

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}

/** Hash routing: deep-linkable, works on any static host, and the back button just works. */
export function useHashRoute(): [Route, (r: Route) => void] {
  const route = useSyncExternalStore(subscribe, read, () => 'dashboard' as Route)
  const navigate = useCallback((r: Route) => {
    if (read() !== r) window.location.hash = hrefFor(r)
  }, [])
  return [route, navigate]
}
