import { CATEGORIES } from './categories'
import { addDaysISO, daysBetween, dueDatesInRange, frequencyMeta, monthEnd, monthStart, shiftMonth } from './dates'
import { round2 } from './format'
import type { AppData, Bill, CategoryId, Occurrence, OccurrenceStatus, Payment } from './types'

export const payKey = (billId: string, dueDate: string) => `${billId}|${dueDate}`

export function indexPayments(payments: Payment[]): Map<string, Payment> {
  const m = new Map<string, Payment>()
  for (const p of payments) m.set(payKey(p.billId, p.dueDate), p)
  return m
}

export function statusFor(daysUntil: number, dueSoonDays: number, paid: boolean): OccurrenceStatus {
  if (paid) return 'paid'
  if (daysUntil < 0) return 'overdue'
  if (daysUntil === 0) return 'due-today'
  if (daysUntil <= dueSoonDays) return 'due-soon'
  return 'upcoming'
}

/** Every occurrence of every bill with a due date inside [from, to], sorted by due date. */
export function occurrencesBetween(data: AppData, from: string, to: string, today: string): Occurrence[] {
  const pays = indexPayments(data.payments)
  const out: Occurrence[] = []
  for (const bill of data.bills) {
    for (const dueDate of dueDatesInRange(bill, from, to)) {
      const key = payKey(bill.id, dueDate)
      const payment = pays.get(key)
      const daysUntil = daysBetween(today, dueDate)
      out.push({
        key,
        bill,
        dueDate,
        payment,
        daysUntil,
        amount: payment ? payment.amount : bill.amount,
        status: statusFor(daysUntil, data.settings.dueSoonDays, !!payment),
      })
    }
  }
  return out.sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.bill.name.localeCompare(b.bill.name))
}

export function occurrencesInMonth(data: AppData, month: string, today: string): Occurrence[] {
  return occurrencesBetween(data, monthStart(month), monthEnd(month), today)
}

export interface CategorySlice {
  id: CategoryId
  amount: number
  count: number
}

export interface Summary {
  /** Everything owed in the period: paid amounts plus expected amounts still open. */
  total: number
  paid: number
  unpaid: number
  overdue: number
  count: number
  paidCount: number
  unpaidCount: number
  overdueCount: number
  byCategory: CategorySlice[]
}

export function summarize(occs: Occurrence[]): Summary {
  let total = 0
  let paid = 0
  let overdue = 0
  let paidCount = 0
  let overdueCount = 0
  const cat = new Map<CategoryId, CategorySlice>()

  for (const o of occs) {
    total += o.amount
    if (o.status === 'paid') {
      paid += o.amount
      paidCount++
    } else if (o.status === 'overdue') {
      overdue += o.amount
      overdueCount++
    }
    const slice = cat.get(o.bill.category) ?? { id: o.bill.category, amount: 0, count: 0 }
    slice.amount += o.amount
    slice.count++
    cat.set(o.bill.category, slice)
  }

  return {
    total: round2(total),
    paid: round2(paid),
    unpaid: round2(total - paid),
    overdue: round2(overdue),
    count: occs.length,
    paidCount,
    unpaidCount: occs.length - paidCount,
    overdueCount,
    // Fixed category order keeps chart adjacency (and therefore color separation) stable.
    byCategory: CATEGORIES.flatMap((c) => {
      const s = cat.get(c.id)
      return s && s.amount > 0 ? [{ ...s, amount: round2(s.amount) }] : []
    }),
  }
}

/** How far back we look for unpaid bills when reporting "overdue". */
export const OVERDUE_LOOKBACK_DAYS = 365

export interface Agenda {
  overdue: Occurrence[]
  soon: Occurrence[]
  later: Occurrence[]
}

/** Today-relative view: what is late, what is due inside the "due soon" window, and what follows. */
export function agenda(data: AppData, today: string, horizonDays = 30): Agenda {
  const soonDays = data.settings.dueSoonDays
  const occs = occurrencesBetween(
    data,
    addDaysISO(today, -OVERDUE_LOOKBACK_DAYS),
    addDaysISO(today, Math.max(horizonDays, soonDays)),
    today,
  )
  const open = occs.filter((o) => o.status !== 'paid')
  return {
    overdue: open.filter((o) => o.status === 'overdue'),
    soon: open.filter((o) => o.status === 'due-today' || o.status === 'due-soon'),
    later: open.filter((o) => o.status === 'upcoming'),
  }
}

export interface TrendPoint {
  month: string
  total: number
  paid: number
  unpaid: number
}

/** Month totals for the `count` months ending with `endMonth`. */
export function monthlyTrend(data: AppData, endMonth: string, today: string, count = 6): TrendPoint[] {
  const first = shiftMonth(endMonth, -(count - 1))
  const occs = occurrencesBetween(data, first, monthEnd(endMonth), today)
  const points: TrendPoint[] = Array.from({ length: count }, (_, i) => ({
    month: shiftMonth(first, i),
    total: 0,
    paid: 0,
    unpaid: 0,
  }))
  const idx = new Map(points.map((p, i) => [p.month.slice(0, 7), i]))
  for (const o of occs) {
    const p = points[idx.get(o.dueDate.slice(0, 7)) ?? -1]
    if (!p) continue
    p.total += o.amount
    if (o.status === 'paid') p.paid += o.amount
    else p.unpaid += o.amount
  }
  return points.map((p) => ({ ...p, total: round2(p.total), paid: round2(p.paid), unpaid: round2(p.unpaid) }))
}

/** Average cost per month of a bill, independent of any particular month. */
export const monthlyEquivalent = (bill: Bill) => bill.amount * frequencyMeta(bill.frequency).perMonth
