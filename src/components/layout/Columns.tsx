import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'

/** A labelled figure on a dotted rule, as in "The month in figures". */
export function FigureLine({
  label,
  value,
  late,
  muted,
  strong,
}: {
  label: ReactNode
  value: ReactNode
  late?: boolean
  muted?: boolean
  /** The bottom line of a reckoning: a heavier rule and the label in ink. */
  strong?: boolean
}) {
  return (
    <div
      className={cx(
        'flex items-baseline py-2.5',
        strong ? 'border-b-[1.5px] border-ink' : 'border-b border-dotted border-rule-strong',
        late && 'text-verm',
        muted && 'text-muted',
      )}
    >
      <dt className={cx('text-[15px]', late ? 'text-verm' : muted ? 'text-muted' : strong ? 'font-semibold text-ink' : 'text-ink-2')}>{label}</dt>
      <dd className="ml-auto text-[1.5rem] leading-none">{value}</dd>
    </div>
  )
}

/** Serif column heading with an optional small-caps note. */
export function ColumnHead({ id, title, note }: { id: string; title: string; note?: ReactNode }) {
  return (
    <div className="mb-2 flex flex-wrap items-baseline gap-x-3">
      <h2 id={id} className="font-serif text-[1.375rem] font-[450] tracking-[-0.01em] whitespace-nowrap text-ink">
        {title}
      </h2>
      {note && <span className="sc">{note}</span>}
    </div>
  )
}
