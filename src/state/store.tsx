import { createContext, useContext, useEffect, useReducer, useRef, useState, type Dispatch, type ReactNode } from 'react'
import { addDaysISO, dueDatesInRange } from '../lib/dates'
import { payKey } from '../lib/engine'
import { uid } from '../lib/id'
import { EMPTY_DATA, STORAGE_KEY, loadData, sanitize, saveData } from '../lib/storage'
import type { AppData, Bill, Payment, Settings } from '../lib/types'

export type Action =
  | { type: 'bill/add'; bill: Bill }
  | { type: 'bill/update'; bill: Bill }
  | { type: 'bill/delete'; id: string }
  | { type: 'bill/restore'; bill: Bill; payments: Payment[] }
  | { type: 'pay'; payment: Payment }
  | { type: 'unpay'; billId: string; dueDate: string }
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
      // Drop payments that no longer line up with the (possibly re-scheduled) bill.
      const own = state.payments.filter((p) => p.billId === bill.id)
      let valid = new Set<string>()
      if (own.length) {
        const dates = own.map((p) => p.dueDate).sort()
        valid = new Set(dueDatesInRange(bill, dates[0], dates[dates.length - 1]))
      }
      return {
        ...state,
        bills: state.bills.map((b) => (b.id === bill.id ? bill : b)),
        payments: state.payments.filter((p) => p.billId !== bill.id || valid.has(p.dueDate)),
      }
    }

    case 'bill/delete':
      return {
        ...state,
        bills: state.bills.filter((b) => b.id !== action.id),
        payments: state.payments.filter((p) => p.billId !== action.id),
      }

    case 'bill/restore':
      if (state.bills.some((b) => b.id === action.bill.id)) return state
      return { ...state, bills: [...state.bills, action.bill], payments: [...state.payments, ...action.payments] }

    case 'pay': {
      const k = payKey(action.payment.billId, action.payment.dueDate)
      return {
        ...state,
        payments: [...state.payments.filter((p) => payKey(p.billId, p.dueDate) !== k), action.payment],
      }
    }

    case 'unpay':
      return {
        ...state,
        payments: state.payments.filter((p) => !(p.billId === action.billId && p.dueDate === action.dueDate)),
      }

    case 'settings':
      return { ...state, settings: { ...state.settings, ...action.patch } }

    case 'replace':
      return action.data

    case 'autopay': {
      const { today } = action
      const have = new Set(state.payments.map((p) => payKey(p.billId, p.dueDate)))
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
