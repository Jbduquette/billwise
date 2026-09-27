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
  settings: Settings
}

export type OccurrenceStatus = 'paid' | 'overdue' | 'due-today' | 'due-soon' | 'upcoming'

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
}
