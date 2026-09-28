import { AnimatePresence, motion } from 'motion/react'
import { eachDayOfInterval, endOfMonth, endOfWeek, startOfMonth, startOfWeek } from 'date-fns'
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { PageHeader } from '../components/layout/PageHeader'
import { LedgerRow } from '../components/LedgerRow'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { useMoney } from '../hooks/useMoney'
import { cx } from '../lib/cx'
import { addDaysISO, fmtDate, fromISO, monthStart, toISO } from '../lib/dates'
import { occurrencesBetween, summarize } from '../lib/engine'
import { pluralize } from '../lib/format'
import { EASE_OUT } from '../lib/motion'
import type { Occurrence } from '../lib/types'
import { useStore } from '../state/store'
import { useUI } from '../state/ui'

/** Entry styling in the grid: late in vermilion, settled struck through, the rest in ink. */
const entryTone = (o: Occurrence) =>
  o.status === 'overdue'
    ? 'text-verm'
    : o.status === 'paid'
      ? 'text-muted line-through decoration-muted'
      : o.status === 'skipped'
        ? 'text-muted italic'
        : 'text-ink'

const markTone = (o: Occurrence) =>
  o.status === 'overdue' ? 'bg-verm' : o.status === 'paid' ? 'bg-olive' : o.status === 'skipped' ? 'bg-control' : 'bg-ink'

/** Skipped entries still show on their day, but aren't part of what's owed. */
const counted = (l: Occurrence[]) => l.filter((o) => o.status !== 'skipped')

export function Calendar() {
  const { data } = useStore()
  const { today, month, setMonth, openEditor } = useUI()
  const { money, compact } = useMoney()

  const days = useMemo(() => {
    const m = fromISO(month)
    return eachDayOfInterval({ start: startOfWeek(startOfMonth(m)), end: endOfWeek(endOfMonth(m)) }).map(toISO)
  }, [month])

  const byDay = useMemo(() => {
    const map = new Map<string, Occurrence[]>()
    for (const o of occurrencesBetween(data, days[0], days[days.length - 1], today)) {
      const list = map.get(o.dueDate) ?? []
      list.push(o)
      map.set(o.dueDate, list)
    }
    return map
  }, [data, days, today])

  const inMonth = (d: string) => d.slice(0, 7) === month.slice(0, 7)
  const defaultSelection = () => (inMonth(today) ? today : month)
  const [selected, setSelected] = useState(defaultSelection)
  const [focusReq, setFocusReq] = useState<string | null>(null)
  const grid = useRef<HTMLDivElement>(null)

  // Keep the selection inside the visible month.
  useEffect(() => {
    if (!inMonth(selected)) setSelected(defaultSelection())
  }, [month])

  useEffect(() => {
    if (!focusReq) return
    grid.current?.querySelector<HTMLButtonElement>(`[data-date="${focusReq}"]`)?.focus()
    setFocusReq(null)
  }, [focusReq, days])

  const moveTo = (d: string) => {
    if (!inMonth(d)) setMonth(monthStart(d))
    setSelected(d)
    setFocusReq(d)
  }

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
    if (e.key in step) {
      e.preventDefault()
      moveTo(addDaysISO(selected, step[e.key]))
    } else if (e.key === 'Home') {
      e.preventDefault()
      moveTo(month)
    }
  }

  const monthOccs = useMemo(() => [...byDay.entries()].filter(([d]) => inMonth(d)).flatMap(([, l]) => l), [byDay, month])
  const summary = summarize(monthOccs)
  const dayOccs = byDay.get(selected) ?? []
  const dayTotal = counted(dayOccs).reduce((s, o) => s + o.amount, 0)
  const weekdays = days.slice(0, 7)

  return (
    <>
      <PageHeader
        eyebrow={`${pluralize(summary.count, 'entry', 'entries')} · ${money(summary.total)}`}
        title={
          <>
            {fmtDate(month, 'MMMM')} <em className="font-[300]">at a glance</em>
          </>
        }
      />

      <div className="grid grid-cols-1 items-start gap-8 pt-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-10">
        <section aria-label={`${fmtDate(month, 'MMMM yyyy')} calendar`}>
          <div className="grid grid-cols-7 border-b border-ink pb-2" aria-hidden>
            {weekdays.map((d) => (
              <span key={d} className="sc text-center">
                <span className="sm:hidden">{fmtDate(d, 'EEEEE')}</span>
                <span className="hidden sm:inline">{fmtDate(d, 'EEE')}</span>
              </span>
            ))}
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={month}
              ref={grid}
              role="group"
              aria-label="Days"
              onKeyDown={onKey}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              transition={{ duration: 0.25, ease: EASE_OUT }}
              className="grid grid-cols-7"
            >
              {days.map((d) => {
                const list = byDay.get(d) ?? []
                const outside = !inMonth(d)
                const isToday = d === today
                const isSel = d === selected
                const total = counted(list).reduce((s, o) => s + o.amount, 0)
                const late = list.filter((o) => o.status === 'overdue').length
                const skippedN = list.length - counted(list).length
                const label =
                  fmtDate(d, 'EEEE, MMMM d') +
                  (list.length
                    ? `: ${pluralize(list.length, 'bill')}, ${money(total)}${late ? `, ${late} late` : ''}${skippedN ? `, ${skippedN} skipped` : ''}`
                    : ': no bills')
                return (
                  <div key={d} className="border-b border-rule">
                    <button
                      type="button"
                      data-date={d}
                      tabIndex={isSel ? 0 : -1}
                      aria-label={label}
                      aria-current={isToday ? 'date' : undefined}
                      aria-pressed={isSel}
                      onClick={() => (outside ? moveTo(d) : setSelected(d))}
                      className={cx(
                        'relative flex aspect-square w-full flex-col items-center p-1 text-left transition-colors sm:aspect-auto sm:h-24 sm:items-stretch sm:p-2',
                        isSel ? 'bg-bg-2 shadow-[inset_0_0_0_1.5px_var(--ink)]' : 'hover:bg-bg-2',
                      )}
                    >
                      <span
                        className={cx(
                          'fig grid size-7 place-items-center rounded-full text-[15px]',
                          isToday ? 'bg-ink text-on-ink' : outside ? 'text-muted' : 'text-ink',
                        )}
                      >
                        {fmtDate(d, 'd')}
                      </span>
                      {list.length > 0 && (
                        <>
                          {/* Phones: short tally marks */}
                          <span className={cx('mt-auto mb-1 flex gap-[3px] sm:hidden', outside && 'opacity-50')} aria-hidden>
                            {list.slice(0, 3).map((o) => (
                              <span key={o.key} className={cx('h-2.5 w-[3px]', markTone(o))} />
                            ))}
                          </span>
                          {/* Larger screens: the entries themselves */}
                          <span className={cx('mt-1 hidden min-w-0 flex-col gap-0.5 sm:flex', outside && 'opacity-60')} aria-hidden>
                            {list.slice(0, 2).map((o) => (
                              <span key={o.key} className={cx('truncate text-[11.5px] leading-tight', entryTone(o))}>
                                {o.bill.name}
                              </span>
                            ))}
                            {list.length > 2 && <span className="text-[11px] text-muted">+{list.length - 2} more</span>}
                          </span>
                          <span className="fig mt-auto hidden text-right text-[12px] text-ink-2 xl:block" aria-hidden>
                            {compact(total)}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                )
              })}
            </motion.div>
          </AnimatePresence>

          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-ink-2" aria-label="Key">
            <li className="inline-flex items-center gap-1.5">
              <span aria-hidden className="h-2.5 w-[3px] bg-ink" /> Due
            </li>
            <li className="inline-flex items-center gap-1.5 text-verm">
              <span aria-hidden className="h-2.5 w-[3px] bg-verm" /> Late
            </li>
            <li className="inline-flex items-center gap-1.5">
              <span aria-hidden className="h-2.5 w-[3px] bg-olive" /> <span className="line-through">Settled</span>
            </li>
            <li className="inline-flex items-center gap-1.5 text-muted">
              <span aria-hidden className="h-2.5 w-[3px] bg-control" /> <span className="italic">Skipped</span>
            </li>
            <li className="ml-auto hidden text-muted sm:block">Arrow keys move between days</li>
          </ul>
        </section>

        <section className="lg:sticky lg:top-6" aria-live="polite" aria-labelledby="day-h">
          <div className="flex items-baseline justify-between gap-3 border-b border-ink pb-2">
            <h2 id="day-h" className="font-serif text-[1.375rem] text-ink">
              {selected === today ? 'Today' : fmtDate(selected, 'EEEE')}
              <span className="ml-2 font-serif text-[15px] text-muted italic">{fmtDate(selected, 'd MMMM')}</span>
            </h2>
            {dayOccs.length > 0 && <span className="fig text-[1.125rem] text-ink">{money(dayTotal)}</span>}
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={selected}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.08 } }}
              transition={{ duration: 0.18 }}
            >
              {dayOccs.length ? (
                <ul>
                  <AnimatePresence initial={false}>
                    {dayOccs.map((o) => (
                      <LedgerRow key={o.key} occurrence={o} showDate={false} />
                    ))}
                  </AnimatePresence>
                </ul>
              ) : (
                <EmptyState
                  title="No entries this day"
                  className="py-8"
                  action={
                    <Button size="sm" onClick={() => openEditor(null)}>
                      Enter a bill
                    </Button>
                  }
                />
              )}
            </motion.div>
          </AnimatePresence>
        </section>
      </div>
    </>
  )
}
