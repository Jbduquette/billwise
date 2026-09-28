import { isCategoryId } from './categories'
import { FREQUENCIES } from './dates'
import { round2 } from './format'
import { uid } from './id'
import type { AppData, Bill, Frequency, Payment, Settings, Skip, ThemePref } from './types'

export const STORAGE_KEY = 'billwise:v1'

declare global {
  interface Window {
    /** Dev-only review mode (?demo): an in-memory ledger that never touches localStorage. */
    __billwiseDemo?: AppData
  }
}

const demo = () => (import.meta.env.DEV ? window.__billwiseDemo : undefined)

export const DEFAULT_SETTINGS: Settings = {
  currency: 'USD',
  dueSoonDays: 7,
  notifications: false,
  theme: 'system',
}

export const EMPTY_DATA: AppData = { version: 1, bills: [], payments: [], skips: [], settings: DEFAULT_SETTINGS }

const ISO = /^\d{4}-\d{2}-\d{2}$/
const isISO = (v: unknown): v is string => typeof v === 'string' && ISO.test(v) && !Number.isNaN(Date.parse(v))
const isFreq = (v: unknown): v is Frequency => FREQUENCIES.some((f) => f.id === v)
const num = (v: unknown) => (typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN)

type Loose = Record<string, unknown>

function sanitizeBill(raw: unknown): Bill | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Loose
  const amount = num(r.amount)
  if (typeof r.name !== 'string' || !r.name.trim() || !Number.isFinite(amount) || amount < 0) return null
  if (!isISO(r.startDate)) return null
  return {
    id: typeof r.id === 'string' && r.id ? r.id : uid(),
    name: r.name.trim().slice(0, 80),
    amount: round2(amount),
    category: isCategoryId(r.category) ? r.category : 'other',
    frequency: isFreq(r.frequency) ? r.frequency : 'monthly',
    startDate: r.startDate,
    endDate: isISO(r.endDate) ? r.endDate : null,
    autopay: r.autopay === true,
    autopayThrough: isISO(r.autopayThrough) ? r.autopayThrough : null,
    notes: typeof r.notes === 'string' ? r.notes.slice(0, 500) : '',
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : new Date().toISOString(),
  }
}

function sanitizePayment(raw: unknown): Payment | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Loose
  const amount = num(r.amount)
  if (typeof r.billId !== 'string' || !isISO(r.dueDate) || !Number.isFinite(amount) || amount < 0) return null
  return {
    id: typeof r.id === 'string' && r.id ? r.id : uid(),
    billId: r.billId,
    dueDate: r.dueDate,
    amount: round2(amount),
    paidOn: isISO(r.paidOn) ? r.paidOn : r.dueDate,
    ...(r.auto === true ? { auto: true } : {}),
  }
}

function sanitizeSkip(raw: unknown): Skip | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Loose
  if (typeof r.billId !== 'string' || !isISO(r.dueDate)) return null
  return {
    id: typeof r.id === 'string' && r.id ? r.id : uid(),
    billId: r.billId,
    dueDate: r.dueDate,
    skippedOn: isISO(r.skippedOn) ? r.skippedOn : r.dueDate,
  }
}

function sanitizeSettings(raw: unknown): Settings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Loose
  const days = num(r.dueSoonDays)
  const theme: ThemePref = r.theme === 'light' || r.theme === 'dark' ? r.theme : 'system'
  return {
    currency: typeof r.currency === 'string' && /^[A-Z]{3}$/.test(r.currency) ? r.currency : DEFAULT_SETTINGS.currency,
    dueSoonDays: Number.isInteger(days) && days >= 1 && days <= 60 ? days : DEFAULT_SETTINGS.dueSoonDays,
    notifications: r.notifications === true,
    theme,
  }
}

/** Validate untrusted data (localStorage or an imported file). Returns null if it isn't Billwise data. */
export function sanitize(raw: unknown): AppData | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Loose
  if (!Array.isArray(r.bills)) return null
  const bills = r.bills.map(sanitizeBill).filter((b): b is Bill => b !== null)
  const ids = new Set(bills.map((b) => b.id))
  const seen = new Set<string>()
  const payments = (Array.isArray(r.payments) ? r.payments : [])
    .map(sanitizePayment)
    .filter((p): p is Payment => {
      if (!p || !ids.has(p.billId)) return false
      const k = `${p.billId}|${p.dueDate}`
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
  // Skips arrived after the first release, so older data simply has none. A paid entry can't also be skipped.
  const skipSeen = new Set<string>()
  const skips = (Array.isArray(r.skips) ? r.skips : []).map(sanitizeSkip).filter((s): s is Skip => {
    if (!s || !ids.has(s.billId)) return false
    const k = `${s.billId}|${s.dueDate}`
    if (seen.has(k) || skipSeen.has(k)) return false
    skipSeen.add(k)
    return true
  })
  return { version: 1, bills, payments, skips, settings: sanitizeSettings(r.settings) }
}

export function loadData(): AppData {
  const d = demo()
  if (d) return d
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY_DATA
    return sanitize(JSON.parse(raw)) ?? EMPTY_DATA
  } catch {
    return EMPTY_DATA
  }
}

/** Returns false when storage is unavailable or full, so the UI can warn. */
export function saveData(data: AppData): boolean {
  if (demo()) return true
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

export function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw == null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

export function writeLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable — non-essential */
  }
}
