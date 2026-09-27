import type { ReactNode } from 'react'

interface PageHeaderProps {
  eyebrow?: ReactNode
  title: ReactNode
  deck?: ReactNode
  actions?: ReactNode
}

/** Section opener: small-caps dateline, serif headline, optional italic deck. */
export function PageHeader({ eyebrow, title, deck, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-b border-rule-strong pt-6 pb-6 lg:pt-9">
      <div className="min-w-0">
        {eyebrow && <p className="sc mb-2">{eyebrow}</p>}
        <h1 className="font-serif text-[2.25rem] leading-[1.02] font-[380] tracking-[-0.025em] text-balance text-ink sm:text-[2.75rem]">
          {title}
        </h1>
        {deck && <p className="mt-2 max-w-2xl font-serif text-[1.0625rem] text-ink-2 italic">{deck}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}
