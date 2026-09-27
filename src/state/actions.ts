import { useMemo } from 'react'
import { round2 } from '../lib/format'
import { uid } from '../lib/id'
import type { Bill, Occurrence } from '../lib/types'
import { useMoney } from '../hooks/useMoney'
import { useStore } from './store'
import { useToast } from './toast'
import { useUI } from './ui'

/** User-facing mutations, each with feedback and an undo path. */
export function useBillActions() {
  const { data, dispatch } = useStore()
  const toast = useToast()
  const { today, confirm } = useUI()
  const { money } = useMoney()
  const payments = data.payments

  return useMemo(
    () => ({
      markPaid(o: Occurrence, opts: { amount?: number; paidOn?: string } = {}) {
        const prev = o.payment
        const amount = round2(opts.amount ?? o.bill.amount)
        dispatch({
          type: 'pay',
          payment: { id: prev?.id ?? uid(), billId: o.bill.id, dueDate: o.dueDate, amount, paidOn: opts.paidOn ?? today },
        })
        toast(`${o.bill.name} ${prev ? 'amended' : 'settled'} · ${money(amount)}`, {
          action: {
            label: 'Undo',
            onClick: () =>
              prev ? dispatch({ type: 'pay', payment: prev }) : dispatch({ type: 'unpay', billId: o.bill.id, dueDate: o.dueDate }),
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
        dispatch({ type: 'bill/delete', id: bill.id })
        toast(`${bill.name} struck from the ledger`, {
          tone: 'info',
          action: { label: 'Undo', onClick: () => dispatch({ type: 'bill/restore', bill, payments: history }) },
        })
        return true
      },
    }),
    [payments, dispatch, toast, today, money, confirm],
  )
}
