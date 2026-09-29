import { useEffect, useSyncExternalStore } from 'react'
import { applyUpdate, getPwaState, subscribePwa, type PwaState } from '../lib/pwa'
import { useToast } from '../state/toast'

/** Install and update state for the app (see lib/pwa.ts). */
export function usePwa(): PwaState {
  return useSyncExternalStore(subscribePwa, getPwaState, getPwaState)
}

/** When a new edition has downloaded, offer to reload into it. */
export function useUpdateToast() {
  const { updateReady } = usePwa()
  const toast = useToast()
  useEffect(() => {
    if (!updateReady) return
    toast('A new edition of Billwise is ready.', {
      tone: 'info',
      action: { label: 'Reload', onClick: applyUpdate },
      // Stay up a good while; if dismissed, the update applies the next time the app is opened.
      duration: 10 * 60_000,
    })
  }, [updateReady, toast])
}
