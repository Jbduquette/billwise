import { AnimatePresence, motion } from 'motion/react'
import { ChevronRight, Search } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode, type Ref } from 'react'
import { PageHeader } from '../components/layout/PageHeader'
import { LedgerRow } from '../components/LedgerRow'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Figure } from '../components/ui/Figure'
import { Segmented } from '../components/ui/Segmented'
import { useMoney } from '../hooks/useMoney'
import { CATEGORIES, category, isCategoryId } from '../lib/categories'
import { cx } from '../lib/cx'
import { fmtDate, frequencyMeta, nextDueDate } from '../lib/dates'
import { monthlyEquivalent, occurrencesInMonth, summarize } from '../lib/engine'
import { pluralize } from '../lib/format'
import { EASE_OUT } from '../lib/motion'
import type { Bill, CategoryId, Occurrence } from '../lib/types'
import { useStore } from '../state/store'
import { useUI } from '../state/ui'

type Tab = 'month' | 'all'
type StatusFilter = 'all' | 'open' | 'settled' | 'late' | 'skipped'

function readQuery(): { cat: CategoryId | null } {
  const q = new URLSearchParams(window.location.hash.split('?')[1] ?? '')
  const cat = q.get('cat')
  return { cat: isCategoryId(cat) ? cat : null }
}

function matchStatus(o: Occurrence, f: StatusFilter) {
  switch (f) {
    case 'all':
      return true
    case 'settled':
      return o.status === 'paid'
    case 'late':
      return o.status === 'overdue'
    case 'skipped':
      return o.status === 'skipped'
    case 'open':
      return o.status !== 'paid' && o.status !== 'skipped'
  }
}

export function Bills() {
  const { data } = useStore()
  const { today, month, openEditor } = useUI()
  const { money } = useMoney()
  const [tab, setTab] = useState<Tab>('month')
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<CategoryId | null>(() => readQuery().cat)
  const [status, setStatus] = useState<StatusFilter>('all')

  // Deep links like #/bills?cat=housing (from the Overview's category list).
  useEffect(() => {
    const onHash = () => setCat(readQuery().cat)
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const q = query.trim().toLowerCase()
  const textMatch = (b: Bill) => !q || b.name.toLowerCase().includes(q) || b.notes.toLowerCase().includes(q)

  const monthOccs = useMemo(() => occurrencesInMonth(data, month, today), [data, month, today])
  const summary = useMemo(() => summarize(monthOccs), [monthOccs])
  const visibleOccs = monthOccs.filter((o) => textMatch(o.bill) && (!cat || o.bill.category === cat) && matchStatus(o, status))

  const bills = useMemo(() => [...data.bills].sort((a, b) => a.name.localeCompare(b.name)), [data.bills])
  const visibleBills = bills.filter((b) => textMatch(b) && (!cat || b.category === cat))
  const monthlyAvg = visibleBills.reduce((s, b) => s + monthlyEquivalent(b), 0)

  const usedCats = CATEGORIES.filter((c) => data.bills.some((b) => b.category === c.id))
  const filtered = !!q || !!cat || (tab === 'month' && status !== 'all')
  const monthName = fmtDate(month, 'MMMM')

  const clearFilters = () => {
    setQuery('')
    setCat(null)
    setStatus('all')
    if (window.location.hash.includes('?')) history.replaceState(null, '', '#/bills')
  }

  return (
    <>
      <PageHeader
        eyebrow={`${pluralize(data.bills.length, 'bill')} on file`}
        title="The bills"
        deck={tab === 'month' ? `Every entry falling due in ${monthName}, in date order.` : 'Each bill as it stands, with its usual cost per month.'}
      />

      <Segmented<Tab>
        label="View"
        value={tab}
        onChange={setTab}
        className="mt-5"
        options={[
          { value: 'month', label: `${monthName} entries` },
          { value: 'all', label: 'All bills' },
        ]}
      />

      {tab === 'month' && (
        <dl className="grid grid-cols-3 border-b border-rule">
          <Stat label="Total" value={<Figure value={summary.total} format={money} />} />
          <Stat label="Settled" value={<Figure value={summary.paid} format={money} />} tone="text-olive" />
          <Stat label="Outstanding" value={<Figure value={summary.unpaid} format={money} />} tone={summary.overdue ? 'text-verm' : undefined} />
        </dl>
      )}
      {tab === 'month' && summary.skippedCount > 0 && (
        <p className="border-b border-rule py-2.5 text-sm text-muted">
          {pluralize(summary.skippedCount, 'bill')} skipped this month · <span className="fig line-through">{money(summary.skipped)}</span> not
          counted in these figures.
        </p>
      )}

      <div className="flex flex-col gap-3 pt-5 md:flex-row md:items-end">
        <label className="relative block flex-1">
          <span className="sr-only">Search bills</span>
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            className="field pl-9"
            placeholder="Search by name or note"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        {tab === 'month' && (
          <Segmented<StatusFilter>
            label="Filter by status"
            size="sm"
            value={status}
            onChange={setStatus}
            className="border-b-0"
            options={[
              { value: 'all', label: 'All' },
              { value: 'open', label: 'Open' },
              { value: 'settled', label: 'Settled' },
              { value: 'late', label: 'Late' },
              { value: 'skipped', label: 'Skipped' },
            ]}
          />
        )}
      </div>

      {usedCats.length > 1 && (
        <div className="no-scrollbar -mx-4 mt-2 flex gap-5 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="group" aria-label="Filter by category">
          <CatToggle active={!cat} onClick={() => setCat(null)}>
            Every category
          </CatToggle>
          {usedCats.map((c) => (
            <CatToggle key={c.id} active={cat === c.id} onClick={() => setCat(cat === c.id ? null : c.id)}>
              {c.label}
            </CatToggle>
          ))}
        </div>
      )}

      <div className="mt-2 border-t border-rule-strong">
        {data.bills.length === 0 ? (
          <EmptyState
            art="book"
            title="The ledger is empty"
            action={
              <Button variant="primary" onClick={() => openEditor(null)}>
                Enter your first bill
              </Button>
            }
          >
            Rent, utilities, subscriptions — anything you pay regularly.
          </EmptyState>
        ) : tab === 'month' ? (
          visibleOccs.length ? (
            <ul>
              <AnimatePresence initial={false}>
                {visibleOccs.map((o) => (
                  <LedgerRow key={o.key} occurrence={o} />
                ))}
              </AnimatePresence>
            </ul>
          ) : (
            <NoResults filtered={filtered} onClear={clearFilters} month={monthName} status={status} />
          )
        ) : visibleBills.length ? (
          <>
            <ul>
              <AnimatePresence initial={false}>
                {visibleBills.map((b) => (
                  <BillRow key={b.id} bill={b} today={today} />
                ))}
              </AnimatePresence>
            </ul>
            <p className="flex flex-wrap items-baseline justify-between gap-2 border-t border-ink pt-3">
              <span className="sc">Usual cost per month{filtered ? ' · filtered' : ''}</span>
              <span className="fig text-[1.5rem] text-ink">{money(monthlyAvg)}</span>
            </p>
          </>
        ) : (
          <NoResults filtered={filtered} onClear={clearFilters} />
        )}
      </div>
    </>
  )
}

function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: string }) {
  return (
    <div className="min-w-0 border-l border-rule py-4 pl-4 first:border-l-0 first:pl-0">
      <dt className="sc">{label}</dt>
      <dd className={cx('mt-1 truncate text-[1.375rem] leading-none sm:text-[1.75rem]', tone ?? 'text-ink')}>{value}</dd>
    </div>
  )
}

function CatToggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cx(
        'min-h-11 shrink-0 whitespace-nowrap text-[14px] underline-offset-[6px] transition-colors',
        active ? 'text-ink underline decoration-verm decoration-2' : 'text-muted hover:text-ink',
      )}
    >
      {children}
    </button>
  )
}

function NoResults({
  filtered,
  onClear,
  month,
  status,
}: {
  filtered: boolean
  onClear: () => void
  month?: string
  status?: StatusFilter
}) {
  if (!filtered && month) {
    return <EmptyState art="inkwell" title={`Nothing falls due in ${month}`} />
  }
  const clear = (
    <Button size="sm" onClick={onClear}>
      Clear filters
    </Button>
  )
  if (status === 'open' || status === 'late' || status === 'skipped') {
    const title = status === 'late' ? 'Nothing is late' : status === 'skipped' ? 'Nothing skipped this month' : 'Everything is settled'
    return <EmptyState art="inkwell" title={title} action={clear} />
  }
  return (
    <EmptyState title="No matching entries" action={clear}>
      Try a different search or category.
    </EmptyState>
  )
}

function BillRow({ bill, today, ref }: { bill: Bill; today: string; ref?: Ref<HTMLLIElement> }) {
  const { money } = useMoney()
  const { openEditor } = useUI()
  const next = nextDueDate(bill, today)
  const freq = frequencyMeta(bill.frequency)

  return (
    <motion.li
      ref={ref}
      exit={{ opacity: 0, height: 0, transition: { duration: 0.2, ease: EASE_OUT } }}
      className="overflow-hidden border-b border-rule last:border-b-0"
    >
      <button
        type="button"
        onClick={() => openEditor(bill)}
        className="group flex min-h-[3.75rem] w-full items-center gap-4 py-2.5 text-left transition-colors hover:bg-bg-2"
        aria-label={`Edit ${bill.name}`}
      >
        <span className="min-w-0 flex-1">
          <span className={cx('block truncate text-[15px] font-medium', next ? 'text-ink' : 'text-muted')}>{bill.name}</span>
          <span className="mt-0.5 block truncate text-[13px] text-muted">
            {freq.label} · {category(bill.category).label}
            {bill.autopay && ' · Autopay'} · {next ? `next ${fmtDate(next, 'd MMM')}` : 'finished'}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className="fig block text-[1.125rem] text-ink">{money(bill.amount)}</span>
          {bill.frequency !== 'monthly' && bill.frequency !== 'once' && (
            <span className="fig block text-[12px] text-muted">≈ {money(monthlyEquivalent(bill))} a month</span>
          )}
        </span>
        <ChevronRight aria-hidden className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
      </button>
    </motion.li>
  )
}
