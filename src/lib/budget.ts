import { addMonths, addWeeks } from 'date-fns'
import { dueDatesInRange, frequencyMeta, fromISO, monthEnd, monthStart, shiftMonth, toISO } from './dates'
import { monthlyEquivalent, occurrencesInMonth, summarize, type Summary } from './engine'
import { round2 } from './format'
import type { AppData, Bill, IncomeSource, Occurrence } from './types'

/**
 * Paydays of `source` inside [from, to]. A recurring source's pattern runs both ways from its
 * anchor, so entering the next payday still fills in the paydays earlier this month. The anchor
 * moves back eight years in whole periods (a leap-year cycle, so a 29 February anchor survives).
 */
export function paydaysInRange(source: IncomeSource, from: string, to: string): string[] {
  if (source.frequency === 'once') return source.date >= from && source.date <= to ? [source.date] : []
  const anchor = fromISO(source.date)
  const weekly = source.frequency === 'weekly' || source.frequency === 'biweekly'
  const startDate = toISO(weekly ? addWeeks(anchor, -416) : addMonths(anchor, -96))
  return dueDatesInRange({ startDate, endDate: null, frequency: source.frequency }, from, to)
}

export interface Payday {
  source: IncomeSource
  date: string
}

export interface MonthBudget {
  /** First day of the month (yyyy-MM-dd). */
  month: string
  paydays: Payday[]
  income: number
  /** The month's bills as the ledger counts them: paid amounts plus expected open ones, skips left out. */
  bills: number
  summary: Summary
  /** The month's bill entries, skipped ones included. */
  occurrences: Occurrence[]
  setAside: number
  /** income − bills − set-asides. Negative when the plan runs short. */
  left: number
}

export function budgetForMonth(data: AppData, month: string, today: string): MonthBudget {
  const from = monthStart(month)
  const to = monthEnd(month)
  const paydays = data.income
    .flatMap((source) => paydaysInRange(source, from, to).map((date) => ({ source, date })))
    .sort((a, b) => a.date.localeCompare(b.date) || a.source.name.localeCompare(b.source.name))
  const income = round2(paydays.reduce((s, p) => s + p.source.amount, 0))
  const occurrences = occurrencesInMonth(data, from, today)
  const summary = summarize(occurrences)
  const setAside = round2(data.setAsides.reduce((s, x) => s + x.amount, 0))
  return {
    month: from,
    paydays,
    income,
    bills: summary.total,
    summary,
    occurrences,
    setAside,
    left: round2(income - summary.total - setAside),
  }
}

/** `count` consecutive months of budget, starting with `fromMonth`. */
export function budgetOutlook(data: AppData, fromMonth: string, today: string, count = 6): MonthBudget[] {
  return Array.from({ length: count }, (_, i) => budgetForMonth(data, shiftMonth(fromMonth, i), today))
}

/** A recurring source's average take-home per month (a biweekly paycheck averages 26 ÷ 12 paydays). */
export const incomeMonthlyEquivalent = (source: IncomeSource) => source.amount * frequencyMeta(source.frequency).perMonth

const IRREGULAR = new Set(['quarterly', 'semiannual', 'yearly'])

/** Bills still running in `month` (started, not yet ended). */
const runningIn = (bill: Bill, month: string) =>
  bill.startDate <= monthEnd(month) && (!bill.endDate || bill.endDate >= monthStart(month))

export interface BillShape {
  /** What the bills cost in an average month, one-time bills aside. */
  typical: number
  /** Bills that come round less than monthly, and what they average per month. */
  irregular: { bill: Bill; perMonth: number }[]
  irregularPerMonth: number
}

/** The shape of the bills behind a month: its usual cost, and the lumpy bills that make some months heavier. */
export function billShape(data: AppData, month: string): BillShape {
  const running = data.bills.filter((b) => b.frequency !== 'once' && runningIn(b, month))
  const irregular = running
    .filter((b) => IRREGULAR.has(b.frequency))
    .map((bill) => ({ bill, perMonth: monthlyEquivalent(bill) }))
    .sort((a, b) => b.perMonth - a.perMonth)
  return {
    typical: round2(running.reduce((s, b) => s + monthlyEquivalent(b), 0)),
    irregular,
    irregularPerMonth: round2(irregular.reduce((s, x) => s + x.perMonth, 0)),
  }
}
