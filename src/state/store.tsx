import { createContext, useContext, useEffect, useReducer, useRef, useState, type Dispatch, type ReactNode } from 'react'
import { addDaysISO, dueDatesInRange } from '../lib/dates'
import { payKey } from '../lib/engine'
import { uid } from '../lib/id'
import { EMPTY_DATA, STORAGE_KEY, loadData, sanitize, saveData } from '../lib/storage'
import type { AppData, Bill, Payment, Settings, Skip } from '../lib/types'

export type Action =
  | { type: 'bill/add'; bill: Bill }
  | { type: 'bill/update'; bill: Bill }
  | { type: 'bill/delete'; id: string }
  | { type: 'bill/restore'; bill: Bill; payments: Payment[]; skips: Skip[] }
  | { type: 'pay'; payment: Payment }
  | { type: 'unpay'; billId: string; dueDate: string }
  | { type: 'skip'; skip: Skip }
  | { type: 'unskip'; billId: string; dueDate: string }
  | { type: 'settings'; patch: Partial<Settings> }
  | { type: 'replace'; data: AppData }
  | { type: 'autopay'; today: string }

/** Autopay never reaches further back than this, even for old start dates. */
const AUTOPAY_LOOKBACK_DAYS = 366

function reducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case 'bill/add':
      return { ...state, bills: [...state.bills, action.bill] }

    case 'bill/update': {
      const bill = action.bill
      // Drop payments and skips that no longer line up with the (possibly re-scheduled) bill.
      const ownDates = [...state.payments, ...state.skips].filter((x) => x.billId === bill.id).map((x) => x.dueDate).sort()
      const valid = ownDates.length ? new Set(dueDatesInRange(bill, ownDates[0], ownDates[ownDates.length - 1])) : new Set<string>()
      const keep = (x: { billId: string; dueDate: string }) => x.billId !== bill.id || valid.has(x.dueDate)
      return {
        ...state,
        bills: state.bills.map((b) => (b.id === bill.id ? bill : b)),
        payments: state.payments.filter(keep),
        skips: state.skips.filter(keep),
      }
    }

    case 'bill/delete':
      return {
        ...state,
        bills: state.bills.filter((b) => b.id !== action.id),
        payments: state.payments.filter((p) => p.billId !== action.id),
        skips: state.skips.filter((s) => s.billId !== action.id),
      }

    case 'bill/restore':
      if (state.bills.some((b) => b.id === action.bill.id)) return state
      return {
        ...state,
        bills: [...state.bills, action.bill],
        payments: [...state.payments, ...action.payments],
        skips: [...state.skips, ...action.skips],
      }

    case 'pay': {
      // Paying an entry supersedes any skip on it.
      const k = payKey(action.payment.billId, action.payment.dueDate)
      return {
        ...state,
        payments: [...state.payments.filter((p) => payKey(p.billId, p.dueDate) !== k), action.payment],
        skips: state.skips.filter((s) => payKey(s.billId, s.dueDate) !== k),
      }
    }

    case 'unpay':
      return {
        ...state,
        payments: state.payments.filter((p) => !(p.billId === action.billId && p.dueDate === action.dueDate)),
      }

    case 'skip': {
      // Skipping an entry supersedes any payment on it: it simply leaves the month.
      const k = payKey(action.skip.billId, action.skip.dueDate)
      return {
        ...state,
        skips: [...state.skips.filter((s) => payKey(s.billId, s.dueDate) !== k), action.skip],
        payments: state.payments.filter((p) => payKey(p.billId, p.dueDate) !== k),
      }
    }

    case 'unskip':
      return {
        ...state,
        skips: state.skips.filter((s) => !(s.billId === action.billId && s.dueDate === action.dueDate)),
      }

    case 'settings':
      return { ...state, settings: { ...state.settings, ...action.patch } }

    case 'replace':
      return action.data

    case 'autopay': {
      const { today } = action
      // Autopay never settles an entry that has been paid or deliberately skipped.
      const have = new Set([...state.payments, ...state.skips].map((x) => payKey(x.billId, x.dueDate)))
      const added: Payment[] = []
      let touched = false
      const floor = addDaysISO(today, -AUTOPAY_LOOKBACK_DAYS)
      const bills = state.bills.map((b) => {
        if (!b.autopay || (b.autopayThrough && b.autopayThrough >= today)) return b
        const after = b.autopayThrough ? addDaysISO(b.autopayThrough, 1) : b.startDate
        const from = after > floor ? after : floor
        for (const dueDate of dueDatesInRange(b, from, today)) {
          const k = payKey(b.id, dueDate)
          if (have.has(k)) continue
          have.add(k)
          added.push({ id: uid(), billId: b.id, dueDate, amount: b.amount, paidOn: dueDate, auto: true })
        }
        touched = true
        return { ...b, autopayThrough: today }
      })
      return touched ? { ...state, bills, payments: added.length ? [...state.payments, ...added] : state.payments } : state
    }
  }
}

interface StoreValue {
  data: AppData
  dispatch: Dispatch<Action>
  /** False when the browser refused to save (private mode, full quota). */
  persisted: boolean
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(reducer, EMPTY_DATA, loadData)
  const [persisted, setPersisted] = useState(true)
  const skipNextSave = useRef(false)

  useEffect(() => {
    if (skipNextSave.current) {
      skipNextSave.current = false
      return
    }
    setPersisted(saveData(data))
  }, [data])

  // Keep multiple open tabs in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return
      try {
        const next = sanitize(JSON.parse(e.newValue))
        if (next) {
          skipNextSave.current = true
          dispatch({ type: 'replace', data: next })
        }
      } catch {
        /* ignore malformed writes from elsewhere */
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return (
    <StoreContext.Provider value={{ data, dispatch, persisted }}>{children}</StoreContext.Provider>
  )
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>')
  return ctx
}
