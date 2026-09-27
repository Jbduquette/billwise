import { addMonths, startOfMonth } from 'date-fns'
import { addDaysISO, dueDatesInRange, fromISO, toISO } from './dates'
import { round2 } from './format'
import { uid } from './id'
import type { AppData, Bill, CategoryId, Frequency, Payment, Settings } from './types'

interface Seed {
  name: string
  amount: number
  category: CategoryId
  frequency: Frequency
  /** This cycle's due date, as days from today. */
  offset: number | 'first-of-month'
  autopay?: boolean
  /** Leave the most recent past occurrence unpaid (to demo "overdue"). */
  leaveUnpaid?: boolean
  /** Paid amounts wobble around the expected amount (utilities). */
  variable?: boolean
  notes?: string
}

const SEEDS: Seed[] = [
  { name: 'Rent', amount: 1850, category: 'housing', frequency: 'monthly', offset: 'first-of-month', notes: 'Paid via landlord portal' },
  { name: 'Gym Membership', amount: 45, category: 'health', frequency: 'monthly', offset: -24, autopay: true },
  { name: 'Car Insurance', amount: 142.18, category: 'insurance', frequency: 'monthly', offset: -22, autopay: true },
  { name: 'Renters Insurance', amount: 18.5, category: 'insurance', frequency: 'monthly', offset: -21 },
  { name: 'Netflix', amount: 15.49, category: 'subscriptions', frequency: 'monthly', offset: -18, autopay: true },
  { name: 'Electric', amount: 128.6, category: 'utilities', frequency: 'monthly', offset: -15, variable: true },
  { name: 'Car Loan', amount: 389.42, category: 'debt', frequency: 'monthly', offset: -12 },
  { name: 'Water & Sewer', amount: 96.3, category: 'utilities', frequency: 'quarterly', offset: -40, variable: true },
  { name: 'Mobile Phone', amount: 65, category: 'connectivity', frequency: 'monthly', offset: -2, leaveUnpaid: true },
  { name: 'Internet', amount: 79.99, category: 'connectivity', frequency: 'monthly', offset: 1, autopay: true },
  { name: 'Spotify', amount: 11.99, category: 'subscriptions', frequency: 'monthly', offset: 3 },
  { name: 'Credit Card', amount: 250, category: 'debt', frequency: 'monthly', offset: 5, notes: 'Minimum payment — pay more when possible' },
  { name: 'Student Loan', amount: 210, category: 'debt', frequency: 'monthly', offset: 11 },
  { name: 'Amazon Prime', amount: 139, category: 'subscriptions', frequency: 'yearly', offset: 48 },
]

const WOBBLE = [0.92, 1.08, 1.21, 0.97, 0.86, 1.13, 1.02]

/** Six months of realistic history anchored to today, so every screen has something to show. */
export function buildSampleData(today: string, settings: Settings): AppData {
  const bills: Bill[] = []
  const payments: Payment[] = []
  const yesterday = addDaysISO(today, -1)
  const createdAt = new Date().toISOString()

  for (const seed of SEEDS) {
    const anchor =
      seed.offset === 'first-of-month' ? toISO(startOfMonth(fromISO(today))) : addDaysISO(today, seed.offset)
    const monthsBack = seed.frequency === 'yearly' ? 12 : 6
    const startDate = toISO(addMonths(fromISO(anchor), -monthsBack))

    const bill: Bill = {
      id: uid(),
      name: seed.name,
      amount: seed.amount,
      category: seed.category,
      frequency: seed.frequency,
      startDate,
      endDate: null,
      autopay: !!seed.autopay,
      autopayThrough: seed.autopay ? yesterday : null,
      notes: seed.notes ?? '',
      createdAt,
    }
    bills.push(bill)

    const past = dueDatesInRange(bill, startDate, yesterday)
    past.forEach((dueDate, i) => {
      if (seed.leaveUnpaid && i === past.length - 1) return
      const amount = seed.variable ? round2(seed.amount * WOBBLE[i % WOBBLE.length]) : seed.amount
      payments.push({
        id: uid(),
        billId: bill.id,
        dueDate,
        amount,
        paidOn: seed.autopay ? dueDate : addDaysISO(dueDate, -(i % 3)),
        ...(seed.autopay ? { auto: true } : {}),
      })
    })
  }

  return { version: 1, bills, payments, settings }
}
