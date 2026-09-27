import { motion } from 'motion/react'
import { Plus } from 'lucide-react'
import { hrefFor, type Route } from '../../hooks/useHashRoute'
import { cx } from '../../lib/cx'
import { useUI } from '../../state/ui'
import { Button } from '../ui/Button'
import { MonthStrip, MonthSwitcher } from '../ui/MonthSwitcher'

export const NAV: { route: Route; label: string }[] = [
  { route: 'dashboard', label: 'Overview' },
  { route: 'bills', label: 'Bills' },
  { route: 'calendar', label: 'Calendar' },
  { route: 'settings', label: 'Settings' },
]

export function Wordmark({ tagline = false, className }: { tagline?: boolean; className?: string }) {
  return (
    <span className={cx('inline-block leading-none', className)}>
      <span className="font-serif text-[1.75rem] font-[480] tracking-[-0.02em] text-ink italic">Billwise</span>
      {tagline && <span className="sc mt-1 block !text-[9.5px]">A private ledger</span>}
    </span>
  )
}

interface ShellProps {
  route: Route
  /** Month controls only make sense once there are bills, and not on Settings. */
  showMonth: boolean
}

/** Desktop masthead: wordmark, section links, month and the primary action, over a double rule. */
export function Masthead({ route, showMonth }: ShellProps) {
  const { openEditor } = useUI()
  return (
    <header className="relative z-20 hidden lg:block">
      <div className="mx-auto max-w-[1240px] px-10">
        <div className="flex h-[78px] items-center gap-10">
          <a href="#/" className="rounded-[3px]">
            <Wordmark tagline />
          </a>
          <nav aria-label="Primary" className="flex gap-7">
            {NAV.map((n) => {
              const active = n.route === route
              return (
                <a
                  key={n.route}
                  href={hrefFor(n.route)}
                  aria-current={active ? 'page' : undefined}
                  className={cx('relative flex min-h-11 items-center text-[15px] transition-colors', active ? 'font-semibold text-ink' : 'text-ink-2 hover:text-ink')}
                >
                  {n.label}
                  {active && (
                    <motion.span
                      layoutId="masthead-active"
                      className="absolute inset-x-0 bottom-1.5 h-[2px] bg-ink"
                      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                    />
                  )}
                </a>
              )
            })}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            {showMonth && <MonthSwitcher />}
            <Button variant="primary" onClick={() => openEditor(null)}>
              <Plus aria-hidden className="size-4" />
              Enter a bill
            </Button>
          </div>
        </div>
        <div className="rule-double" />
      </div>
    </header>
  )
}

/** Phone header: wordmark and the add action, with the month strip beneath. */
export function PhoneHeader({ showMonth }: Omit<ShellProps, 'route'>) {
  const { openEditor } = useUI()
  return (
    <header className="relative z-20 pt-[env(safe-area-inset-top)] lg:hidden">
      <div className="flex h-16 items-center px-4 sm:px-6">
        <a href="#/" className="rounded-[3px]">
          <Wordmark />
        </a>
        <button
          type="button"
          onClick={() => openEditor(null)}
          aria-label="Enter a bill"
          className="ml-auto grid size-11 place-items-center rounded-[3px] border-[1.5px] border-ink text-ink transition-colors active:bg-bg-2"
        >
          <Plus aria-hidden className="size-5" />
        </button>
      </div>
      {showMonth ? <MonthStrip /> : <div className="border-b border-rule" />}
    </header>
  )
}

/** Phone tab bar: set in small caps, the active section marked with a vermilion point. */
export function TabBar({ route }: { route: Route }) {
  return (
    <nav aria-label="Primary" className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-bg lg:hidden">
      <div className="mx-auto flex max-w-lg">
        {NAV.map((n) => {
          const active = n.route === route
          return (
            <a
              key={n.route}
              href={hrefFor(n.route)}
              aria-current={active ? 'page' : undefined}
              className={cx('sc relative flex min-h-14 flex-1 flex-col items-center justify-center gap-1.5 !text-[10px]', active && '!text-ink')}
            >
              <span className="relative block size-[5px]">
                {active && (
                  <motion.span
                    layoutId="tab-active"
                    className="absolute inset-0 rounded-full bg-verm"
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                  />
                )}
              </span>
              {n.label}
            </a>
          )
        })}
      </div>
    </nav>
  )
}
