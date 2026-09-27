import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { cx } from '../lib/cx'

type Tone = 'success' | 'error' | 'info'

interface Toast {
  id: number
  message: string
  tone: Tone
  action?: { label: string; onClick: () => void }
}

type ShowToast = (message: string, opts?: { tone?: Tone; action?: Toast['action']; duration?: number }) => void

const ToastContext = createContext<ShowToast | null>(null)


export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)
  const timers = useRef(new Map<number, number>())

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id))
    const handle = timers.current.get(id)
    if (handle) window.clearTimeout(handle)
    timers.current.delete(id)
  }, [])

  const show = useCallback<ShowToast>(
    (message, opts = {}) => {
      const id = nextId.current++
      // Newest on top; keep the stack short so it never covers the page.
      setToasts((t) => [{ id, message, tone: opts.tone ?? 'success', action: opts.action }, ...t].slice(0, 3))
      timers.current.set(id, window.setTimeout(() => dismiss(id), opts.duration ?? (opts.action ? 6000 : 3800)))
    },
    [dismiss],
  )

  const value = useMemo(() => show, [show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-relevant="additions"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-8 lg:left-auto lg:right-8 lg:items-end"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.14 } }}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                role={t.tone === 'error' ? 'alert' : 'status'}
                className={cx(
                  'pointer-events-auto flex w-full max-w-sm items-center gap-2 rounded-[3px] bg-ink py-1.5 pl-4 pr-1.5 text-on-ink shadow-[var(--shadow-pop)]',
                  t.tone === 'error' && 'border-l-4 border-verm',
                )}
              >
                <p className="min-w-0 flex-1 text-sm">{t.message}</p>
                {t.action && (
                  <button
                    type="button"
                    onClick={() => {
                      t.action!.onClick()
                      dismiss(t.id)
                    }}
                    className="min-h-11 px-3 text-sm font-semibold underline underline-offset-4 hover:opacity-80"
                  >
                    {t.action.label}
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Dismiss notification"
                  onClick={() => dismiss(t.id)}
                  className="grid size-11 shrink-0 place-items-center opacity-70 transition-opacity hover:opacity-100"
                >
                  <X aria-hidden className="size-4" />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ShowToast {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
