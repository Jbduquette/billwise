import { AnimatePresence, motion, useDragControls } from 'motion/react'
import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { cx } from '../../lib/cx'
import { IconButton } from './Button'

interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md'
  /** Close on Escape / backdrop. Disabled for the confirm dialog's inner flow if needed. */
  dismissible?: boolean
}

/** Stack of open sheets so only the top-most one reacts to Escape / traps focus. */
const stack: symbol[] = []

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

/**
 * Bottom sheet on phones (drag the handle down to dismiss), centered dialog on
 * larger screens. Focus is trapped while open and restored on close.
 */
export function Sheet({ open, onClose, title, description, children, footer, size = 'md', dismissible = true }: SheetProps) {
  const isPhone = useMediaQuery('(max-width: 639px)')
  const panel = useRef<HTMLDivElement>(null)
  const drag = useDragControls()
  const titleId = useId()
  const descId = useId()
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    const token = Symbol('sheet')
    stack.push(token)
    const restoreTo = document.activeElement as HTMLElement | null
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusTimer = window.setTimeout(() => {
      const el = panel.current
      if (!el) return
      const target = el.querySelector<HTMLElement>('[data-autofocus]') ?? el
      target.focus({ preventScroll: true })
    }, 40)

    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== token) return
      if (e.key === 'Escape' && dismissible) {
        e.stopPropagation()
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab' || !panel.current) return
      const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((n) => n.offsetParent !== null)
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)

    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('keydown', onKey)
      const i = stack.indexOf(token)
      if (i >= 0) stack.splice(i, 1)
      if (!stack.length) document.body.style.overflow = prevOverflow
      restoreTo?.focus?.({ preventScroll: true })
    }
  }, [open, dismissible])

  const panelMotion = isPhone
    ? {
        initial: { y: '100%' },
        animate: { y: 0, transition: { type: 'spring' as const, stiffness: 420, damping: 40 } },
        exit: { y: '100%', transition: { duration: 0.22, ease: [0.4, 0, 1, 1] as const } },
      }
    : {
        initial: { opacity: 0, scale: 0.96, y: 12 },
        animate: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring' as const, stiffness: 460, damping: 36 } },
        exit: { opacity: 0, scale: 0.97, y: 6, transition: { duration: 0.15, ease: [0.4, 0, 1, 1] as const } },
      }

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            aria-hidden
            className="absolute inset-0 bg-[#0d0b08]/55"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.2 } }}
            exit={{ opacity: 0, transition: { duration: 0.18 } }}
            onClick={() => dismissible && onClose()}
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            tabIndex={-1}
            {...panelMotion}
            drag={isPhone && dismissible ? 'y' : false}
            dragListener={false}
            dragControls={drag}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.7 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 600) onClose()
            }}
            className={cx(
              'relative flex max-h-[92dvh] w-full flex-col overflow-hidden border border-rule-strong bg-surface shadow-[var(--shadow-pop)] outline-none',
              'rounded-t-[14px] sm:rounded-[6px]',
              size === 'sm' ? 'sm:max-w-md' : 'sm:max-w-xl',
            )}
          >
            {isPhone && (
              <div
                onPointerDown={(e) => dismissible && drag.start(e)}
                className="flex shrink-0 touch-none justify-center pt-3 pb-1"
                aria-hidden
              >
                <span className="h-1 w-10 rounded-full bg-control" />
              </div>
            )}
            <header className="flex shrink-0 items-start gap-3 px-5 pt-3 pb-2 sm:px-6 sm:pt-6">
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="font-serif text-[1.625rem] leading-tight tracking-[-0.01em] text-ink">
                  {title}
                </h2>
                {description && (
                  <div id={descId} className="mt-1 font-serif text-[15px] text-ink-2 italic">
                    {description}
                  </div>
                )}
              </div>
              {dismissible && (
                <IconButton label="Close" onClick={onClose} className="-mr-2 -mt-1">
                  <X aria-hidden className="size-5" />
                </IconButton>
              )}
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-2 pb-5 sm:px-6">{children}</div>
            {footer && (
              <footer className="flex shrink-0 flex-wrap items-center gap-2 border-t border-rule bg-surface px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-5">
                {footer}
              </footer>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
