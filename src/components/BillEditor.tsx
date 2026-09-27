import { AnimatePresence, motion } from 'motion/react'
import { Trash2 } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useMoney } from '../hooks/useMoney'
import { CATEGORIES } from '../lib/categories'
import { cx } from '../lib/cx'
import { FREQUENCIES, fmtDate, nextDueDate } from '../lib/dates'
import { monthlyEquivalent } from '../lib/engine'
import { round2 } from '../lib/format'
import { uid } from '../lib/id'
import type { Bill, CategoryId, Frequency } from '../lib/types'
import { useBillActions } from '../state/actions'
import { useUI } from '../state/ui'
import { Button } from './ui/Button'
import { Sheet } from './ui/Sheet'
import { Switch } from './ui/Switch'

interface Draft {
  name: string
  amount: string
  category: CategoryId
  frequency: Frequency
  startDate: string
  hasEnd: boolean
  endDate: string
  autopay: boolean
  notes: string
}

type Errors = Partial<Record<'name' | 'amount' | 'startDate' | 'endDate', string>>

const toDraft = (bill: Bill | null, today: string): Draft => ({
  name: bill?.name ?? '',
  amount: bill ? String(bill.amount) : '',
  category: bill?.category ?? 'housing',
  frequency: bill?.frequency ?? 'monthly',
  startDate: bill?.startDate ?? today,
  hasEnd: !!bill?.endDate,
  endDate: bill?.endDate ?? '',
  autopay: bill?.autopay ?? false,
  notes: bill?.notes ?? '',
})

/** Accepts "1,234.50", "$45", "45." etc. */
const parseAmount = (s: string) => Number(s.replace(/[^\d.-]/g, ''))

function validate(d: Draft): Errors {
  const e: Errors = {}
  if (!d.name.trim()) e.name = 'Give this bill a name.'
  const amt = parseAmount(d.amount)
  if (!d.amount.trim()) e.amount = 'Enter the amount due.'
  else if (!Number.isFinite(amt) || amt <= 0) e.amount = 'Amount must be a number greater than 0.'
  else if (amt > 10_000_000) e.amount = 'That amount looks too large.'
  if (!d.startDate) e.startDate = 'Pick the first due date.'
  if (d.hasEnd && d.frequency !== 'once') {
    if (!d.endDate) e.endDate = 'Pick an end date or turn this off.'
    else if (d.endDate < d.startDate) e.endDate = 'End date must be after the first due date.'
  }
  return e
}

function currencySymbol(currency: string) {
  try {
    return (
      new Intl.NumberFormat(undefined, { style: 'currency', currency }).formatToParts(0).find((p) => p.type === 'currency')
        ?.value ?? '$'
    )
  } catch {
    return '$'
  }
}

export function BillEditor() {
  const { editor, closeEditor, today } = useUI()
  // New key each time the sheet opens so the form starts fresh.
  const [session, setSession] = useState(0)
  const wasOpen = useRef(false)
  useEffect(() => {
    if (editor.open && !wasOpen.current) setSession((s) => s + 1)
    wasOpen.current = editor.open
  }, [editor.open])

  const isNew = !editor.bill
  return (
    <Sheet
      open={editor.open}
      onClose={closeEditor}
      title={isNew ? 'Enter a bill' : 'Amend this bill'}
      description={isNew ? 'Recurring bills repeat on their own — enter each one once.' : undefined}
      footer={<EditorFooter isNew={isNew} bill={editor.bill} />}
    >
      <BillForm key={`${editor.bill?.id ?? 'new'}-${session}`} bill={editor.bill} today={today} />
    </Sheet>
  )
}

const FORM_ID = 'bill-editor-form'

function EditorFooter({ isNew, bill }: { isNew: boolean; bill: Bill | null }) {
  const { closeEditor } = useUI()
  const actions = useBillActions()
  return (
    <>
      {!isNew && bill && (
        <Button
          variant="ghost"
          className="text-verm hover:bg-verm-soft hover:text-verm"
          onClick={async () => {
            if (await actions.deleteBill(bill)) closeEditor()
          }}
        >
          <Trash2 aria-hidden className="size-4" />
          Delete
        </Button>
      )}
      <div className="ml-auto flex gap-2">
        <Button onClick={closeEditor}>Cancel</Button>
        <Button variant="primary" type="submit" form={FORM_ID}>
          {isNew ? 'Enter bill' : 'Save changes'}
        </Button>
      </div>
    </>
  )
}

function BillForm({ bill, today }: { bill: Bill | null; today: string }) {
  const { closeEditor } = useUI()
  const actions = useBillActions()
  const { money, currency } = useMoney()
  const [draft, setDraft] = useState(() => toDraft(bill, today))
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [submitted, setSubmitted] = useState(false)
  const ids = { name: useId(), amount: useId(), start: useId(), end: useId(), freq: useId(), notes: useId() }
  const formRef = useRef<HTMLFormElement>(null)

  const errors = useMemo(() => validate(draft), [draft])
  const show = (k: keyof Errors) => (submitted || touched[k] ? errors[k] : undefined)
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }))
  const blur = (k: string) => () => setTouched((t) => ({ ...t, [k]: true }))

  const preview = useMemo(() => {
    const amt = parseAmount(draft.amount)
    if (!Number.isFinite(amt) || amt <= 0 || !draft.startDate) return null
    const b = {
      ...(bill ?? ({} as Bill)),
      amount: amt,
      frequency: draft.frequency,
      startDate: draft.startDate,
      endDate: draft.hasEnd && draft.endDate ? draft.endDate : null,
    } as Bill
    const next = nextDueDate(b, today)
    return { monthly: monthlyEquivalent(b), next }
  }, [draft, bill, today])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    const errs = validate(draft)
    const firstBad = (['name', 'amount', 'startDate', 'endDate'] as const).find((k) => errs[k])
    if (firstBad) {
      formRef.current?.querySelector<HTMLElement>(`[data-field="${firstBad}"]`)?.focus()
      return
    }
    const next: Bill = {
      id: bill?.id ?? uid(),
      createdAt: bill?.createdAt ?? new Date().toISOString(),
      autopayThrough: bill?.autopayThrough ?? null,
      name: draft.name.trim(),
      amount: round2(parseAmount(draft.amount)),
      category: draft.category,
      frequency: draft.frequency,
      startDate: draft.startDate,
      endDate: draft.hasEnd && draft.frequency !== 'once' && draft.endDate ? draft.endDate : null,
      autopay: draft.autopay,
      notes: draft.notes.trim(),
    }
    actions.saveBill(next, !bill)
    closeEditor()
  }

  return (
    <form id={FORM_ID} ref={formRef} onSubmit={submit} noValidate className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-[1fr_11rem]">
        <Field id={ids.name} label="Bill name" error={show('name')}>
          <input
            id={ids.name}
            data-field="name"
            data-autofocus={!bill || undefined}
            className="field"
            value={draft.name}
            onChange={(e) => set('name', e.target.value)}
            onBlur={blur('name')}
            placeholder="e.g. Rent, Electric, Netflix"
            maxLength={80}
            autoComplete="off"
            aria-invalid={!!show('name')}
            aria-describedby={show('name') ? `${ids.name}-err` : undefined}
          />
        </Field>
        <Field id={ids.amount} label="Amount" error={show('amount')}>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3.5 grid place-items-center text-muted" aria-hidden>
              {currencySymbol(currency)}
            </span>
            <input
              id={ids.amount}
              data-field="amount"
              className="field tabular pl-9"
              inputMode="decimal"
              value={draft.amount}
              onChange={(e) => set('amount', e.target.value)}
              onBlur={blur('amount')}
              placeholder="0.00"
              autoComplete="off"
              aria-invalid={!!show('amount')}
              aria-describedby={show('amount') ? `${ids.amount}-err` : undefined}
            />
          </div>
        </Field>
      </div>

      <fieldset>
        <legend className="label">Category</legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {CATEGORIES.map((c) => {
            const active = draft.category === c.id
            const Icon = c.icon
            return (
              <label
                key={c.id}
                className={cx(
                  'relative flex min-h-[4.25rem] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[3px] border px-1.5 py-2 text-center text-[12px] font-medium leading-tight transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-verm',
                  active ? 'border-ink bg-bg-2 text-ink shadow-[inset_0_0_0_1px_var(--ink)]' : 'border-rule-strong text-ink-2 hover:border-ink hover:text-ink',
                )}
              >
                <input
                  type="radio"
                  name="category"
                  value={c.id}
                  checked={active}
                  onChange={() => set('category', c.id)}
                  className="sr-only"
                />
                <Icon aria-hidden className="size-5" strokeWidth={1.6} />
                {c.label}
              </label>
            )
          })}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={ids.freq} label="Repeats">
          <select
            id={ids.freq}
            className="field appearance-none bg-[length:1rem] bg-[right_0.85rem_center] bg-no-repeat pr-10"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%237a7164' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
            }}
            value={draft.frequency}
            onChange={(e) => set('frequency', e.target.value as Frequency)}
          >
            {FREQUENCIES.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </Field>
        <Field id={ids.start} label={draft.frequency === 'once' ? 'Due date' : 'First due date'} error={show('startDate')}>
          <input
            id={ids.start}
            data-field="startDate"
            type="date"
            className="field"
            value={draft.startDate}
            onChange={(e) => set('startDate', e.target.value)}
            onBlur={blur('startDate')}
            aria-invalid={!!show('startDate')}
            aria-describedby={show('startDate') ? `${ids.start}-err` : undefined}
          />
        </Field>
      </div>

      {draft.frequency !== 'once' && (
        <div className="border-y border-rule">
          <Switch
            checked={draft.hasEnd}
            onChange={(v) => set('hasEnd', v)}
            label="Has an end date"
            description="For loans or contracts that finish."
          />
          <AnimatePresence initial={false}>
            {draft.hasEnd && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div className="pt-1 pb-3">
                  <Field id={ids.end} label="Last due date" error={show('endDate')}>
                    <input
                      id={ids.end}
                      data-field="endDate"
                      type="date"
                      className="field"
                      min={draft.startDate}
                      value={draft.endDate}
                      onChange={(e) => set('endDate', e.target.value)}
                      onBlur={blur('endDate')}
                      aria-invalid={!!show('endDate')}
                      aria-describedby={show('endDate') ? `${ids.end}-err` : undefined}
                    />
                  </Field>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <div className="border-b border-rule">
        <Switch
          checked={draft.autopay}
          onChange={(v) => set('autopay', v)}
          label="Autopay"
          description="Marked paid automatically on each due date."
        />
      </div>

      <Field id={ids.notes} label="Notes (optional)">
        <textarea
          id={ids.notes}
          className="field min-h-20 resize-y"
          value={draft.notes}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="Account number hint, payment website, reminders…"
          maxLength={500}
          rows={2}
        />
      </Field>

      <AnimatePresence>
        {preview && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="border-l-2 border-ink bg-bg-2 px-4 py-3 font-serif text-[15px] text-ink-2 italic"
          >
            <span>
              {preview.next ? (
                <>
                  Next due <span className="text-ink not-italic">{fmtDate(preview.next, 'EEEE, d MMMM yyyy')}</span>
                </>
              ) : (
                'No due dates ahead'
              )}
              {draft.frequency !== 'once' && (
                <>
                  {' — '}about <span className="fig text-ink not-italic">{money(preview.monthly)}</span> a month
                </>
              )}
            </span>
          </motion.p>
        )}
      </AnimatePresence>
    </form>
  )
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      {children}
      <AnimatePresence initial={false}>
        {error && (
          <motion.p
            id={`${id}-err`}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="mt-1.5 text-[13px] font-medium text-verm"
            role="alert"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
