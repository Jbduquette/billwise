import { cx } from '../../lib/cx'
import type { Occurrence, OccurrenceStatus } from '../../lib/types'

export function statusLabel(o: Pick<Occurrence, 'status' | 'daysUntil'>): string {
  switch (o.status) {
    case 'paid':
      return 'Settled'
    case 'skipped':
      return 'Skipped'
    case 'overdue': {
      const d = -o.daysUntil
      return d === 1 ? '1 day late' : `${d} days late`
    }
    case 'due-today':
      return 'Due today'
    case 'due-soon':
      return o.daysUntil === 1 ? 'Tomorrow' : `In ${o.daysUntil} days`
    case 'upcoming':
      return `In ${o.daysUntil} days`
  }
}

const TONE: Record<OccurrenceStatus, string> = {
  paid: 'text-olive',
  skipped: 'text-muted',
  overdue: 'text-verm',
  'due-today': 'text-ink',
  'due-soon': 'text-ink-2',
  upcoming: 'text-muted',
}

/** Status is set in words (small caps), never carried by color alone. */
export function StatusText({ occurrence, className }: { occurrence: Pick<Occurrence, 'status' | 'daysUntil'>; className?: string }) {
  return <span className={cx('sc whitespace-nowrap', TONE[occurrence.status], className)}>{statusLabel(occurrence)}</span>
}
