import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { useMoney } from '../../hooks/useMoney'
import { cx } from '../../lib/cx'
import { fmtDate } from '../../lib/dates'
import type { TrendPoint } from '../../lib/engine'
import { EASE_OUT, intro } from '../../lib/motion'

interface Props {
  points: TrendPoint[]
  selected: string
  onSelect: (month: string) => void
}

const CHART_H = 150

/**
 * Monthly totals as ink columns: settled in solid ink, outstanding hatched on
 * top. The month on view is outlined in vermilion. One axis, baseline at zero.
 */
export function TrendBars({ points, selected, onSelect }: Props) {
  const { money, compact } = useMoney()
  const [hover, setHover] = useState<number | null>(null)
  const [drawIn] = useState(() => !intro.done)
  const max = Math.max(...points.map((p) => p.total), 1)

  return (
    <div>
      <div className="mb-4 flex items-center gap-4 text-[12px] text-ink-2" aria-hidden>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 bg-ink" /> Settled
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="hatch size-2.5 border border-ink text-ink" /> Outstanding
        </span>
      </div>

      <ul className="relative flex gap-1.5 border-b border-ink" style={{ height: CHART_H }} aria-label="Monthly totals">
        {points.map((p, i) => {
          const isSel = p.month === selected
          const paidH = (p.paid / max) * (CHART_H - 8)
          const openH = (p.unpaid / max) * (CHART_H - 8)
          const align = i === 0 ? 'left-0' : i === points.length - 1 ? 'right-0' : 'left-1/2 -translate-x-1/2'
          return (
            <li key={p.month} className="relative flex flex-1">
              <button
                type="button"
                onClick={() => onSelect(p.month)}
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                aria-pressed={isSel}
                aria-label={`${fmtDate(p.month, 'MMMM yyyy')}: ${money(p.total)} in total, ${money(p.paid)} settled, ${money(p.unpaid)} outstanding`}
                className="group flex w-full flex-col justify-end"
              >
                <motion.span
                  className={cx('flex w-full origin-bottom flex-col', isSel && 'outline outline-[1.5px] outline-offset-2 outline-verm')}
                  initial={drawIn ? { scaleY: 0 } : false}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.7, ease: EASE_OUT, delay: drawIn ? 0.25 + i * 0.04 : 0 }}
                >
                  {p.unpaid > 0 && <span className="hatch block border border-b-0 border-ink text-ink" style={{ height: openH }} />}
                  <span className="block bg-ink transition-opacity group-hover:opacity-80" style={{ height: paidH }} />
                </motion.span>
              </button>

              <AnimatePresence>
                {hover === i && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, transition: { duration: 0.1 } }}
                    transition={{ duration: 0.15 }}
                    className={cx(
                      'pointer-events-none absolute z-10 w-44 rounded-[3px] border border-rule-strong bg-surface p-3 text-[12px] shadow-[var(--shadow-pop)]',
                      align,
                    )}
                    style={{ bottom: paidH + openH + 12 }}
                    aria-hidden
                  >
                    <p className="mb-1.5 font-serif text-[15px] text-ink">{fmtDate(p.month, 'MMMM yyyy')}</p>
                    <Row label="Total" value={money(p.total)} />
                    <Row label="Settled" value={money(p.paid)} />
                    <Row label="Outstanding" value={money(p.unpaid)} />
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          )
        })}
      </ul>
      <div className="mt-1.5 flex gap-1.5" aria-hidden>
        {points.map((p) => (
          <span key={p.month} className={cx('sc flex-1 text-center !text-[10px]', p.month === selected && '!text-verm')}>
            {fmtDate(p.month, 'MMM')}
          </span>
        ))}
      </div>
      <p className="mt-2 text-right text-[12px] text-muted" aria-hidden>
        Largest month <span className="fig text-ink-2">{compact(max)}</span>
      </p>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex items-baseline py-0.5">
      <span className="text-muted">{label}</span>
      <span className="fig ml-auto text-[13px] text-ink">{value}</span>
    </p>
  )
}
