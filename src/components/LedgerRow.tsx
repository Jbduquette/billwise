import { animate, motion, useIsPresent, useMotionValue, useTransform } from 'motion/react'
import { useRef, useState, type Ref } from 'react'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { useMoney } from '../hooks/useMoney'
import { category } from '../lib/categories'
import { cx } from '../lib/cx'
import { fmtDate } from '../lib/dates'
import { EASE_OUT, wasRecentlySkipped } from '../lib/motion'
import type { Occurrence } from '../lib/types'
import { useBillActions } from '../state/actions'
import { useUI } from '../state/ui'
import { LedgerBox } from './ui/LedgerBox'
import { StatusText } from './ui/StatusText'

interface LedgerRowProps {
  occurrence: Occurrence
  /** Show the date column (off in the calendar's day panel, where the date is the heading). */
  showDate?: boolean
  /** In lists of open bills, a row leaves because it was settled: draw the stroke, then let it go. */
  strikeOnExit?: boolean
  ref?: Ref<HTMLLIElement>
}

/** Distance a row must travel before a swipe commits. */
const SWIPE_COMMIT = 84

/**
 * One bill on one due date, as a ledger line. Tap the entry for details; tick the box to settle it,
 * or skip it (the Skip button on hover/focus, or swipe left on touch screens). Swipe right settles.
 * Settling draws a pen-stroke through the name; skipping sets the entry aside, uncounted.
 */
export function LedgerRow({ occurrence: o, showDate = true, strikeOnExit = false, ref }: LedgerRowProps) {
  const { money } = useMoney()
  const { openOccurrence } = useUI()
  const actions = useBillActions()
  const touch = useMediaQuery('(pointer: coarse)')
  const present = useIsPresent()
  const paid = o.status === 'paid'
  const skipped = o.status === 'skipped'
  const open = !paid && !skipped
  const late = o.status === 'overdue'
  // Leaving an open list because it was skipped: fold away without the "settled" stroke.
  const leavingSkipped = !present && wasRecentlySkipped(o.key)
  const struck = paid || (strikeOnExit && !present && !leavingSkipped)
  const variance = o.payment && Math.abs(o.payment.amount - o.bill.amount) >= 0.01
  const muted = paid || skipped

  // The box (and a right swipe) moves an entry forward: open → settled; settled → open; skipped → back in the month.
  const toggle = () => (paid ? actions.markUnpaid(o) : skipped ? actions.unskip(o) : actions.markPaid(o))
  const boxLabel = paid ? `Reopen ${o.bill.name}` : skipped ? `Restore ${o.bill.name} (skipped)` : `Settle ${o.bill.name}`

  const x = useMotionValue(0)
  const revealRight = useTransform(x, [0, SWIPE_COMMIT], [0, 1])
  const revealLeft = useTransform(x, [0, -SWIPE_COMMIT], [0, 1])
  const dragged = useRef(false)
  // Rows are transparent (the paper grain shows through) except while swiping, when they must cover the underlay.
  const [swiping, setSwiping] = useState(false)

  const line = (
    <div className={cx('flex items-center transition-colors hover:bg-bg-2', swiping && 'bg-bg')}>
      <button
        type="button"
        onClick={() => {
          if (!dragged.current) openOccurrence(o)
        }}
        className={cx(
          'grid min-h-[3.75rem] min-w-0 flex-1 items-center gap-3 py-2 text-left',
          showDate ? 'grid-cols-[2.75rem_minmax(0,1fr)_auto]' : 'grid-cols-[minmax(0,1fr)_auto]',
        )}
      >
        {showDate && (
          <span className="text-center leading-none" aria-hidden>
            <span className={cx('fig block text-[1.5rem] font-[380]', late ? 'text-verm' : muted ? 'text-muted' : 'text-ink')}>
              {fmtDate(o.dueDate, 'dd')}
            </span>
            <span className="sc mt-1 block !text-[9px]">{fmtDate(o.dueDate, 'EEE')}</span>
          </span>
        )}
        <span className="min-w-0">
          <span className="relative inline-block max-w-full align-top">
            <span className={cx('block truncate text-[15px] font-medium', late ? 'text-verm' : muted ? 'text-muted' : 'text-ink')}>
              <span className="sr-only">{fmtDate(o.dueDate, 'MMMM d')}: </span>
              {o.bill.name}
            </span>
            {/* The pen-stroke: draws through the name when the entry is settled. */}
            <motion.span
              aria-hidden
              className="absolute top-1/2 left-0 h-px w-full origin-left bg-ink-2"
              initial={false}
              animate={{ scaleX: struck ? 1 : 0 }}
              transition={{ duration: 0.4, ease: EASE_OUT }}
            />
          </span>
          <span className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5 text-[13px] text-muted">
            <StatusText occurrence={o} />
            <span>
              {category(o.bill.category).label}
              {o.bill.autopay && ' · Autopay'}
            </span>
          </span>
        </span>
        <span className="text-right">
          <span
            className={cx('fig block text-[1.125rem]', late ? 'text-verm' : muted ? 'text-muted' : 'text-ink', skipped && 'line-through')}
            aria-label={skipped ? `${money(o.amount)}, not counted` : undefined}
          >
            {money(o.amount)}
          </span>
          {variance && (
            <span className="fig block text-[12px] text-muted line-through" aria-label={`Expected ${money(o.bill.amount)}`}>
              {money(o.bill.amount)}
            </span>
          )}
        </span>
      </button>

      {/* Desktop: a Skip action that appears on hover or keyboard focus. The column is reserved on every row so amounts stay aligned. */}
      {!touch && (
        <span className="w-12 shrink-0 text-center">
          {open && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                actions.skip(o)
              }}
              aria-label={`Skip ${o.bill.name} for ${fmtDate(o.dueDate, 'd MMMM')}`}
              title="Skip this bill: it leaves what's owed and doesn't count as paid"
              className="sc min-h-11 px-1 !text-ink-2 underline-offset-4 opacity-0 transition-opacity group-hover/row:opacity-100 hover:!text-ink hover:underline focus-visible:opacity-100"
            >
              Skip
            </button>
          )}
        </span>
      )}

      <LedgerBox state={paid ? 'paid' : skipped ? 'skipped' : 'open'} late={late} onToggle={toggle} label={boxLabel} />
    </div>
  )

  return (
    <motion.li
      ref={ref}
      // Leaving: (if settled) let the stroke draw, then fade and fold the row's height so the rows below close up.
      exit={{
        opacity: 0,
        height: 0,
        transition: strikeOnExit && !leavingSkipped ? { delay: 0.45, duration: 0.3, ease: EASE_OUT } : { duration: 0.22, ease: EASE_OUT },
      }}
      className="group/row relative overflow-hidden border-b border-rule last:border-b-0"
    >
      {touch ? (
        <>
          {/* Revealed by a right swipe: settle / reopen / restore. */}
          <motion.div
            aria-hidden
            style={{ opacity: revealRight }}
            className={cx(
              'absolute inset-0 flex items-center gap-2 pl-4 text-sm font-semibold',
              open ? 'bg-olive text-on-ink' : 'bg-bg-2 text-ink',
            )}
          >
            {paid ? 'Reopen' : skipped ? 'Restore' : 'Settle'} →
          </motion.div>
          {/* Revealed by a left swipe (open entries only): skip. */}
          {open && (
            <motion.div
              aria-hidden
              style={{ opacity: revealLeft }}
              className="absolute inset-0 flex items-center justify-end gap-2 bg-ink-2 pr-4 text-sm font-semibold text-on-ink"
            >
              ← Skip
            </motion.div>
          )}
          <motion.div
            style={{ x, touchAction: 'pan-y' }}
            drag="x"
            dragDirectionLock
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={{ left: open ? 0.55 : 0, right: 0.55 }}
            onDragStart={() => {
              dragged.current = true
              setSwiping(true)
            }}
            onDragEnd={(_, info) => {
              if (info.offset.x > SWIPE_COMMIT) toggle()
              else if (open && info.offset.x < -SWIPE_COMMIT) actions.skip(o)
              animate(x, 0, { type: 'spring', stiffness: 500, damping: 40, onComplete: () => setSwiping(false) })
              window.setTimeout(() => (dragged.current = false), 50)
            }}
            className="relative"
          >
            {line}
          </motion.div>
        </>
      ) : (
        line
      )}
    </motion.li>
  )
}
