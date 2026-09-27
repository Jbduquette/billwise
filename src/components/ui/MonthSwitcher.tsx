import { AnimatePresence, motion } from 'motion/react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useLayoutEffect, useRef } from 'react'
import { cx } from '../../lib/cx'
import { fmtDate, monthStart, shiftMonth } from '../../lib/dates'
import { EASE_OUT } from '../../lib/motion'
import { useUI } from '../../state/ui'

/** Desktop: ‹ September 2026 ›, with a way back to the current month. */
export function MonthSwitcher({ className }: { className?: string }) {
  const { month, setMonth, today } = useUI()
  const direction = useRef(0)
  const current = monthStart(today)
  const go = (n: number) => {
    direction.current = n
    setMonth(shiftMonth(month, n))
  }

  return (
    <div className={cx('flex items-center gap-1', className)}>
      <button
        type="button"
        aria-label="Previous month"
        onClick={() => go(-1)}
        className="grid size-11 place-items-center rounded-full text-ink-2 transition-colors hover:bg-bg-2 hover:text-ink"
      >
        <span className="grid size-8 place-items-center rounded-full border border-ink-2">
          <ChevronLeft aria-hidden className="size-4" />
        </span>
      </button>
      <div className="relative h-11 w-[9.5rem] overflow-hidden" aria-live="polite">
        <AnimatePresence initial={false} custom={direction.current} mode="popLayout">
          <motion.span
            key={month}
            custom={direction.current}
            variants={{
              enter: (d: number) => ({ y: d * 14, opacity: 0 }),
              center: { y: 0, opacity: 1 },
              exit: (d: number) => ({ y: d * -14, opacity: 0 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: EASE_OUT }}
            className="absolute inset-0 grid place-items-center"
          >
            <span>
              <span className="font-serif text-[19px] text-ink">{fmtDate(month, 'MMMM')}</span>{' '}
              <span className="fig text-[15px] text-ink-2">{fmtDate(month, 'yyyy')}</span>
            </span>
          </motion.span>
        </AnimatePresence>
      </div>
      <button
        type="button"
        aria-label="Next month"
        onClick={() => go(1)}
        className="grid size-11 place-items-center rounded-full text-ink-2 transition-colors hover:bg-bg-2 hover:text-ink"
      >
        <span className="grid size-8 place-items-center rounded-full border border-ink-2">
          <ChevronRight aria-hidden className="size-4" />
        </span>
      </button>
      {month !== current && (
        <button
          type="button"
          onClick={() => {
            direction.current = current > month ? 1 : -1
            setMonth(current)
          }}
          className="sc min-h-11 px-2 !text-verm underline-offset-4 hover:underline"
        >
          This month
        </button>
      )}
    </div>
  )
}

const STRIP_SPAN = 6

/** Phones: a thumb-friendly strip of months around the selected one; the active month is underlined. */
export function MonthStrip({ className }: { className?: string }) {
  const { month, setMonth, today } = useUI()
  const scroller = useRef<HTMLDivElement>(null)
  const current = monthStart(today)
  const months = Array.from({ length: STRIP_SPAN * 2 + 1 }, (_, i) => shiftMonth(month, i - STRIP_SPAN))

  // Keep the active month centred. Set scrollLeft directly (scrollIntoView can also scroll the page),
  // and again once web fonts land, since they change the labels' widths.
  useLayoutEffect(() => {
    const centre = () => {
      const box = scroller.current
      const el = box?.querySelector<HTMLElement>('[aria-current="true"]')
      if (box && el) box.scrollLeft = el.offsetLeft - (box.clientWidth - el.offsetWidth) / 2
    }
    centre()
    document.fonts?.ready.then(centre)
  }, [month])

  return (
    <nav aria-label="Month" className={cx('border-b border-rule', className)}>
      <div ref={scroller} className="no-scrollbar relative flex gap-5 overflow-x-auto px-4 sm:px-6">
        {months.map((m) => {
          const active = m === month
          const showYear = m.slice(0, 4) !== current.slice(0, 4)
          return (
            <button
              key={m}
              type="button"
              aria-current={active ? 'true' : undefined}
              onClick={() => setMonth(m)}
              className={cx(
                'relative min-h-11 shrink-0 whitespace-nowrap transition-colors',
                active ? 'font-serif text-[17px] text-ink italic' : 'text-sm text-muted hover:text-ink',
              )}
            >
              {fmtDate(m, 'MMMM')}
              {showYear && <span className="fig ml-1 text-[12px]">{fmtDate(m, "''yy")}</span>}
              {active && (
                <motion.span
                  layoutId="month-strip-active"
                  className="absolute inset-x-0 bottom-0 h-[2px] bg-verm"
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
