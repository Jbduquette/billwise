import { AnimatePresence, MotionConfig, motion, useAnimationControls } from 'motion/react'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { BillEditor } from './components/BillEditor'
import { ConfirmDialog } from './components/ConfirmDialog'
import { Masthead, PhoneHeader, TabBar } from './components/layout/Shell'
import { OccurrenceSheet } from './components/OccurrenceSheet'
import { PaperDefs } from './components/ui/PaperDefs'
import { useAppBadge, useBillNotifications } from './hooks/useBillNotifications'
import { useUpdateToast } from './hooks/usePwa'
import { useHashRoute, type Route } from './hooks/useHashRoute'
import { useThemeSync } from './hooks/useThemeSync'
import { useToday } from './hooks/useToday'
import { EASE_OUT, finishIntroSoon } from './lib/motion'
import { Dashboard } from './pages/Dashboard'
import { Welcome } from './pages/Welcome'
import { StoreProvider, useStore } from './state/store'
import { SyncProvider } from './state/sync'
import { ToastProvider } from './state/toast'
import { UIProvider, useUI } from './state/ui'

// The two possible first screens (Welcome, Overview) ship in the main bundle; the other pages load on
// demand and prefetch when the browser is idle.
const loadBills = () => import('./pages/Bills')
const loadBudget = () => import('./pages/Budget')
const loadCalendar = () => import('./pages/Calendar')
const loadSettings = () => import('./pages/Settings')
const Bills = lazy(() => loadBills().then((m) => ({ default: m.Bills })))
const Budget = lazy(() => loadBudget().then((m) => ({ default: m.Budget })))
const Calendar = lazy(() => loadCalendar().then((m) => ({ default: m.Calendar })))
const Settings = lazy(() => loadSettings().then((m) => ({ default: m.Settings })))

function prefetchPages() {
  const run = () => void Promise.all([loadBills(), loadBudget(), loadCalendar(), loadSettings()]).catch(() => {})
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 3000 })
  else setTimeout(run, 1500)
}

const TITLES: Record<Route, string> = {
  dashboard: 'Overview',
  bills: 'Bills',
  budget: 'Budget',
  calendar: 'Calendar',
  settings: 'Settings',
}

export default function App() {
  const today = useToday()
  return (
    <MotionConfig reducedMotion="user">
      <StoreProvider>
        <ToastProvider>
          <UIProvider today={today}>
            <SyncProvider>
              <Root />
            </SyncProvider>
          </UIProvider>
        </ToastProvider>
      </StoreProvider>
    </MotionConfig>
  )
}

function Root() {
  const { data, dispatch } = useStore()
  const { today, month, openEditor } = useUI()
  const [route] = useHashRoute()
  const main = useRef<HTMLElement>(null)

  useThemeSync(data.settings.theme)
  useBillNotifications(data, today)
  useAppBadge(data, today)
  useUpdateToast()

  // The "Add a bill" home-screen shortcut opens #/bills?add: open the editor, then tidy the address.
  useEffect(() => {
    const openFromShortcut = () => {
      const [path, query] = window.location.hash.split('?')
      if (query !== 'add') return
      history.replaceState(null, '', path || '#/')
      openEditor()
    }
    openFromShortcut()
    window.addEventListener('hashchange', openFromShortcut)
    return () => window.removeEventListener('hashchange', openFromShortcut)
  }, [openEditor])

  // Apply autopay on launch and whenever the day rolls over.
  useEffect(() => {
    dispatch({ type: 'autopay', today })
  }, [today, dispatch])

  useEffect(() => {
    prefetchPages()
    finishIntroSoon()
  }, [])

  useEffect(() => {
    document.title = `${TITLES[route]} · Billwise`
    window.scrollTo({ top: 0 })
  }, [route])

  // Turning the month turns the page: forwards from the left-hand spine, backwards from the right.
  const turn = useAnimationControls()
  const [turnFrom, setTurnFrom] = useState('left center')
  const lastMonth = useRef(month)
  useEffect(() => {
    const prev = lastMonth.current
    lastMonth.current = month
    if (prev === month || route === 'settings') return
    const dir = month > prev ? 1 : -1
    setTurnFrom(dir > 0 ? 'left center' : 'right center')
    // The 3D perspective is only there while the page turns; at rest the sheet carries no transform at all.
    void turn
      .start({
        transformPerspective: [1600, 1600],
        rotateY: [dir * -6, 0],
      x: [dir * 14, 0],
        opacity: [0.55, 1],
        transition: { duration: 0.45, ease: EASE_OUT },
      })
      .then(() => turn.set({ transformPerspective: 0 }))
  }, [month, route, turn])

  const hasBills = data.bills.length > 0
  const showWelcome = route === 'dashboard' && !hasBills
  const showMonth = hasBills && route !== 'settings'

  const page = showWelcome ? (
    <Welcome />
  ) : route === 'bills' ? (
    <Bills />
  ) : route === 'budget' ? (
    <Budget />
  ) : route === 'calendar' ? (
    <Calendar />
  ) : route === 'settings' ? (
    <Settings />
  ) : (
    <Dashboard />
  )

  return (
    <div className="relative z-10 min-h-dvh">
      <button
        type="button"
        onClick={() => main.current?.focus()}
        className="sr-only z-[70] rounded-[3px] bg-ink px-4 py-2 text-sm font-semibold text-on-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </button>

      <Masthead route={route} showMonth={showMonth} />
      <PhoneHeader showMonth={showMonth} />

      <main
        ref={main}
        tabIndex={-1}
        className="mx-auto max-w-[1300px] px-2.5 pt-3 pb-[calc(6rem+env(safe-area-inset-bottom))] outline-none sm:px-4 lg:px-8 lg:pt-8 lg:pb-16"
      >
        {/* The page itself: a sheet of paper on the desk. Changing month turns it from the spine. */}
        <motion.div
          animate={turn}
          style={{ transformOrigin: turnFrom }}
          className="sheet px-4 pb-10 sm:px-6 lg:px-12 lg:pb-12"
        >
          {/* Pages cross-fade quickly; entrance flourishes belong to the first screen only.
              The Suspense boundary sits outside the fade: a page that is still loading must not
              suspend inside an element mid-animation (it can leave the wrapper stuck transparent). */}
          <Suspense fallback={<div className="min-h-[60vh]" aria-busy="true" />}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={showWelcome ? 'welcome' : route}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.2 } }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
              >
                {page}
              </motion.div>
            </AnimatePresence>
          </Suspense>

          {/* The colophon: who set this ledger in type. Outside the page fade, so it stays put between pages. */}
          <footer className="mt-14 border-t border-rule pt-5 text-center text-[13px] text-muted">
            Site built by{' '}
            <a
              href="https://tarheelwebstudio.com"
              target="_blank"
              rel="noopener"
              className="font-medium text-ink-2 underline decoration-rule-strong underline-offset-4 transition-colors hover:text-ink hover:decoration-ink"
            >
              Tar Heel Web Studio LLC<span className="sr-only"> (opens in a new tab)</span>
            </a>
          </footer>
        </motion.div>
      </main>
      <PaperDefs />

      <TabBar route={route} />
      <BillEditor />
      <OccurrenceSheet />
      <ConfirmDialog />
    </div>
  )
}
