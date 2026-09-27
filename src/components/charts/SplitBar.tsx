import { motion } from 'motion/react'
import { useState } from 'react'
import { EASE_OUT, intro } from '../../lib/motion'

/** Settled (olive) against outstanding (hatched ink): the month's progress as a single rule. */
export function SplitBar({ value, label }: { value: number; label: string }) {
  const v = Math.max(0, Math.min(1, value))
  const [drawIn] = useState(() => !intro.done)
  return (
    <div role="img" aria-label={label}>
      <div className="flex h-2.5">
        <motion.div
          className="h-full origin-left bg-olive"
          initial={drawIn ? { scaleX: 0 } : false}
          animate={{ scaleX: 1, width: `${v * 100}%` }}
          transition={{ duration: 0.9, ease: EASE_OUT, delay: drawIn ? 0.2 : 0 }}
        />
        {v < 1 && <div className="hatch h-full flex-1 border border-l-0 border-ink text-ink" />}
      </div>
      <div className="mt-2 flex justify-between" aria-hidden>
        <span className="sc">{Math.round(v * 100)}% settled</span>
        <span className="sc">{100 - Math.round(v * 100)}% open</span>
      </div>
    </div>
  )
}
