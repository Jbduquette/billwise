import { useMemo } from 'react'
import { fmtDate } from '../lib/dates'
import { round2 } from '../lib/format'
import { uid } from '../lib/id'
import { markRecentlyPaid, markRecentlySkipped } from '../lib/motion'
import type { Bill, IncomeSource, Occurrence, SetAside } from '../lib/types'
import { useMoney } from '../hooks/useMoney'
import { useStore, type Action } from './store'
import { useToast } from './toast'
import { useUI } from './ui'

/** Income and set-aside edits for the Budget page, each with feedback; deletes can be undone. */
export function useBudgetActions() {
  const { data, dispatch } = useStore()
  const toast = useToast()
  const { money } = useMoney()
  const { income, setAsides } = data

  return useMemo(
    () => ({
      saveIncome(source: IncomeSource) {
        const isNew = !income.some((x) => x.id === source.id)
        dispatch({ type: 'income/save', source })
        toast(isNew ? `${source.name} added · ${money(source.amount)} each time` : `${source.name} amended`)
      },
      deleteIncome(source: IncomeSource) {
        const index = income.findIndex((x) => x.id === source.id)
        dispatch({ type: 'income/delete', id: source.id })
        toast(`${source.name} removed from income`, {
          tone: 'info',
          action: { label: 'Undo', onClick: () => dispatch({ type: 'income/save', source, index }) },
        })
      },
      saveSetAside(setAside: SetAside) {
        const isNew = !setAsides.some((x) => x.id === setAside.id)
        dispatch({ type: 'setAside/save', setAside })
        toast(isNew ? `${money(setAside.amount)} a month set aside for ${setAside.name}` : `${setAside.name} amended`)
      },
      deleteSetAside(setAside: SetAside) {
        const index = setAsides.findIndex((x) => x.id === setAside.id)
        dispatch({ type: 'setAside/delete', id: setAside.id })
        toast(`${setAside.name} removed · ${money(setAside.amount)} back in the month`, {
          tone: 'info',
          action: { label: 'Undo', onClick: () => dispatch({ type: 'setAside/save', setAside, index }) },
        })
      },
    }),
    [income, setAsides, dispatch, toast, money],
  )
}

/** The action that puts an entry back exactly as it was (paid, skipped, or open). */
function restoreAction(o: Occurrence): Action {
  if (o.payment) return { type: 'pay', payment: o.payment }
  if (o.skip) return { type: 'skip', skip: o.skip }
  return { type: 'unskip', billId: o.bill.id, dueDate: o.dueDate }
}

/** User-facing mutations, each with feedback and an undo path. */
export function useBillActions() {
  const { data, dispatch } = useStore()
  const toast = useToast()
  const { today, confirm } = useUI()
  const { money } = useMoney()
  const { payments, skips } = data

  return useMemo(
    () => ({
      markPaid(o: Occurrence, opts: { amount?: number; paidOn?: string } = {}) {
        const prev = o.payment
        const amount = round2(opts.amount ?? o.bill.amount)
        if (!prev) markRecentlyPaid(o.key)
        dispatch({
          type: 'pay',
          payment: { id: prev?.id ?? uid(), billId: o.bill.id, dueDate: o.dueDate, amount, paidOn: opts.paidOn ?? today },
        })
        toast(`${o.bill.name} ${prev ? 'amended' : 'settled'} · ${money(amount)}`, {
          action: {
            label: 'Undo',
            onClick: () => {
              if (!prev) dispatch({ type: 'unpay', billId: o.bill.id, dueDate: o.dueDate })
              dispatch(restoreAction(o))
            },
          },
        })
      },

      markUnpaid(o: Occurrence) {
        const prev = o.payment
        if (!prev) return
        dispatch({ type: 'unpay', billId: o.bill.id, dueDate: o.dueDate })
        toast(`${o.bill.name} reopened`, {
          tone: 'info',
          action: { label: 'Undo', onClick: () => dispatch({ type: 'pay', payment: prev }) },
        })
      },

      /** Take one entry out of what's owed without it counting as paid. */
      skip(o: Occurrence) {
        if (o.skip) return
        markRecentlySkipped(o.key)
        dispatch({ type: 'skip', skip: { id: uid(), billId: o.bill.id, dueDate: o.dueDate, skippedOn: today } })
        toast(`${o.bill.name} skipped for ${fmtDate(o.dueDate, 'd MMM')} · ${money(o.bill.amount)} no longer owed`, {
          tone: 'info',
          action: {
            label: 'Undo',
            onClick: () => {
              dispatch({ type: 'unskip', billId: o.bill.id, dueDate: o.dueDate })
              if (o.payment) dispatch({ type: 'pay', payment: o.payment })
            },
          },
        })
      },

      /** Put a skipped entry back into what's owed. */
      unskip(o: Occurrence) {
        const prev = o.skip
        if (!prev) return
        dispatch({ type: 'unskip', billId: o.bill.id, dueDate: o.dueDate })
        toast(`${o.bill.name} restored · ${money(o.bill.amount)} owed again`, {
          tone: 'info',
          action: { label: 'Undo', onClick: () => dispatch({ type: 'skip', skip: prev }) },
        })
      },

      saveBill(bill: Bill, isNew: boolean) {
        dispatch({ type: isNew ? 'bill/add' : 'bill/update', bill })
        if (bill.autopay) dispatch({ type: 'autopay', today })
        toast(isNew ? `${bill.name} entered in the ledger` : `${bill.name} amended`)
      },

      async deleteBill(bill: Bill): Promise<boolean> {
        const ok = await confirm({
          title: `Delete ${bill.name}?`,
          message: 'This removes the bill and its payment history. You can undo right after.',
          confirmLabel: 'Delete bill',
          tone: 'danger',
        })
        if (!ok) return false
        const history = payments.filter((p) => p.billId === bill.id)
        const skipped = skips.filter((s) => s.billId === bill.id)
        dispatch({ type: 'bill/delete', id: bill.id })
        toast(`${bill.name} struck from the ledger`, {
          tone: 'info',
          action: { label: 'Undo', onClick: () => dispatch({ type: 'bill/restore', bill, payments: history, skips: skipped }) },
        })
        return true
      },
    }),
    [payments, skips, dispatch, toast, today, money, confirm],
  )
}
