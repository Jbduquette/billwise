import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
} from 'date-fns'
import type { Bill, Frequency } from './types'

/** Dates travel through the app as local `yyyy-MM-dd` strings, which sort and compare lexically. */
export const toISO = (d: Date) => format(d, 'yyyy-MM-dd')
export const fromISO = (s: string) => parseISO(s)
export const todayISO = () => toISO(new Date())
export const addDaysISO = (iso: string, n: number) => toISO(addDays(parseISO(iso), n))
export const monthStart = (iso: string) => toISO(startOfMonth(parseISO(iso)))
export const monthEnd = (iso: string) => toISO(endOfMonth(parseISO(iso)))
export const shiftMonth = (iso: string, n: number) => toISO(startOfMonth(addMonths(parseISO(iso), n)))
export const daysBetween = (from: string, to: string) => differenceInCalendarDays(parseISO(to), parseISO(from))
export const fmtDate = (iso: string, pattern = 'MMM d') => format(parseISO(iso), pattern)

export interface FrequencyMeta {
  id: Frequency
  label: string
  /** Average occurrences per month, used for the normalized monthly cost. */
  perMonth: number
}

export const FREQUENCIES: FrequencyMeta[] = [
  { id: 'monthly', label: 'Monthly', perMonth: 1 },
  { id: 'weekly', label: 'Weekly', perMonth: 52 / 12 },
  { id: 'biweekly', label: 'Every 2 weeks', perMonth: 26 / 12 },
  { id: 'quarterly', label: 'Quarterly', perMonth: 1 / 3 },
  { id: 'semiannual', label: 'Every 6 months', perMonth: 1 / 6 },
  { id: 'yearly', label: 'Yearly', perMonth: 1 / 12 },
  { id: 'once', label: 'One time', perMonth: 0 },
]

export const frequencyMeta = (f: Frequency) => FREQUENCIES.find((x) => x.id === f) ?? FREQUENCIES[0]

/** Smallest gap between occurrences in days, used to skip ahead cheaply. */
const MIN_GAP: Record<Exclude<Frequency, 'once'>, number> = {
  weekly: 7,
  biweekly: 14,
  monthly: 31,
  quarterly: 92,
  semiannual: 184,
  yearly: 366,
}

function nth(start: Date, freq: Frequency, n: number): Date {
  switch (freq) {
    case 'weekly':
      return addWeeks(start, n)
    case 'biweekly':
      return addWeeks(start, 2 * n)
    case 'monthly':
      return addMonths(start, n)
    case 'quarterly':
      return addMonths(start, 3 * n)
    case 'semiannual':
      return addMonths(start, 6 * n)
    case 'yearly':
      return addYears(start, n)
    case 'once':
      return start
  }
}

/**
 * Due dates of `bill` inside [from, to] (inclusive).
 * Each date is computed from the anchor (start + n × period) rather than by
 * repeated stepping, so a bill due on the 31st lands on Feb 28 and returns to
 * the 31st in March instead of drifting.
 */
export function dueDatesInRange(
  bill: Pick<Bill, 'startDate' | 'endDate' | 'frequency'>,
  from: string,
  to: string,
): string[] {
  const last = bill.endDate && bill.endDate < to ? bill.endDate : to
  if (bill.startDate > last) return []

  if (bill.frequency === 'once') {
    return bill.startDate >= from && bill.startDate <= last ? [bill.startDate] : []
  }

  const start = parseISO(bill.startDate)
  const lead = differenceInCalendarDays(parseISO(from), start)
  let n = lead > 0 ? Math.max(0, Math.floor(lead / MIN_GAP[bill.frequency]) - 1) : 0

  const out: string[] = []
  for (let guard = 0; guard < 2000; guard++, n++) {
    const d = toISO(nth(start, bill.frequency, n))
    if (d > last) break
    if (d >= from) out.push(d)
  }
  return out
}

/** The first due date on or after `from`, looking up to ~2 years ahead. */
export function nextDueDate(bill: Bill, from: string): string | null {
  return dueDatesInRange(bill, from, addDaysISO(from, 740))[0] ?? null
}
