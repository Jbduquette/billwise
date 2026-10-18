export type Frequency = 'once' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'semiannual' | 'yearly'

export type CategoryId =
  | 'housing'
  | 'transport'
  | 'connectivity'
  | 'utilities'
  | 'insurance'
  | 'health'
  | 'subscriptions'
  | 'debt'
  | 'other'

export type ThemePref = 'dark' | 'light' | 'system'

export interface Bill {
  id: string
  name: string
  /** Expected amount per occurrence. */
  amount: number
  category: CategoryId
  frequency: Frequency
  /** First due date (yyyy-MM-dd). No occurrence is ever generated before it. */
  startDate: string
  /** Optional last possible due date (yyyy-MM-dd). */
  endDate: string | null
  autopay: boolean
  /** Autopay has been applied through this date (yyyy-MM-dd), so un-marking an older one sticks. */
  autopayThrough: string | null
  notes: string
  createdAt: string
}

/** One settled occurrence of a bill. An occurrence is identified by billId + dueDate. */
export interface Payment {
  id: string
  billId: string
  dueDate: string
  amount: number
  paidOn: string
  auto?: boolean
}

/**
 * One occurrence the user chose to skip: it leaves what's owed for that period and never
 * counts as paid. An occurrence is either paid, skipped, or open — never two at once.
 */
export interface Skip {
  id: string
  billId: string
  dueDate: string
  skippedOn: string
}

/**
 * Money coming in (a paycheck, a pension, side work). Recurring sources follow the bill schedule
 * rules, anchored on `date`, and the pattern runs both ways: any payday, past or next, sets it.
 */
export interface IncomeSource {
  id: string
  name: string
  /** Take-home amount each time it arrives. */
  amount: number
  frequency: Frequency
  /** One payday (yyyy-MM-dd); for a one-time source, the day it arrives. */
  date: string
}

/** Money planned each month for things that aren't bills: groceries, fuel, savings. */
export interface SetAside {
  id: string
  name: string
  /** Per month. */
  amount: number
}

export interface Settings {
  currency: string
  dueSoonDays: number
  notifications: boolean
  theme: ThemePref
}

export interface AppData {
  version: 1
  bills: Bill[]
  payments: Payment[]
  skips: Skip[]
  income: IncomeSource[]
  setAsides: SetAside[]
  settings: Settings
}

export type OccurrenceStatus = 'paid' | 'skipped' | 'overdue' | 'due-today' | 'due-soon' | 'upcoming'

/** A bill instance on a specific due date — derived, never stored. */
export interface Occurrence {
  key: string
  bill: Bill
  dueDate: string
  amount: number
  status: OccurrenceStatus
  /** Calendar days from today until due (negative when past due). */
  daysUntil: number
  payment?: Payment
  skip?: Skip
}
