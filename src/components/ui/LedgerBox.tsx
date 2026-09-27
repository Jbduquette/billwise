import { motion } from 'motion/react'
import { cx } from '../../lib/cx'

interface LedgerBoxProps {
  checked: boolean
  onToggle: () => void
  label: string
  late?: boolean
}

/** The ledger's tick box: a square that fills with olive and draws its check. 44px hit area. */
export function LedgerBox({ checked, onToggle, label, late }: LedgerBoxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
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
          checked ? 'border-olive bg-olive' : late ? 'border-verm group-hover:bg-verm-soft' : 'border-ink-2 group-hover:bg-bg-2',
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
            animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
          />
        </svg>
      </motion.span>
    </button>
  )
}
