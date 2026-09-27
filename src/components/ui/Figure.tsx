import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { cx } from '../../lib/cx'
import { EASE_OUT, intro } from '../../lib/motion'

interface FigureProps {
  value: number
  format: (n: number) => string
  className?: string
}

/**
 * A number set like type. Each character sits in its own slot keyed by its
 * position from the right, so when the value changes only the changed digits
 * drop into place. On the very first screen every digit sets in, left to right.
 */
export function Figure({ value, format, className }: FigureProps) {
  const reduce = useReducedMotion()
  const [animateIn] = useState(() => !intro.done && !reduce)
  const text = format(value)
  const chars = [...text]

  return (
    <span className={cx('fig inline-flex whitespace-nowrap', className)}>
      <span className="sr-only">{text}</span>
      {chars.map((ch, i) => {
        const slot = chars.length - i
        return (
          <span key={slot} aria-hidden className="relative -my-[0.12em] inline-block overflow-hidden py-[0.12em]">
            <AnimatePresence initial={animateIn} mode="popLayout">
              <motion.span
                key={ch}
                className="inline-block"
                initial={{ y: '0.75em', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '-0.75em', opacity: 0, transition: { duration: 0.18 } }}
                transition={{ duration: 0.5, ease: EASE_OUT, delay: animateIn ? 0.15 + i * 0.035 : 0 }}
              >
                {ch}
              </motion.span>
            </AnimatePresence>
          </span>
        )
      })}
    </span>
  )
}
