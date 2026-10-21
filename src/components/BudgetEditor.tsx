import { AnimatePresence, motion } from 'motion/react'
import { Trash2 } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react'
import { useMoney } from '../hooks/useMoney'
import { incomeMonthlyEquivalent, paydaysInRange } from '../lib/budget'
import { cx } from '../lib/cx'
import { FREQUENCIES, fmtDate, monthEnd, monthStart } from '../lib/dates'
import { round2 } from '../lib/format'
import { uid } from '../lib/id'
import type { Frequency, IncomeSource, SetAside } from '../lib/types'
import { useBudgetActions } from '../state/actions'
import { useUI } from '../state/ui'
import { currencySymbol, Field, parseAmount } from './BillEditor'
import { Button } from './ui/Button'
import { DATE_PLACEHOLDER, DateField } from './ui/DateField'
import { Sheet } from './ui/Sheet'

export type BudgetEditing =
  | { kind: 'income'; item: IncomeSource | null }
  | { kind: 'setAside'; item: SetAside | null; name?: string }

const SUGGESTIONS = ['Groceries', 'Fuel', 'Savings', 'Eating out', 'Household', 'Fun money']

const SELECT_BG = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%237a7164' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
}

const FORM_ID = 'budget-editor-form'

/** One sheet for both halves of the plan: a source of income, or a monthly set-aside. */
export function BudgetEditor({ editing, open, onClose }: { editing: BudgetEditing; open: boolean; onClose: () => void }) {
  // A fresh form each time the sheet opens.
  const [session, setSession] = useState(0)
  const wasOpen = useRef(false)
  useEffect(() => {
    if (open && !wasOpen.current) setSession((s) => s + 1)
    wasOpen.current = open
  }, [open])

  const income = editing.kind === 'income'
  const isNew = !editing.item
  const title = income ? (isNew ? 'Add income' : 'Amend income') : isNew ? 'Set money aside' : 'Amend set-aside'
  const description = income
    ? isNew
      ? 'Take-home pay, after tax: what actually reaches your account.'
      : undefined
    : isNew
      ? 'A monthly amount for something that isn’t a bill: groceries, fuel, savings.'
      : undefined

  return (
    <Sheet open={open} onClose={onClose} title={title} description={description} size="sm" footer={<Footer editing={editing} onClose={onClose} />}>
      {income ? (
        <IncomeForm key={`${editing.item?.id ?? 'new'}-${session}`} item={editing.item} onDone={onClose} />
      ) : (
        <SetAsideForm key={`${editing.item?.id ?? 'new'}-${session}`} item={editing.item} name={editing.name} onDone={onClose} />
      )}
    </Sheet>
  )
}

function Footer({ editing, onClose }: { editing: BudgetEditing; onClose: () => void }) {
  const actions = useBudgetActions()
  const remove = () => {
    if (editing.kind === 'income' && editing.item) actions.deleteIncome(editing.item)
    else if (editing.kind === 'setAside' && editing.item) actions.deleteSetAside(editing.item)
    onClose()
  }
  return (
    <>
      {editing.item && (
        <Button variant="ghost" className="text-verm hover:bg-verm-soft hover:text-verm" onClick={remove}>
          <Trash2 aria-hidden className="size-4" />
          Remove
        </Button>
      )}
      <div className="ml-auto flex gap-2">
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" type="submit" form={FORM_ID}>
          {editing.item ? 'Save changes' : editing.kind === 'income' ? 'Add income' : 'Set aside'}
        </Button>
      </div>
    </>
  )
}

function amountError(raw: string, what: string) {
  const n = parseAmount(raw)
  if (!raw.trim()) return `Enter ${what}.`
  if (!Number.isFinite(n) || n <= 0) return 'Amount must be a number greater than 0.'
  if (n > 10_000_000) return 'That amount looks too large.'
  return undefined
}

/** Shared form plumbing: errors show once a field is left or the form is submitted. */
function useFormState<K extends string>(validate: () => Partial<Record<K, string>>) {
  const [touched, setTouched] = useState<Partial<Record<K, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)
  const errors = validate()
  return {
    errors,
    show: (k: K) => (submitted || touched[k] ? errors[k] : undefined),
    blur: (k: K) => () => setTouched((t) => ({ ...t, [k]: true })),
    /** Marks the form submitted; returns the first field with an error, if any. */
    submit: (order: K[]) => {
      setSubmitted(true)
      return order.find((k) => errors[k])
    },
  }
}

function AmountInput({
  id,
  value,
  onChange,
  onBlur,
  invalid,
  autofocus,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  onBlur: () => void
  invalid: boolean
  autofocus?: boolean
}) {
  const { currency } = useMoney()
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3.5 grid place-items-center text-muted" aria-hidden>
        {currencySymbol(currency)}
      </span>
      <input
        id={id}
        data-field="amount"
        data-autofocus={autofocus || undefined}
        className="field tabular pl-9"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder="0.00"
        autoComplete="off"
        aria-invalid={invalid}
        aria-describedby={invalid ? `${id}-err` : undefined}
      />
    </div>
  )
}

function IncomeForm({ item, onDone }: { item: IncomeSource | null; onDone: () => void }) {
  const { today, month } = useUI()
  const { money } = useMoney()
  const actions = useBudgetActions()
  const formRef = useRef<HTMLFormElement>(null)
  const ids = { name: useId(), amount: useId(), freq: useId(), date: useId() }
  const [name, setName] = useState(item?.name ?? '')
  const [amount, setAmount] = useState(item ? String(item.amount) : '')
  const [frequency, setFrequency] = useState<Frequency>(item?.frequency ?? 'biweekly')
  const [date, setDate] = useState(item?.date ?? today)

  const form = useFormState<'name' | 'amount' | 'date'>(() => ({
    name: name.trim() ? undefined : 'Give this income a name.',
    amount: amountError(amount, 'the take-home amount'),
    date: date ? undefined : frequency === 'once' ? `Enter the day it arrives as ${DATE_PLACEHOLDER}.` : `Enter a payday as ${DATE_PLACEHOLDER}.`,
  }))

  const preview = useMemo(() => {
    const amt = parseAmount(amount)
    if (!Number.isFinite(amt) || amt <= 0 || !date) return null
    const source: IncomeSource = { id: '', name, amount: amt, frequency, date }
    const days = paydaysInRange(source, monthStart(month), monthEnd(month))
    return { perMonth: incomeMonthlyEquivalent(source), days, total: days.length * amt }
  }, [amount, date, frequency, name, month])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const bad = form.submit(['name', 'amount', 'date'])
    if (bad) {
      formRef.current?.querySelector<HTMLElement>(`[data-field="${bad}"]`)?.focus()
      return
    }
    actions.saveIncome({ id: item?.id ?? uid(), name: name.trim(), amount: round2(parseAmount(amount)), frequency, date })
    onDone()
  }

  const monthName = fmtDate(month, 'MMMM')
  return (
    <form id={FORM_ID} ref={formRef} onSubmit={submit} noValidate className="space-y-5">
      <Field id={ids.name} label="Name" error={form.show('name')}>
        <input
          id={ids.name}
          data-field="name"
          data-autofocus={!item || undefined}
          className="field"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={form.blur('name')}
          placeholder="e.g. Paycheck, Pension, Side work"
          maxLength={80}
          autoComplete="off"
          aria-invalid={!!form.show('name')}
          aria-describedby={form.show('name') ? `${ids.name}-err` : undefined}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={ids.amount} label="Take-home amount" error={form.show('amount')}>
          <AmountInput id={ids.amount} value={amount} onChange={setAmount} onBlur={form.blur('amount')} invalid={!!form.show('amount')} />
        </Field>
        <Field id={ids.freq} label="Arrives">
          <select
            id={ids.freq}
            className="field appearance-none bg-[length:1rem] bg-[right_0.85rem_center] bg-no-repeat pr-10"
            style={SELECT_BG}
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as Frequency)}
          >
            {FREQUENCIES.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field id={ids.date} label={frequency === 'once' ? 'Day it arrives' : 'A payday'} error={form.show('date')}>
        <DateField
          id={ids.date}
          dataField="date"
          value={date}
          onChange={setDate}
          onBlur={form.blur('date')}
          invalid={!!form.show('date')}
          describedBy={form.show('date') ? `${ids.date}-err` : `${ids.date}-hint`}
        />
        {!form.show('date') && frequency !== 'once' && (
          <p id={`${ids.date}-hint`} className="mt-1.5 text-[13px] text-muted">
            Your last payday or your next one: Billwise works out the rest. Paid twice a month on set dates? Add each as its own monthly income.
          </p>
        )}
      </Field>

      <AnimatePresence>
        {preview && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="border-l-2 border-ink bg-bg-2 px-4 py-3 font-serif text-[15px] text-ink-2 italic"
          >
            {preview.days.length ? (
              <>
                In {monthName}: <span className="fig text-ink not-italic">{money(preview.total)}</span>, on{' '}
                {listDates(preview.days)}.
              </>
            ) : (
              <>Nothing arrives in {monthName}.</>
            )}
            {frequency !== 'once' && frequency !== 'monthly' && (
              <>
                {' '}
                About <span className="fig text-ink not-italic">{money(preview.perMonth)}</span> in an average month.
              </>
            )}
          </motion.p>
        )}
      </AnimatePresence>
    </form>
  )
}

function listDates(days: string[]) {
  const d = days.map((x) => fmtDate(x, 'd MMM'))
  return d.length < 3 ? d.join(' and ') : `${d.slice(0, -1).join(', ')} and ${d[d.length - 1]}`
}

function SetAsideForm({ item, name: preset, onDone }: { item: SetAside | null; name?: string; onDone: () => void }) {
  const actions = useBudgetActions()
  const formRef = useRef<HTMLFormElement>(null)
  const ids = { name: useId(), amount: useId() }
  const [name, setName] = useState(item?.name ?? preset ?? '')
  const [amount, setAmount] = useState(item ? String(item.amount) : '')

  const form = useFormState<'name' | 'amount'>(() => ({
    name: name.trim() ? undefined : 'Say what this money is for.',
    amount: amountError(amount, 'an amount for each month'),
  }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const bad = form.submit(['name', 'amount'])
    if (bad) {
      formRef.current?.querySelector<HTMLElement>(`[data-field="${bad}"]`)?.focus()
      return
    }
    actions.saveSetAside({ id: item?.id ?? uid(), name: name.trim(), amount: round2(parseAmount(amount)) })
    onDone()
  }

  return (
    <form id={FORM_ID} ref={formRef} onSubmit={submit} noValidate className="space-y-5">
      <Field id={ids.name} label="For" error={form.show('name')}>
        <input
          id={ids.name}
          data-field="name"
          data-autofocus={(!item && !preset) || undefined}
          className="field"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={form.blur('name')}
          placeholder="e.g. Groceries"
          maxLength={80}
          autoComplete="off"
          aria-invalid={!!form.show('name')}
          aria-describedby={form.show('name') ? `${ids.name}-err` : undefined}
        />
        {!item && (
          <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Suggestions">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setName(s)}
                aria-pressed={name === s}
                className={cx(
                  'min-h-9 rounded-[3px] border px-2.5 text-[13px] transition-colors',
                  name === s ? 'border-ink bg-bg-2 text-ink' : 'border-rule-strong text-ink-2 hover:border-ink hover:text-ink',
                )}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </Field>
      <Field id={ids.amount} label="Each month" error={form.show('amount')}>
          <AmountInput id={ids.amount} value={amount} onChange={setAmount} onBlur={form.blur('amount')} invalid={!!form.show('amount')} autofocus={!item && !!preset} />
      </Field>
    </form>
  )
}
