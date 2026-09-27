import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState, type ReactNode } from 'react'
import { CategoryBars } from '../components/charts/CategoryBars'
import { SplitBar } from '../components/charts/SplitBar'
import { TrendBars } from '../components/charts/TrendBars'
import { LedgerRow } from '../components/LedgerRow'
import { EmptyState } from '../components/ui/EmptyState'
import { Engraving } from '../components/ui/Engraving'
import { Figure } from '../components/ui/Figure'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { useMoney } from '../hooks/useMoney'
import { category } from '../lib/categories'
import { cx } from '../lib/cx'
import { fmtDate } from '../lib/dates'
import { EASE_OUT } from '../lib/motion'
import { agenda, monthlyTrend, occurrencesInMonth, summarize, type Agenda, type Summary } from '../lib/engine'
import type { Occurrence } from '../lib/types'
import { useStore } from '../state/store'
import { useUI } from '../state/ui'

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']
const word = (n: number) => (n < WORDS.length ? WORDS[n] : String(n))
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function whenPhrase(o: Occurrence) {
  if (o.daysUntil === 0) return 'today'
  if (o.daysUntil === 1) return 'tomorrow'
  if (o.daysUntil < 7) return `on ${fmtDate(o.dueDate, 'EEEE')}`
  return `on ${fmtDate(o.dueDate, 'd MMMM')}`
}

/** The italic deck under the headline: the month summarised in one sentence. */
function deck(summary: Summary, ag: Agenda): ReactNode {
  if (!summary.count) return 'Nothing falls due this month.'
  const settled =
    summary.paidCount === summary.count
      ? 'Every bill this month is settled.'
      : `${cap(word(summary.paidCount))} of ${word(summary.count)} bills are settled.`
  const lateN = ag.overdue.length
  const next = ag.soon[0] ?? ag.later[0]
  return (
    <>
      {settled}{' '}
      {lateN > 0 && (
        <span className="text-verm">
          {cap(word(lateN))} {lateN === 1 ? 'is' : 'are'} late{next ? ';' : '.'}{' '}
        </span>
      )}
      {next && `${lateN > 0 ? 'the' : 'The'} next is ${next.bill.name}, ${whenPhrase(next)}.`}
    </>
  )
}

export function Dashboard() {
  const { data } = useStore()
  const { today, month, setMonth } = useUI()
  const { money } = useMoney()
  const wide = useMediaQuery('(min-width: 768px)')

  const occs = useMemo(() => occurrencesInMonth(data, month, today), [data, month, today])
  const summary = useMemo(() => summarize(occs), [occs])
  const ag = useMemo(() => agenda(data, today), [data, today])
  const trend = useMemo(() => monthlyTrend(data, month, today, wide ? 6 : 5), [data, month, today, wide])

  const soonTotal = ag.soon.reduce((s, o) => s + o.amount, 0)
  const lateTotal = ag.overdue.reduce((s, o) => s + o.amount, 0)
  const pct = summary.total > 0 ? summary.paid / summary.total : 0
  const monthName = fmtDate(month, 'MMMM')
  const ym = month.slice(0, 7)
  const tense = ym < today.slice(0, 7) ? 'You owed' : ym > today.slice(0, 7) ? "You'll owe" : 'You owe'
  const settled = occs
    .filter((o) => o.status === 'paid')
    .sort((a, b) => (b.payment?.paidOn ?? '').localeCompare(a.payment?.paidOn ?? ''))
  const top = [...summary.byCategory].sort((a, b) => b.amount - a.amount)[0]
  const topShare = top && summary.total > 0 ? top.amount / summary.total : 0

  return (
    <>
      {/* ---------- Hero ---------- */}
      <section
        className="grid gap-8 border-b border-rule-strong pt-6 pb-7 lg:grid-cols-[1.55fr_1fr] lg:gap-12 lg:pt-9 lg:pb-8"
        aria-label={`${monthName} in brief`}
      >
        <div className="min-w-0">
          <p className="sc">
            No. {fmtDate(month, 'MM')} — {fmtDate(today, 'EEEE, d MMMM yyyy')}
          </p>
          <h1 className="mt-3 font-serif text-[2.6rem] leading-[1.02] font-[350] tracking-[-0.03em] text-ink sm:text-[3.4rem] lg:text-[3.85rem]">
            {tense} <Figure value={summary.total} format={money} className="font-[500]" />{' '}
            <em className="font-[300]">in {monthName}.</em>
          </h1>
          <p className="mt-4 max-w-[38rem] font-serif text-[1.1875rem] leading-[1.45] font-[350] text-ink-2 italic sm:text-[1.3125rem]">
            {deck(summary, ag)}
          </p>
        </div>

        <div className="lg:border-l lg:border-rule lg:pl-9">
          <p className="sc">The month in figures</p>
          <dl className="mt-1">
            <Line label="Settled" value={<Figure value={summary.paid} format={money} />} />
            <Line label="Outstanding" value={<Figure value={summary.unpaid} format={money} />} />
            <Line label={`Due within ${data.settings.dueSoonDays} days`} value={<Figure value={soonTotal} format={money} />} />
            {lateTotal > 0 && <Line late label="Late" value={<Figure value={lateTotal} format={money} />} />}
          </dl>
          <div className="mt-5">
            <SplitBar value={pct} label={`${Math.round(pct * 100)}% of ${monthName} settled`} />
          </div>
        </div>
      </section>

      {/* ---------- Columns ---------- */}
      <div className="grid md:grid-cols-2 lg:grid-cols-[1.35fr_1fr_0.95fr]">
        <section className="pt-6 pb-8 md:col-span-2 lg:col-span-1 lg:pr-8" aria-labelledby="due-h">
          <ColumnHead id="due-h" title="Coming due" note={`${ag.overdue.length + ag.soon.length + ag.later.length} entries`} />
          <ComingDue ag={ag} soonDays={data.settings.dueSoonDays} settled={settled} monthName={monthName} />
        </section>

        <section className="border-t border-rule pt-6 pb-8 md:pr-8 lg:border-t-0 lg:border-l lg:px-8" aria-labelledby="where-h">
          <ColumnHead id="where-h" title="Where it goes" />
          {summary.byCategory.length ? (
            <>
              <CategoryBars
                slices={summary.byCategory}
                total={summary.total}
                onSelect={(id) => (window.location.hash = `#/bills?cat=${id}`)}
              />
              {top && (
                <p className="mt-4 font-serif text-[15px] text-ink-2 italic">
                  {category(top.id).label} {topShare > 0.5 ? 'is more than half' : `is ${Math.round(topShare * 100)}%`} of the month.
                </p>
              )}
            </>
          ) : (
            <EmptyState title="Nothing due this month" className="py-6" />
          )}
        </section>

        <section className="border-t border-rule pt-6 pb-8 md:border-l md:pl-8 lg:border-t-0" aria-labelledby="trend-h">
          <ColumnHead id="trend-h" title={`${trend.length} months`} note="Select one to view it" />
          <TrendBars points={trend} selected={month} onSelect={setMonth} />
          <figure className="mt-6 hidden lg:block">
            <Engraving kind="letters" className="mx-auto w-full max-w-[17rem]" />
            <figcaption className="mt-1 text-center font-serif text-[13px] text-muted italic">
              Fig. 1 — The month, {pct >= 1 ? 'settled' : pct >= 0.75 ? 'nearly settled' : 'in progress'}.
            </figcaption>
          </figure>
        </section>
      </div>
    </>
  )
}

function Line({ label, value, late }: { label: string; value: ReactNode; late?: boolean }) {
  return (
    <div className={cx('flex items-baseline border-b border-dotted border-rule-strong py-2.5', late && 'text-verm')}>
      <dt className={cx('text-[15px]', late ? 'text-verm' : 'text-ink-2')}>{label}</dt>
      <dd className="ml-auto text-[1.5rem] leading-none">{value}</dd>
    </div>
  )
}

function ColumnHead({ id, title, note }: { id: string; title: string; note?: string }) {
  return (
    <div className="mb-2 flex items-baseline gap-3">
      <h2 id={id} className="font-serif text-[1.375rem] font-[450] tracking-[-0.01em] text-ink">
        {title}
      </h2>
      {note && <span className="sc">{note}</span>}
    </div>
  )
}

const LATER_PREVIEW = 4

function ComingDue({ ag, soonDays, settled, monthName }: { ag: Agenda; soonDays: number; settled: Occurrence[]; monthName: string }) {
  const [allLater, setAllLater] = useState(false)
  const [showSettled, setShowSettled] = useState(false)
  const later = allLater ? ag.later : ag.later.slice(0, LATER_PREVIEW)
  const nothing = !ag.overdue.length && !ag.soon.length && !ag.later.length

  return (
    <div className="space-y-5">
      {nothing ? (
        <EmptyState art="inkwell" title="All settled">
          Nothing falls due in the next thirty days.
        </EmptyState>
      ) : (
        <AnimatePresence initial={false}>
          {ag.overdue.length > 0 && <Group key="late" title="Late" tone="late" items={ag.overdue} />}
          <Group key="soon" title={`Within ${soonDays} days`} items={ag.soon} empty="Nothing falls due this week." />
          {ag.later.length > 0 && (
            <Group key="later" title="Later" items={later}>
              {ag.later.length > LATER_PREVIEW && (
                <button
                  type="button"
                  onClick={() => setAllLater((v) => !v)}
                  className="sc mt-1 min-h-11 !text-ink underline-offset-4 hover:underline"
                >
                  {allLater ? 'Show fewer' : `Show ${ag.later.length - LATER_PREVIEW} more`}
                </button>
              )}
            </Group>
          )}
        </AnimatePresence>
      )}
      {settled.length > 0 && (
        <div>
          <button
            type="button"
            aria-expanded={showSettled}
            onClick={() => setShowSettled((v) => !v)}
            className="sc flex min-h-11 w-full items-center border-b border-rule-strong !text-olive"
          >
            Settled in {monthName} · {settled.length}
            <span className="ml-auto !text-ink-2">{showSettled ? 'Hide' : 'Show'}</span>
          </button>
          {showSettled && (
            <ul>
              <AnimatePresence initial={false}>
                {settled.map((o) => (
                  <LedgerRow key={o.key} occurrence={o} />
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function Group({
  title,
  items,
  tone,
  empty,
  children,
}: {
  title: string
  items: Occurrence[]
  tone?: 'late'
  empty?: string
  children?: ReactNode
}) {
  return (
    // A group that empties waits for its last row's stroke, then folds away like a row.
    <motion.div className="overflow-hidden" exit={{ opacity: 0, height: 0, transition: { delay: 0.45, duration: 0.3, ease: EASE_OUT } }}>
      <p className={cx('sc border-b border-rule-strong pb-1.5', tone === 'late' && '!text-verm')}>{title}</p>
      <ul>
        {/* Sync mode: a settled row keeps its place while its stroke draws, then the list closes up.
            `propagate` lets rows play that exit even when the whole group is leaving. */}
        <AnimatePresence initial={false} propagate>
          {items.map((o) => (
            <LedgerRow key={o.key} occurrence={o} strikeOnExit />
          ))}
        </AnimatePresence>
      </ul>
      {!items.length && empty && <p className="py-3 font-serif text-[15px] text-muted italic">{empty}</p>}
      {children}
    </motion.div>
  )
}
