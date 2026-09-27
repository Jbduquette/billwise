import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { monthStart } from '../lib/dates'
import type { Bill, Occurrence } from '../lib/types'

export interface ConfirmOptions {
  title: string
  message?: string
  confirmLabel?: string
  tone?: 'danger' | 'default'
}

interface OccurrenceRef {
  billId: string
  dueDate: string
}

interface UIValue {
  today: string
  month: string
  setMonth: (month: string) => void
  editor: { open: boolean; bill: Bill | null }
  openEditor: (bill?: Bill | null) => void
  closeEditor: () => void
  occurrence: OccurrenceRef | null
  openOccurrence: (o: Occurrence) => void
  closeOccurrence: () => void
  confirm: (opts: ConfirmOptions) => Promise<boolean>
  confirmState: ConfirmOptions | null
  resolveConfirm: (ok: boolean) => void
}

const UIContext = createContext<UIValue | null>(null)

export function UIProvider({ today, children }: { today: string; children: ReactNode }) {
  const [month, setMonthState] = useState(() => monthStart(today))
  const [editor, setEditor] = useState<{ open: boolean; bill: Bill | null }>({ open: false, bill: null })
  const [occurrence, setOccurrence] = useState<OccurrenceRef | null>(null)
  const [confirmState, setConfirmState] = useState<ConfirmOptions | null>(null)
  const resolver = useRef<((ok: boolean) => void) | null>(null)

  const setMonth = useCallback((m: string) => setMonthState(monthStart(m)), [])
  // Keep the bill while the sheet animates closed so its contents don't blank out mid-exit.
  const openEditor = useCallback((bill: Bill | null = null) => setEditor({ open: true, bill }), [])
  const closeEditor = useCallback(() => setEditor((e) => ({ ...e, open: false })), [])
  const openOccurrence = useCallback((o: Occurrence) => setOccurrence({ billId: o.bill.id, dueDate: o.dueDate }), [])
  const closeOccurrence = useCallback(() => setOccurrence(null), [])

  const confirm = useCallback((opts: ConfirmOptions) => {
    resolver.current?.(false)
    setConfirmState(opts)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const resolveConfirm = useCallback((ok: boolean) => {
    resolver.current?.(ok)
    resolver.current = null
    setConfirmState(null)
  }, [])

  const value = useMemo<UIValue>(
    () => ({
      today,
      month,
      setMonth,
      editor,
      openEditor,
      closeEditor,
      occurrence,
      openOccurrence,
      closeOccurrence,
      confirm,
      confirmState,
      resolveConfirm,
    }),
    [today, month, setMonth, editor, openEditor, closeEditor, occurrence, openOccurrence, closeOccurrence, confirm, confirmState, resolveConfirm],
  )

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>
}

export function useUI(): UIValue {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error('useUI must be used inside <UIProvider>')
  return ctx
}
