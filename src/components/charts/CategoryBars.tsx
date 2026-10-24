import { motion } from 'motion/react'
import { useState } from 'react'
import { useMoney } from '../../hooks/useMoney'
import { category } from '../../lib/categories'
import { CategoryMark } from '../ui/CategoryMark'
import type { CategorySlice } from '../../lib/engine'
import { EASE_OUT, intro } from '../../lib/motion'
import type { CategoryId } from '../../lib/types'

interface Props {
  slices: CategorySlice[]
  total: number
  onSelect?: (id: CategoryId) => void
  /** What the percentages are shares of, for screen readers. */
  shareOf?: string
}

/**
 * Where the month's money goes, as a typeset list: every line carries its
 * label, amount and share, with a hairline bar for scale in the category's ink. The ink is never the only
 * cue: each line also carries its name.
 */
export function CategoryBars({ slices, total, onSelect, shareOf = 'the month' }: Props) {
  const { money } = useMoney()
  const [drawIn] = useState(() => !intro.done)
  const sorted = [...slices].sort((a, b) => b.amount - a.amount)
  const max = sorted[0]?.amount ?? 1

  return (
    <ul aria-label="Spending by category">
      {sorted.map((s, i) => {
        const pct = total > 0 ? (s.amount / total) * 100 : 0
        const label = category(s.id).label
        return (
          <li key={s.id} className="border-b border-rule last:border-b-0">
            <button
              type="button"
              onClick={() => onSelect?.(s.id)}
              aria-label={`${label}: ${money(s.amount)}, ${Math.round(pct)}% of ${shareOf}. View these bills.`}
              className="group block w-full py-2.5 text-left"
            >
              <span className="flex items-baseline gap-3">
                <span className="flex min-w-0 flex-1 items-center gap-2 text-sm text-ink">
                  <CategoryMark id={s.id} />
                  <span className="truncate group-hover:underline group-hover:underline-offset-4">{label}</span>
                </span>
                <span className="fig text-[1.0625rem] text-ink">{money(s.amount)}</span>
                <span className="fig w-9 text-right text-[12px] text-muted">{Math.round(pct)}%</span>
              </span>
              <span className="mt-2 block h-1 overflow-hidden rounded-full bg-bg-2" aria-hidden>
                <motion.span
                  className="block h-full origin-left rounded-full"
                  style={{ width: `${Math.max((s.amount / max) * 100, 1)}%`, background: category(s.id).ink }}
                  initial={drawIn ? { scaleX: 0 } : false}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.7, ease: EASE_OUT, delay: drawIn ? 0.3 + i * 0.05 : 0 }}
                />
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
