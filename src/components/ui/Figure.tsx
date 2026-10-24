import { AnimatePresence, animate, motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { cx } from '../../lib/cx'
import { EASE_OUT, intro } from '../../lib/motion'

interface FigureProps {
  value: number
  format: (n: number) => string
  className?: string
  /** Set in gold foil (the month's headline figure). */
  foil?: boolean
}

/**
 * A number set like type. On the very first screen every digit sets in, left to right. After that,
 * when the value changes (another month, a bill settled) the figure counts to its new value.
 * Tabular figures keep the digits from jostling while it counts.
 */
export function Figure({ value, format, className, foil }: FigureProps) {
  const reduce = useReducedMotion()
  const [animateIn] = useState(() => !intro.done && !reduce)
  const [shown, setShown] = useState(value)
  const [changed, setChanged] = useState(false)
  const from = useRef(value)

  useEffect(() => {
    if (from.current === value) return
    setChanged(true)
    if (reduce) {
      from.current = value
      setShown(value)
      return
    }
    const controls = animate(from.current, value, {
      duration: 0.7,
      ease: EASE_OUT,
      onUpdate: (v) => {
        from.current = v
        setShown(v)
      },
    })
    return () => controls.stop()
  }, [value, reduce])

  const text = format(value)
  const chars = [...format(shown)]
  // The foil runs across the whole figure: each character shows its own slice of one long gradient.
  const foilChar = (i: number) =>
    foil ? { backgroundSize: `${chars.length * 0.62}em 100%`, backgroundPosition: `${i * -0.62}em 0` } : undefined

  return (
    <span className={cx('fig inline-flex whitespace-nowrap', className)} style={foil ? { filter: 'var(--foil-lift)' } : undefined}>
      <span className="sr-only">{text}</span>
      {chars.map((ch, i) => {
        const slot = chars.length - i
        return animateIn && !changed ? (
          <span key={slot} aria-hidden className="relative -my-[0.12em] inline-block overflow-hidden py-[0.12em]">
            <AnimatePresence initial mode="popLayout">
              <motion.span
                key={ch}
                className={cx('inline-block', foil && 'foil')}
                style={foilChar(i)}
                initial={{ y: '0.75em', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '-0.75em', opacity: 0, transition: { duration: 0.18 } }}
                transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.15 + i * 0.035 }}
              >
                {ch}
              </motion.span>
            </AnimatePresence>
          </span>
        ) : (
          <span key={slot} aria-hidden className={cx('inline-block', foil && 'foil')} style={foilChar(i)}>
            {ch}
          </span>
        )
      })}
    </span>
  )
}
