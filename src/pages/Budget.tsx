import { Plus } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { BudgetEditor, type BudgetEditing } from '../components/BudgetEditor'
import { BudgetBar } from '../components/charts/BudgetBar'
import { CategoryBars } from '../components/charts/CategoryBars'
import { ColumnHead, FigureLine } from '../components/layout/Columns'
import { Button } from '../components/ui/Button'
import { Figure } from '../components/ui/Figure'
import { useMoney } from '../hooks/useMoney'
import { billShape, budgetForMonth, budgetOutlook, type BillShape, type MonthBudget } from '../lib/budget'
import { cx } from '../lib/cx'
import { fmtDate, frequencyMeta, monthStart } from '../lib/dates'
import type { IncomeSource, SetAside } from '../lib/types'
import { useStore } from '../state/store'
import { useUI } from '../state/ui'

const SUGGESTED = ['Groceries', 'Fuel', 'Savings', 'Eating out']
const OUTLOOK_MONTHS = 6

const share = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0)

/** "10 Oct and 24 Oct", "3, 17 and 31 Oct" */
function listDays(dates: string[]) {
  if (!dates.length) return ''
  const days = dates.map((d) => fmtDate(d, 'd'))
  const joined = days.length < 3 ? days.join(' and ') : `${days.slice(0, -1).join(', ')} and ${days[days.length - 1]}`
  return `${joined} ${fmtDate(dates[0], 'MMM')}`
}

const PAYDAY_WORDS = ['no', 'one', 'two', 'three', 'four', 'five']

export function Budget() {
  const { data } = useStore()
  const { today, month, setMonth } = useUI()
  const { money } = useMoney()
  const [editing, setEditing] = useState<BudgetEditing>({ kind: 'income', item: null })
  const [editorOpen, setEditorOpen] = useState(false)

  const b = useMemo(() => budgetForMonth(data, month, today), [data, month, today])
  const shape = useMemo(() => billShape(data, month), [data, month])
  const outlook = useMemo(() => budgetOutlook(data, monthStart(today), today, OUTLOOK_MONTHS), [data, today])

  const edit = (next: BudgetEditing) => {
    setEditing(next)
    setEditorOpen(true)
  }

  const monthName = fmtDate(month, 'MMMM')
  const ym = month.slice(0, 7)
  const tense = ym < today.slice(0, 7) ? 'past' : ym > today.slice(0, 7) ? 'future' : 'present'
  const hasIncome = b.income > 0
  const short = b.left < 0

  return (
    <>
      {/* ---------- Hero ---------- */}
      <section
        className="grid gap-8 border-b border-rule-strong pt-6 pb-7 lg:grid-cols-[1.55fr_1fr] lg:gap-12 lg:pt-9 lg:pb-8"
        aria-label={`${monthName} budget`}
      >
        <div className="min-w-0">
          <p className="sc">The budget — {fmtDate(month, 'MMMM yyyy')}</p>
          <h1 className="mt-3 font-serif text-[2.6rem] leading-[1.02] font-[350] tracking-[-0.03em] text-ink sm:text-[3.4rem] lg:text-[3.85rem]">
            {hasIncome ? (
              <>
                <Figure value={Math.abs(b.left)} format={money} className={cx('font-[500]', short && 'text-verm')} />{' '}
                <em className="font-[300]">
                  {short ? 'short' : 'left'} in {monthName}.
                </em>
              </>
            ) : b.bills <= 0 ? (
              <>
                Plan <em className="font-[300]">{monthName}.</em>
              </>
            ) : (
              <>
                Bills take <Figure value={b.bills} format={money} className="font-[500]" />{' '}
                <em className="font-[300]">in {monthName}.</em>
              </>
            )}
          </h1>
          <p className="mt-4 max-w-[38rem] font-serif text-[1.1875rem] leading-[1.45] font-[350] text-ink-2 italic sm:text-[1.3125rem]">
            {deck(b, tense, money)}
          </p>
          {!hasIncome && (
            <Button variant="primary" size="lg" className="mt-6" onClick={() => edit({ kind: 'income', item: null })}>
              <Plus aria-hidden className="size-4" />
              Add your income
            </Button>
          )}
        </div>

        <div className="lg:border-l lg:border-rule lg:pl-9">
          <p className="sc">The month in figures</p>
          <dl className="mt-1">
            <FigureLine label="Coming in" value={<Figure value={b.income} format={money} />} />
            <FigureLine label="Bills" value={<Figure value={b.bills} format={money} />} />
            <FigureLine label="Set aside" value={<Figure value={b.setAside} format={money} />} />
            {hasIncome && (
              <FigureLine
                strong
                late={short}
                label={short ? 'Short' : 'Left over'}
                value={<Figure value={Math.abs(b.left)} format={money} className={short ? 'text-verm' : 'text-olive'} />}
              />
            )}
          </dl>
          {hasIncome && (
            <div className="mt-5">
              <BudgetBar
                income={b.income}
                bills={b.bills}
                setAside={b.setAside}
                label={`Of ${money(b.income)} coming in: bills ${money(b.bills)}, set aside ${money(b.setAside)}, ${short ? `short by ${money(-b.left)}` : `${money(b.left)} left over`}.`}
              />
            </div>
          )}
        </div>
      </section>

      {/* ---------- Columns ---------- */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3">
        <section className="pt-6 pb-8 md:pr-8" aria-labelledby="in-h">
          <ColumnHead id="in-h" title="Coming in" note={b.paydays.length ? `${b.paydays.length} ${b.paydays.length === 1 ? 'payday' : 'paydays'}` : undefined} />
          <IncomeList
            budget={b}
            sources={data.income}
            monthName={monthName}
            onEdit={(item) => edit({ kind: 'income', item })}
            onAdd={() => edit({ kind: 'income', item: null })}
          />
        </section>

        <section className="border-t border-rule pt-6 pb-8 md:border-t-0 md:border-l md:pl-8 lg:px-8" aria-labelledby="set-h">
          <ColumnHead id="set-h" title="Set aside" note="Each month" />
          <SetAsideList
            items={data.setAsides}
            income={b.income}
            onEdit={(item) => edit({ kind: 'setAside', item })}
            onAdd={(name) => edit({ kind: 'setAside', item: null, name })}
          />
        </section>

        <section className="border-t border-rule pt-6 pb-8 md:col-span-2 lg:col-span-1 lg:border-t-0 lg:border-l lg:pl-8" aria-labelledby="bills-h">
          <ColumnHead id="bills-h" title="Bills" note={hasIncome ? `${share(b.bills, b.income)}% of income` : undefined} />
          {b.summary.byCategory.length ? (
            <>
              <CategoryBars
                slices={b.summary.byCategory}
                total={hasIncome ? b.income : b.bills}
                shareOf={hasIncome ? 'what comes in' : 'the month'}
                onSelect={(id) => (window.location.hash = `#/bills?cat=${id}`)}
              />
              <BillNotes budget={b} typical={shape.typical} irregular={shape.irregular} irregularPerMonth={shape.irregularPerMonth} monthName={monthName} />
            </>
          ) : (
            <p className="py-3 font-serif text-[15px] text-muted italic">
              {data.bills.length ? `No bills fall due in ${monthName}.` : 'No bills entered yet. Bills you enter are budgeted here automatically.'}
            </p>
          )}
        </section>
      </div>

      {/* ---------- The months ahead ---------- */}
      {data.income.length > 0 && (
        <section className="border-t border-rule-strong pt-6 pb-10" aria-labelledby="ahead-h">
          <ColumnHead id="ahead-h" title="The months ahead" note={<span className="hidden sm:inline">Select one to plan it</span>} />
          <Outlook months={outlook} selected={month} today={today} onSelect={setMonth} />
        </section>
      )}

      <BudgetEditor editing={editing} open={editorOpen} onClose={() => setEditorOpen(false)} />
    </>
  )
}

/** The italic deck under the headline: the month's money in one or two sentences. */
function deck(b: MonthBudget, tense: 'past' | 'present' | 'future', money: (n: number) => string): ReactNode {
  if (b.income <= 0) {
    return 'Add what comes in each month and Billwise shows what’s left once the bills are paid, before you plan the rest.'
  }
  const bring = tense === 'past' ? 'You brought in' : tense === 'future' ? 'You’ll bring in' : 'You bring in'
  // A biweekly paycheck lands three times in two months a year; weekly, five times in four.
  const extra = b.paydays.length
    ? Object.values(
        b.paydays.reduce<Record<string, { n: number; f: string }>>((acc, p) => {
          acc[p.source.id] = { n: (acc[p.source.id]?.n ?? 0) + 1, f: p.source.frequency }
          return acc
        }, {}),
      ).find((x) => (x.f === 'biweekly' && x.n === 3) || (x.f === 'weekly' && x.n === 5))
    : undefined
  const bonus = extra ? `, with ${PAYDAY_WORDS[extra.n]} paydays` : ''
  const bills = `Bills take ${share(b.bills, b.income)}% of it`
  const rest =
    b.setAside > 0
      ? `, and ${money(b.setAside)} is set aside for everything else.`
      : '. Set money aside below for groceries, savings and the rest.'
  const fix = b.left < 0 ? ' Trim a set-aside, or skip a bill this month, to bring it level.' : ''
  return `${bring} ${money(b.income)}${bonus}. ${bills}${rest}${fix}`
}

function Row({ onClick, label, title, sub, amount, muted }: { onClick: () => void; label: string; title: string; sub?: ReactNode; amount: ReactNode; muted?: boolean }) {
  return (
    <li className="border-b border-rule">
      <button type="button" onClick={onClick} aria-label={label} className="group flex min-h-[3.75rem] w-full items-center gap-3 py-2 text-left transition-colors hover:bg-bg-2">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium text-ink group-hover:underline group-hover:underline-offset-4">{title}</span>
          {sub && <span className="mt-0.5 block truncate text-[13px] text-muted">{sub}</span>}
        </span>
        <span className={cx('fig text-[1.125rem]', muted ? 'text-muted' : 'text-ink')}>{amount}</span>
      </button>
    </li>
  )
}

function TotalLine({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline border-t-[1.5px] border-ink py-2.5">
      <span className="sc !text-ink">{label}</span>
      <span className="fig ml-auto text-[1.125rem] text-ink">{value}</span>
    </div>
  )
}

function IncomeList({
  budget,
  sources,
  monthName,
  onEdit,
  onAdd,
}: {
  budget: MonthBudget
  sources: IncomeSource[]
  monthName: string
  onEdit: (s: IncomeSource) => void
  onAdd: () => void
}) {
  const { money } = useMoney()
  return (
    <>
      {sources.length ? (
        <>
          <ul>
            {sources.map((s) => {
              const days = budget.paydays.filter((p) => p.source.id === s.id).map((p) => p.date)
              const total = days.length * s.amount
              const freq = frequencyMeta(s.frequency).label
              return (
                <Row
                  key={s.id}
                  onClick={() => onEdit(s)}
                  label={`Amend ${s.name}: ${money(total)} in ${monthName}`}
                  title={s.name}
                  sub={days.length ? `${s.frequency === 'once' ? 'One time' : freq} · ${listDays(days)}` : `${freq} · none in ${monthName}`}
                  amount={money(total)}
                  muted={!days.length}
                />
              )
            })}
          </ul>
          <TotalLine label={`In ${monthName}`} value={money(budget.income)} />
        </>
      ) : (
        <p className="py-3 font-serif text-[15px] text-muted italic">Nothing entered yet: add a paycheck, a pension or side work.</p>
      )}
      <Button size="sm" className="mt-3" onClick={onAdd}>
        <Plus aria-hidden className="size-3.5" />
        Add income
      </Button>
    </>
  )
}

function SetAsideList({
  items,
  income,
  onEdit,
  onAdd,
}: {
  items: SetAside[]
  income: number
  onEdit: (s: SetAside) => void
  onAdd: (name?: string) => void
}) {
  const { money } = useMoney()
  const total = items.reduce((s, x) => s + x.amount, 0)
  const unused = SUGGESTED.filter((name) => !items.some((x) => x.name.toLowerCase() === name.toLowerCase()))
  return (
    <>
      {items.length ? (
        <>
          <ul>
            {items.map((s) => (
              <Row
                key={s.id}
                onClick={() => onEdit(s)}
                label={`Amend ${s.name}: ${money(s.amount)} a month`}
                title={s.name}
                sub={income > 0 ? `${share(s.amount, income)}% of income` : undefined}
                amount={money(s.amount)}
              />
            ))}
          </ul>
          <TotalLine label="Total" value={money(total)} />
        </>
      ) : (
        <p className="py-3 font-serif text-[15px] text-muted italic">Plan the money that isn’t bills: what you spend day to day, and what you save.</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Button size="sm" onClick={() => onAdd()}>
          <Plus aria-hidden className="size-3.5" />
          Set money aside
        </Button>
        {items.length < 3 &&
          unused.slice(0, 3).map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => onAdd(name)}
              aria-label={`Set money aside for ${name}`}
              className="min-h-9 rounded-[3px] border border-dashed border-rule-strong px-2.5 text-[13px] text-ink-2 transition-colors hover:border-ink hover:text-ink"
            >
              {name}
            </button>
          ))}
      </div>
    </>
  )
}

function BillNotes({
  budget: b,
  typical,
  irregular,
  irregularPerMonth,
  monthName,
}: {
  budget: MonthBudget
  typical: number
  irregular: BillShape['irregular']
  irregularPerMonth: number
  monthName: string
}) {
  const { money } = useMoney()
  const diff = b.bills - typical
  // Irregular bills that actually fall due this month explain a heavy one.
  const due = new Set(b.occurrences.filter((o) => o.status !== 'skipped').map((o) => o.bill.id))
  const dueNow = irregular.filter((x) => due.has(x.bill.id)).map((x) => x.bill.name)
  return (
    <div className="mt-4 space-y-2 font-serif text-[15px] text-ink-2 italic">
      {typical > 0 && Math.abs(diff) >= 1 && (
        <p>
          {diff > 0 ? (
            <>
              {monthName} runs <span className="fig text-ink not-italic">{money(diff)}</span> above a typical month
              {dueNow.length ? `: ${joinNames(dueNow)} ${dueNow.length === 1 ? 'falls' : 'fall'} due.` : '.'}
            </>
          ) : (
            <>
              {monthName} is <span className="fig text-ink not-italic">{money(-diff)}</span> lighter than a typical month.
            </>
          )}
        </p>
      )}
      {irregularPerMonth >= 1 && (
        <p>
          Bills that come round less than monthly average <span className="fig text-ink not-italic">{money(irregularPerMonth)}</span> a month. Put that by
          each month and the heavy months take care of themselves.
        </p>
      )}
      {b.summary.skippedCount > 0 && <p className="text-muted">Skipped bills aren’t counted.</p>}
    </div>
  )
}

function joinNames(names: string[]) {
  return names.length < 3 ? names.join(' and ') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

function Outlook({ months, selected, today, onSelect }: { months: MonthBudget[]; selected: string; today: string; onSelect: (m: string) => void }) {
  const { money } = useMoney()
  const year = today.slice(0, 4)
  return (
    <>
      <div className="sc hidden grid-cols-[minmax(0,1fr)_repeat(4,7.25rem)] gap-4 border-b lg:grid-cols-[minmax(0,1fr)_repeat(4,9rem)] border-rule-strong pb-1.5 md:grid" aria-hidden>
        <span>Month</span>
        <span className="text-right">Coming in</span>
        <span className="text-right">Bills</span>
        <span className="text-right">Set aside</span>
        <span className="text-right">Left over</span>
      </div>
      <ul>
        {months.map((m) => {
          const active = m.month === selected
          const short = m.left < 0
          const name = fmtDate(m.month, m.month.slice(0, 4) === year ? 'MMMM' : 'MMMM yyyy')
          const leftText = short ? `${money(-m.left)} short` : money(m.left)
          return (
            <li key={m.month} className="border-b border-rule">
              <button
                type="button"
                onClick={() => {
                  onSelect(m.month)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                aria-current={active ? 'true' : undefined}
                aria-label={`${name}: ${money(m.income)} coming in, bills ${money(m.bills)}, set aside ${money(m.setAside)}, ${short ? `short by ${money(-m.left)}` : `${money(m.left)} left over`}. Plan this month.`}
                className={cx('group block w-full py-3 text-left transition-colors hover:bg-bg-2', active && 'bg-bg-2')}
              >
                <span className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 md:grid-cols-[minmax(0,1fr)_repeat(4,7.25rem)] lg:grid-cols-[minmax(0,1fr)_repeat(4,9rem)]">
                  <span className="min-w-0">
                    <span className={cx('block font-serif text-[1.1875rem] text-ink group-hover:underline group-hover:underline-offset-4', active && 'font-[500]')}>
                      {name}
                    </span>
                    <span className="mt-0.5 block text-[13px] text-muted md:hidden">
                      In {money(m.income)} · Bills {money(m.bills)}
                    </span>
                    <span className="mt-0.5 hidden text-[13px] text-muted md:block">
                      {m.paydays.length} {m.paydays.length === 1 ? 'payday' : 'paydays'}
                    </span>
                  </span>
                  <span className="fig hidden text-right text-[1.0625rem] text-ink md:block">{money(m.income)}</span>
                  <span className="fig hidden text-right text-[1.0625rem] text-ink md:block">{money(m.bills)}</span>
                  <span className="fig hidden text-right text-[1.0625rem] text-ink md:block">{money(m.setAside)}</span>
                  <span className={cx('fig text-right text-[1.125rem]', short ? 'text-verm' : 'text-olive')}>{leftText}</span>
                </span>
                <span className="mt-2.5 block">
                  <BudgetBar compact income={m.income} bills={m.bills} setAside={m.setAside} label="" />
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </>
  )
}
