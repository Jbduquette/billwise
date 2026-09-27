import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'
import { Engraving, type EngravingKind } from './Engraving'

interface EmptyStateProps {
  title: string
  art?: EngravingKind
  children?: ReactNode
  action?: ReactNode
  className?: string
}

export function EmptyState({ title, art, children, action, className }: EmptyStateProps) {
  return (
    <div className={cx('flex flex-col items-center px-6 py-10 text-center', className)}>
      {art && <Engraving kind={art} className="mb-5 w-40 max-w-full" />}
      <p className="font-serif text-xl text-ink">{title}</p>
      {children && <div className="mt-1.5 max-w-sm font-serif text-[15px] text-ink-2 italic">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
