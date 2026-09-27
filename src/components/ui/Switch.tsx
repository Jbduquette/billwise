import { cx } from '../../lib/cx'

interface SwitchProps {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
  description?: string
  id?: string
  disabled?: boolean
}

export function Switch({ checked, onChange, label, description, id, disabled }: SwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="group flex w-full items-center gap-4 py-2.5 text-left disabled:opacity-50"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-sm text-muted">{description}</span>}
      </span>
      <span
        aria-hidden
        className={cx(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-[1.5px] transition-colors duration-200',
          checked ? 'border-ink bg-ink' : 'border-control bg-surface',
        )}
      >
        <span
          className={cx(
            'absolute left-[3px] size-4 rounded-full transition-[transform,background-color] duration-200 ease-[var(--ease-out-expo)]',
            checked ? 'translate-x-5 bg-bg' : 'translate-x-0 bg-control',
          )}
        />
      </span>
    </button>
  )
}
