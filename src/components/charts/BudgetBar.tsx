import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'
import { EASE_OUT } from '../../lib/motion'

interface Props {
  income: number
  bills: number
  setAside: number
  label: string
  /** A thin rule with no key, for rows in a list. */
  compact?: boolean
}

const pct = (n: number) => `${Math.round(n * 100)}%`

/**
 * Where the month's income goes, as one rule: bills in solid ink, set-asides hatched, what's
 * left in olive. When the plan runs past the income, the overrun is marked in vermilion
 * from the point where the money runs out.
 */
export function BudgetBar({ income, bills, setAside, label, compact }: Props) {
  const planned = bills + setAside
  const scale = Math.max(income, planned, 0.01)
  const left = income - planned
  const short = left < 0
  // The key always reads as shares of income, matching the sentence above it; only the rule's geometry stretches to fit an overrun.
  const base = income > 0 ? income : scale
  const parts = [
    { key: 'bills', value: bills, className: 'bg-ink' },
    { key: 'set', value: setAside, className: cx('hatch border-ink text-ink', compact ? '' : 'border-y') },
    { key: 'left', value: Math.max(left, 0), className: 'bg-olive' },
  ].filter((p) => p.value > 0)

  return (
    <div role={label ? 'img' : undefined} aria-label={label || undefined} aria-hidden={label ? undefined : true}>
      <div className={cx('relative flex gap-[2px]', compact ? 'h-[3px]' : 'h-2.5')}>
        {parts.map((p, i) => (
          <motion.div
            key={p.key}
            className={cx('h-full', p.className)}
            initial={{ width: 0 }}
            animate={{ width: `calc(${(p.value / scale) * 100}% - 2px)` }}
            transition={{ duration: 0.8, ease: EASE_OUT, delay: 0.1 + i * 0.08 }}
          />
        ))}
        {short && (
          <motion.div
            className={cx('absolute right-0 border-l-2 border-verm bg-verm-soft', compact ? '-inset-y-[3px]' : '-inset-y-1')}
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: `${(-left / scale) * 100}%` }}
            transition={{ duration: 0.4, ease: EASE_OUT, delay: 0.6 }}
          />
        )}
      </div>
      {!compact && (
        <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1" aria-hidden>
          <Key swatch="bg-ink">Bills {pct(bills / base)}</Key>
          {setAside > 0 && <Key swatch="hatch border border-ink text-ink">Set aside {pct(setAside / base)}</Key>}
          {short ? (
            <Key swatch="border-l-2 border-verm bg-verm-soft" className="!text-verm">
              Short {pct(-left / base)}
            </Key>
          ) : (
            left > 0 && <Key swatch="bg-olive">Left {pct(left / base)}</Key>
          )}
        </ul>
      )}
    </div>
  )
}

function Key({ swatch, className, children }: { swatch: string; className?: string; children: ReactNode }) {
  return (
    <li className={cx('sc flex items-center gap-1.5', className)}>
      <span className={cx('inline-block size-2.5', swatch)} />
      {children}
    </li>
  )
}
