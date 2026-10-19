import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { pluralize } from '../lib/format'
import { readLocal, writeLocal } from '../lib/storage'
import {
  SYNC_META_KEY,
  fingerprint,
  getClient,
  isEmptyLedger,
  keepDeviceSettings,
  mergeLedgers,
  remote,
  syncAvailable,
  type SyncMeta,
} from '../lib/sync'
import type { AppData } from '../lib/types'
import { useStore } from './store'
import { useToast } from './toast'
import { useUI } from './ui'

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error'

interface SyncValue {
  available: boolean
  /** Signed in and syncing on this device. */
  meta: SyncMeta | null
  status: SyncStatus
  lastSynced: number | null
  error: string | null
  /** The address a sign-in code was sent to, while waiting for it. */
  pendingEmail: string | null
  sendCode: (email: string) => Promise<void>
  verifyCode: (code: string) => Promise<void>
  cancelSignIn: () => void
  syncNow: () => void
  signOut: () => Promise<void>
  deleteSynced: () => Promise<void>
}

const SyncContext = createContext<SyncValue | null>(null)

/** Debounce between an edit and saving it to the cloud. */
const SAVE_DELAY = 1200
/** While the app is in view, check for changes made on other devices this often. */
const POLL_EVERY = 90_000
const PENDING_KEY = 'billwise:sync-pending'

const message = (e: unknown) =>
  e && typeof e === 'object' && 'message' in e && typeof e.message === 'string' ? e.message : 'Something went wrong.'

/**
 * Optional cross-device sync through Supabase. The ledger in localStorage stays the working copy, so
 * the app works offline exactly as before; this keeps one row per person in step with it.
 * Nothing here runs, and the Supabase client is never downloaded, until someone signs in.
 */
export function SyncProvider({ children }: { children: ReactNode }) {
  const { data, dispatch } = useStore()
  const { confirm } = useUI()
  const toast = useToast()
  const [meta, setMetaState] = useState<SyncMeta | null>(() => (syncAvailable ? readLocal<SyncMeta | null>(SYNC_META_KEY, null) : null))
  const [pendingEmail, setPendingEmail] = useState<string | null>(() => readLocal<string | null>(PENDING_KEY, null))
  const [status, setStatus] = useState<SyncStatus>('idle')
  const [lastSynced, setLastSynced] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const dataRef = useRef(data)
  dataRef.current = data
  const metaRef = useRef(meta)

  const setMeta = useCallback((m: SyncMeta | null) => {
    metaRef.current = m
    setMetaState(m)
    if (m) writeLocal(SYNC_META_KEY, m)
    else
      try {
        localStorage.removeItem(SYNC_META_KEY)
      } catch {
        /* storage unavailable */
      }
  }, [])

  /** Put a ledger from the cloud on screen, recorded as already synced so it isn't sent straight back. */
  const apply = useCallback(
    (ledger: AppData, m: SyncMeta, revision: number) => {
      const next = keepDeviceSettings(ledger, dataRef.current)
      setMeta({ ...m, revision, synced: fingerprint(next) })
      dataRef.current = next
      dispatch({ type: 'replace', data: next })
    },
    [dispatch, setMeta],
  )

  const fail = useCallback((e: unknown) => {
    if (!navigator.onLine) {
      setStatus('offline')
      return
    }
    setStatus('error')
    setError(message(e))
  }, [])

  /** Bring this device and the cloud into step. Runs one at a time; a request made mid-run queues one more run. */
  const running = useRef(false)
  const again = useRef(false)
  const reconcile = useCallback(async () => {
    if (running.current) {
      again.current = true
      return
    }
    running.current = true
    try {
      do {
        again.current = false
        if (!metaRef.current) return
        if (!navigator.onLine) {
          setStatus('offline')
          return
        }
        setStatus('syncing')
        const c = await getClient()
        let settled = false
        for (let attempt = 0; attempt < 4 && !settled; attempt++) {
          const m = metaRef.current
          if (!m) return
          const local = dataRef.current
          const localFp = fingerprint(local)
          const dirty = localFp !== m.synced
          const rev = await remote.revision(c, m.userId)

          if (rev === null) {
            // The synced copy is gone (deleted from another device, say): this device's ledger becomes it.
            const r = await remote.create(c, m.userId, local)
            setMeta({ ...m, revision: r, synced: localFp })
            settled = true
            break
          }
          if (rev === m.revision) {
            settled = !dirty
            if (!dirty) break
            const r = await remote.save(c, m.userId, local, rev)
            if (r === null) continue // another device saved first: go round again
            setMeta({ ...m, revision: r, synced: localFp })
            settled = true
            break
          }
          // Another device saved since we last looked.
          const row = await remote.fetch(c, m.userId)
          if (!row) continue
          if (fingerprint(dataRef.current) !== localFp) continue // edited while we were fetching: start over
          if (!dirty) {
            apply(row.data, m, row.revision)
            settled = true
            break
          }
          const merged = mergeLedgers(local, row.data)
          const r = await remote.save(c, m.userId, merged, row.revision)
          if (r === null) continue
          apply(merged, m, r)
          settled = true
        }
        if (!settled) throw new Error('Another device kept saving at the same moment. Try Sync now.')
        setStatus('synced')
        setError(null)
        setLastSynced(Date.now())
      } while (again.current)
    } catch (e) {
      fail(e)
    } finally {
      running.current = false
    }
  }, [apply, fail, setMeta])

  /** First sync after signing in on this device: decide what happens to the ledger already here. */
  const link = useCallback(
    async (c: SupabaseClient, session: Session) => {
      const userId = session.user.id
      const email = session.user.email ?? ''
      setStatus('syncing')
      try {
        const local = dataRef.current
        const row = await remote.fetch(c, userId)
        if (!row) {
          const r = await remote.create(c, userId, local)
          setMeta({ userId, email, revision: r, synced: fingerprint(local) })
          toast(isEmptyLedger(local) ? 'Sync is on' : 'Sync is on · your ledger is saved to your account')
        } else if (isEmptyLedger(local) || fingerprint(keepDeviceSettings(row.data, local)) === fingerprint(local)) {
          apply(row.data, { userId, email, revision: row.revision, synced: '' }, row.revision)
          toast(`Sync is on · ${pluralize(row.data.bills.length, 'bill')} brought in from your account`)
        } else if (isEmptyLedger(row.data)) {
          const r = await remote.save(c, userId, local, row.revision)
          setMeta({ userId, email, revision: r ?? row.revision, synced: r ? fingerprint(local) : '' })
          toast('Sync is on · your ledger is saved to your account')
        } else {
          const useSynced = await confirm({
            title: 'Which ledger should Billwise keep?',
            message: `This device has ${pluralize(local.bills.length, 'bill')}; your account has ${pluralize(row.data.bills.length, 'bill')}. Use your account’s ledger in place of this device’s, or merge the two so nothing is lost. A bill entered on both may then appear twice, and you can delete the extra.`,
            confirmLabel: 'Use my account’s ledger',
            cancelLabel: 'Merge both',
          })
          if (useSynced) {
            apply(row.data, { userId, email, revision: row.revision, synced: '' }, row.revision)
            toast('Sync is on · this device now shows your account’s ledger')
          } else {
            const merged = mergeLedgers(local, row.data)
            const r = await remote.save(c, userId, merged, row.revision)
            apply(merged, { userId, email, revision: row.revision, synced: '' }, r ?? row.revision)
            toast('Sync is on · both ledgers merged')
          }
        }
        setStatus('synced')
        setError(null)
        setLastSynced(Date.now())
        if (metaRef.current && fingerprint(dataRef.current) !== metaRef.current.synced) void reconcile()
      } catch (e) {
        fail(e)
      }
    },
    [apply, confirm, fail, reconcile, setMeta, toast],
  )

  // On launch: finish a sign-in link (?code=…), or resume a session from an earlier visit.
  useEffect(() => {
    if (!syncAvailable) return
    const params = new URLSearchParams(window.location.search)
    const fromLink = params.has('code') || params.has('error_description')
    if (!fromLink && !metaRef.current) return
    let cancelled = false
    void (async () => {
      try {
        const c = await getClient()
        const { data: got } = await c.auth.getSession()
        if (cancelled) return
        if (fromLink) {
          const failed = params.get('error_description')
          for (const k of ['code', 'error', 'error_code', 'error_description']) params.delete(k)
          const q = params.toString()
          history.replaceState(null, '', `${window.location.pathname}${q ? `?${q}` : ''}${window.location.hash}`)
          if (!got.session) {
            toast(failed ? `Sign-in failed: ${failed}` : 'That sign-in link only works in the browser you asked from. Type the code from the email instead.', {
              tone: 'error',
            })
            return
          }
        }
        const session = got.session
        if (!session) {
          // Signed out elsewhere, or the session expired: keep the ledger, stop syncing.
          setMeta(null)
          toast('You’ve been signed out of sync. Your ledger is still on this device.', { tone: 'info' })
          return
        }
        setPendingEmail(null)
        writeLocal(PENDING_KEY, null)
        if (metaRef.current?.userId === session.user.id) void reconcile()
        else await link(c, session)
      } catch (e) {
        fail(e)
      }
    })()
    return () => {
      cancelled = true
    }
    // Launch only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Save local edits shortly after they're made.
  useEffect(() => {
    if (!meta || fingerprint(data) === meta.synced) return
    const t = window.setTimeout(() => void reconcile(), SAVE_DELAY)
    return () => window.clearTimeout(t)
  }, [data, meta, reconcile])

  // Pick up changes from other devices: on returning to the app, on reconnecting, and now and then while in view.
  useEffect(() => {
    if (!meta) return
    const check = () => {
      if (document.visibilityState === 'visible') void reconcile()
    }
    document.addEventListener('visibilitychange', check)
    window.addEventListener('online', check)
    window.addEventListener('focus', check)
    const poll = window.setInterval(check, POLL_EVERY)
    return () => {
      document.removeEventListener('visibilitychange', check)
      window.removeEventListener('online', check)
      window.removeEventListener('focus', check)
      window.clearInterval(poll)
    }
  }, [meta, reconcile])

  const sendCode = useCallback(async (email: string) => {
    const c = await getClient()
    const { error: err } = await c.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}${window.location.pathname}` },
    })
    if (err) throw err
    setPendingEmail(email)
    writeLocal(PENDING_KEY, email)
  }, [])

  const verifyCode = useCallback(
    async (code: string) => {
      if (!pendingEmail) return
      const c = await getClient()
      const { data: got, error: err } = await c.auth.verifyOtp({ email: pendingEmail, token: code, type: 'email' })
      if (err) throw err
      if (!got.session) throw new Error('Sign-in did not complete. Request a new code.')
      setPendingEmail(null)
      writeLocal(PENDING_KEY, null)
      await link(c, got.session)
    },
    [pendingEmail, link],
  )

  const cancelSignIn = useCallback(() => {
    setPendingEmail(null)
    writeLocal(PENDING_KEY, null)
  }, [])

  const signOut = useCallback(async () => {
    try {
      const c = await getClient()
      await c.auth.signOut({ scope: 'local' })
    } finally {
      setMeta(null)
      setStatus('idle')
      setLastSynced(null)
      toast('Signed out. Your ledger stays on this device.', { tone: 'info' })
    }
  }, [setMeta, toast])

  const deleteSynced = useCallback(async () => {
    const m = metaRef.current
    if (!m) return
    const ok = await confirm({
      title: 'Delete your synced ledger?',
      message:
        'This removes the copy kept in your Billwise account and signs this device out. The ledger on this device stays. Other signed-in devices keep their own copy until they sign out.',
      confirmLabel: 'Delete synced copy',
      tone: 'danger',
    })
    if (!ok) return
    try {
      const c = await getClient()
      await remote.remove(c, m.userId)
      await c.auth.signOut({ scope: 'global' })
      setMeta(null)
      setStatus('idle')
      setLastSynced(null)
      toast('Synced copy deleted and signed out. Your ledger stays on this device.', { tone: 'info' })
    } catch (e) {
      toast(`Couldn’t delete the synced copy: ${message(e)}`, { tone: 'error' })
    }
  }, [confirm, setMeta, toast])

  const syncNow = useCallback(() => void reconcile(), [reconcile])

  const value = useMemo<SyncValue>(
    () => ({
      available: syncAvailable,
      meta,
      status,
      lastSynced,
      error,
      pendingEmail,
      sendCode,
      verifyCode,
      cancelSignIn,
      syncNow,
      signOut,
      deleteSynced,
    }),
    [meta, status, lastSynced, error, pendingEmail, sendCode, verifyCode, cancelSignIn, syncNow, signOut, deleteSynced],
  )

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>
}

export function useSync(): SyncValue {
  const ctx = useContext(SyncContext)
  if (!ctx) throw new Error('useSync must be used inside <SyncProvider>')
  return ctx
}
