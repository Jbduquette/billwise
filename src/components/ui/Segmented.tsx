import { motion } from 'motion/react'
import { useId, type ReactNode } from 'react'
import { cx } from '../../lib/cx'

interface Option<T extends string> {
  value: T
  label: ReactNode
  /** Accessible name when the label is abbreviated. */
  ariaLabel?: string
}

interface TabsProps<T extends string> {
  value: T
  onChange: (v: T) => void
  options: Option<T>[]
  label: string
  className?: string
  size?: 'sm' | 'md'
}

/**
 * Underlined tabs built on a native radio group (arrow keys work for free).
 * The rule under the active option slides between choices.
 */
export function Segmented<T extends string>({ value, onChange, options, label, className, size = 'md' }: TabsProps<T>) {
  const name = useId()
  return (
    <div role="radiogroup" aria-label={label} className={cx('flex gap-5 border-b border-rule', className)}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <label
            key={o.value}
            className={cx(
              'relative flex min-h-11 cursor-pointer items-center gap-1.5 whitespace-nowrap transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-verm',
              size === 'sm' ? 'sc !text-[11px]' : 'text-[15px]',
              active ? (size === 'sm' ? '!text-ink' : 'font-semibold text-ink') : size === 'sm' ? '' : 'text-muted hover:text-ink',
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={active}
              onChange={() => onChange(o.value)}
              aria-label={o.ariaLabel}
              className="sr-only"
            />
            {o.label}
            {active && (
              <motion.span
                layoutId={`tab-${name}`}
                className="absolute inset-x-0 -bottom-px h-[2px] bg-ink"
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              />
            )}
          </label>
        )
      })}
    </div>
  )
}
