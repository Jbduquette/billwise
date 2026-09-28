import { motion } from 'motion/react'
import { cx } from '../../lib/cx'

interface LedgerBoxProps {
  /** open: empty box · paid: olive fill with a drawn check · skipped: a dash (the entry is set aside). */
  state: 'open' | 'paid' | 'skipped'
  onToggle: () => void
  label: string
  late?: boolean
}

/** The ledger's tick box. 44px hit area around a 1.2rem mark. */
export function LedgerBox({ state, onToggle, label, late }: LedgerBoxProps) {
  const paid = state === 'paid'
  const skipped = state === 'skipped'
  return (
    <button
      type="button"
      // A skipped entry isn't "unchecked"; its box is a restore button rather than a checkbox.
      role={skipped ? undefined : 'checkbox'}
      aria-checked={skipped ? undefined : paid}
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      className="group grid size-11 shrink-0 place-items-center"
    >
      <motion.span
        whileTap={{ scale: 0.86 }}
        className={cx(
          'grid size-[1.2rem] place-items-center rounded-[2px] border-[1.5px] transition-colors duration-200',
          paid
            ? 'border-olive bg-olive'
            : skipped
              ? 'border-control group-hover:bg-bg-2'
              : late
                ? 'border-verm group-hover:bg-verm-soft'
                : 'border-ink-2 group-hover:bg-bg-2',
        )}
      >
        <svg viewBox="0 0 16 16" className="size-3" aria-hidden>
          <motion.path
            d="M3 8.5 6.5 12 13 4.5"
            fill="none"
            stroke="var(--on-ink)"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={false}
            animate={{ pathLength: paid ? 1 : 0, opacity: paid ? 1 : 0 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
          />
          <motion.path
            d="M4 8 H12"
            fill="none"
            stroke="var(--muted)"
            strokeWidth={2}
            strokeLinecap="round"
            initial={false}
            animate={{ pathLength: skipped ? 1 : 0, opacity: skipped ? 1 : 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          />
        </svg>
      </motion.span>
    </button>
  )
}
