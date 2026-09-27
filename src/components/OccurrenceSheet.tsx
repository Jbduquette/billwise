import { useId, useMemo, useState } from 'react'
import { useMoney } from '../hooks/useMoney'
import { category } from '../lib/categories'
import { daysBetween, fmtDate, frequencyMeta } from '../lib/dates'
import { payKey, statusFor } from '../lib/engine'
import type { Occurrence } from '../lib/types'
import { useBillActions } from '../state/actions'
import { useStore } from '../state/store'
import { useUI } from '../state/ui'
import { Button } from './ui/Button'
import { Sheet } from './ui/Sheet'
import { StatusText } from './ui/StatusText'

/** One entry in full: the figures, and a form to record (or amend) its payment. */
export function OccurrenceSheet() {
  const { occurrence: ref, closeOccurrence, today } = useUI()
  const { data } = useStore()

  // Resolve fresh from the store so the sheet reflects changes live.
  const occ = useMemo<Occurrence | null>(() => {
    if (!ref) return null
    const bill = data.bills.find((b) => b.id === ref.billId)
    if (!bill) return null
    const payment = data.payments.find((p) => p.billId === bill.id && p.dueDate === ref.dueDate)
    const daysUntil = daysBetween(today, ref.dueDate)
    return {
      key: payKey(bill.id, ref.dueDate),
      bill,
      dueDate: ref.dueDate,
      payment,
      daysUntil,
      amount: payment?.amount ?? bill.amount,
      status: statusFor(daysUntil, data.settings.dueSoonDays, !!payment),
    }
  }, [ref, data, today])

  // Keep the last entry around while the sheet animates out.
  const [last, setLast] = useState<Occurrence | null>(null)
  if (occ && occ !== last) setLast(occ)
  const shown = occ ?? last

  return (
    <Sheet
      open={!!occ}
      onClose={closeOccurrence}
      title={shown?.bill.name ?? ''}
      description={shown && `${category(shown.bill.category).label} · ${frequencyMeta(shown.bill.frequency).label.toLowerCase()}`}
      size="sm"
    >
      {shown && <OccurrenceBody key={shown.key + (shown.payment?.id ?? '')} occ={shown} />}
    </Sheet>
  )
}

function OccurrenceBody({ occ }: { occ: Occurrence }) {
  const { money } = useMoney()
  const { today, closeOccurrence, openEditor } = useUI()
  const actions = useBillActions()
  const paid = occ.status === 'paid'
  const late = occ.status === 'overdue'
  const [amount, setAmount] = useState(String(occ.payment?.amount ?? occ.bill.amount))
  const [paidOn, setPaidOn] = useState(occ.payment?.paidOn ?? today)
  const [error, setError] = useState<string | null>(null)
  const amountId = useId()
  const dateId = useId()

  const submit = () => {
    const n = Number(amount.replace(/[^\d.-]/g, ''))
    if (!Number.isFinite(n) || n < 0) {
      setError('Enter a valid amount.')
      return
    }
    if (!paidOn) {
      setError('Pick the date you paid.')
      return
    }
    actions.markPaid(occ, { amount: n, paidOn })
    closeOccurrence()
  }

  return (
    <div className="space-y-6">
      <div className="border-y border-ink py-4">
        <div className="flex items-baseline justify-between gap-4">
          <p className={`fig text-[2.5rem] leading-none ${late ? 'text-verm' : 'text-ink'}`}>{money(occ.amount)}</p>
          <StatusText occurrence={occ} />
        </div>
        <p className="mt-2 font-serif text-[15px] text-ink-2 italic">Due {fmtDate(occ.dueDate, 'EEEE, d MMMM yyyy')}</p>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
        <div>
          <dt className="sc">Expected</dt>
          <dd className="fig mt-0.5 text-[1.125rem] text-ink">{money(occ.bill.amount)}</dd>
        </div>
        <div>
          <dt className="sc">{paid ? 'Settled on' : 'Method'}</dt>
          <dd className="mt-0.5 text-[15px] text-ink">
            {paid && occ.payment ? fmtDate(occ.payment.paidOn, 'd MMM yyyy') : occ.bill.autopay ? 'Autopay' : 'By hand'}
            {paid && occ.payment?.auto && <span className="text-muted"> · autopay</span>}
          </dd>
        </div>
        {occ.bill.notes && (
          <div className="col-span-2">
            <dt className="sc">Notes</dt>
            <dd className="mt-0.5 font-serif text-[15px] whitespace-pre-wrap text-ink-2 italic">{occ.bill.notes}</dd>
          </div>
        )}
      </dl>

      <form
        className="space-y-4 border-t border-rule pt-5"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        noValidate
      >
        <p className="font-serif text-[1.25rem] text-ink">{paid ? 'The payment' : 'Record the payment'}</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={amountId} className="label">
              Amount paid
            </label>
            <input
              id={amountId}
              className="field tabular"
              inputMode="decimal"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value)
                setError(null)
              }}
              aria-invalid={!!error}
              data-autofocus={!paid || undefined}
            />
          </div>
          <div>
            <label htmlFor={dateId} className="label">
              Paid on
            </label>
            <input id={dateId} type="date" className="field" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
          </div>
        </div>
        {error && (
          <p role="alert" className="text-[13px] font-medium text-verm">
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="primary" className="flex-1">
            {paid ? 'Update payment' : 'Settle this bill'}
          </Button>
          {paid && (
            <Button
              onClick={() => {
                actions.markUnpaid(occ)
                closeOccurrence()
              }}
            >
              Reopen
            </Button>
          )}
        </div>
      </form>

      <button
        type="button"
        className="min-h-11 w-full text-center text-[15px] text-ink underline decoration-rule-strong underline-offset-[6px] hover:decoration-ink"
        onClick={() => {
          closeOccurrence()
          openEditor(occ.bill)
        }}
      >
        Amend the bill itself →
      </button>
    </div>
  )
}
