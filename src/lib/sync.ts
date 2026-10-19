import type { SupabaseClient } from '@supabase/supabase-js'
import { payKey } from './engine'
import { sanitize } from './storage'
import type { AppData } from './types'

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const KEY = import.meta.env.VITE_SUPABASE_KEY as string | undefined

declare global {
  interface Window {
    __billwiseFakeSupabase?: unknown
  }
}

/** Sync is offered only when the build knows its Supabase project. */
export const syncAvailable = !!(URL && KEY)

let client: Promise<SupabaseClient> | null = null

/**
 * The Supabase client, loaded on first use: people who never turn sync on never download it.
 * PKCE keeps the sign-in link's code in the query string (`?code=`), clear of the hash routes.
 */
export function getClient(): Promise<SupabaseClient> {
  // Dev-only: tests stand in a fake Supabase (see review/sync-test.mjs). Stripped from production builds.
  if (import.meta.env.DEV && window.__billwiseFakeSupabase) return Promise.resolve(window.__billwiseFakeSupabase as SupabaseClient)
  client ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(URL!, KEY!, {
      auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    }),
  )
  return client
}

/** What this device knows about its synced copy. Kept in localStorage beside the ledger. */
export interface SyncMeta {
  userId: string
  email: string
  /** The remote revision this device last saw. */
  revision: number
  /** Fingerprint of the ledger as last synced; a different fingerprint means unsaved changes. */
  synced: string
}

export const SYNC_META_KEY = 'billwise:sync'

/** FNV-1a over the ledger's JSON: a cheap way to tell whether anything changed since the last sync. */
export function fingerprint(data: AppData): string {
  const s = JSON.stringify(data)
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return `${s.length}:${(h >>> 0).toString(36)}`
}

export const isEmptyLedger = (d: AppData) => !d.bills.length && !d.payments.length && !d.skips.length && !d.income.length && !d.setAsides.length

/** Reminders depend on this device's notification permission, so that one setting never travels. */
export const keepDeviceSettings = (incoming: AppData, local: AppData): AppData => ({
  ...incoming,
  settings: { ...incoming.settings, notifications: local.settings.notifications },
})

function unionById<T extends { id: string }>(mine: T[], theirs: T[]): T[] {
  const ids = new Set(mine.map((x) => x.id))
  return [...mine, ...theirs.filter((x) => !ids.has(x.id))]
}

function unionByEntry<T extends { billId: string; dueDate: string }>(mine: T[], theirs: T[]): T[] {
  const keys = new Set(mine.map((x) => payKey(x.billId, x.dueDate)))
  return [...mine, ...theirs.filter((x) => !keys.has(payKey(x.billId, x.dueDate)))]
}

/**
 * Combine two copies of a ledger that both changed. Nothing is lost: every bill, payment, skip,
 * income and set-aside from either side is kept, and where both hold the same record this device's
 * version wins. (Deleting is the one thing a merge can undo: a record removed on one side and still
 * present on the other comes back.)
 */
export function mergeLedgers(local: AppData, remote: AppData): AppData {
  const merged = {
    version: 1 as const,
    bills: unionById(local.bills, remote.bills),
    payments: unionByEntry(local.payments, remote.payments),
    skips: unionByEntry(local.skips, remote.skips),
    income: unionById(local.income, remote.income),
    setAsides: unionById(local.setAsides, remote.setAsides),
    settings: local.settings,
  }
  // Re-validate: drops duplicates, and a skip where the other side recorded a payment.
  return sanitize(merged) ?? local
}

export interface RemoteLedger {
  data: AppData
  revision: number
}

/** The `ledgers` table: one row per person, guarded by row-level security (supabase/schema.sql). */
export const remote = {
  async revision(c: SupabaseClient, userId: string): Promise<number | null> {
    const { data, error } = await c.from('ledgers').select('revision').eq('user_id', userId).maybeSingle()
    if (error) throw error
    return data ? Number(data.revision) : null
  },

  async fetch(c: SupabaseClient, userId: string): Promise<RemoteLedger | null> {
    const { data, error } = await c.from('ledgers').select('data, revision').eq('user_id', userId).maybeSingle()
    if (error) throw error
    if (!data) return null
    const ledger = sanitize(data.data)
    if (!ledger) throw new Error('The synced ledger could not be read.')
    return { data: ledger, revision: Number(data.revision) }
  },

  async create(c: SupabaseClient, userId: string, ledger: AppData): Promise<number> {
    const { data, error } = await c.from('ledgers').insert({ user_id: userId, data: ledger, revision: 1 }).select('revision').single()
    if (error) throw error
    return Number(data.revision)
  },

  /** Save over `expected`. Returns the new revision, or null if another device saved first. */
  async save(c: SupabaseClient, userId: string, ledger: AppData, expected: number): Promise<number | null> {
    const { data, error } = await c
      .from('ledgers')
      .update({ data: ledger, revision: expected + 1, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('revision', expected)
      .select('revision')
    if (error) throw error
    return data.length ? Number(data[0].revision) : null
  },

  async remove(c: SupabaseClient, userId: string): Promise<void> {
    const { error } = await c.from('ledgers').delete().eq('user_id', userId)
    if (error) throw error
  },
}
