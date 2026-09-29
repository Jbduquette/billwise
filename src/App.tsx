import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { lazy, Suspense, useEffect, useRef } from 'react'
import { BillEditor } from './components/BillEditor'
import { ConfirmDialog } from './components/ConfirmDialog'
import { Masthead, PhoneHeader, TabBar } from './components/layout/Shell'
import { OccurrenceSheet } from './components/OccurrenceSheet'
import { useAppBadge, useBillNotifications } from './hooks/useBillNotifications'
import { useUpdateToast } from './hooks/usePwa'
import { useHashRoute, type Route } from './hooks/useHashRoute'
import { useThemeSync } from './hooks/useThemeSync'
import { useToday } from './hooks/useToday'
import { finishIntroSoon } from './lib/motion'
import { Dashboard } from './pages/Dashboard'
import { Welcome } from './pages/Welcome'
import { StoreProvider, useStore } from './state/store'
import { ToastProvider } from './state/toast'
import { UIProvider, useUI } from './state/ui'

// The two possible first screens (Welcome, Overview) ship in the main bundle; the other pages load on
// demand and prefetch when the browser is idle.
const loadBills = () => import('./pages/Bills')
const loadCalendar = () => import('./pages/Calendar')
const loadSettings = () => import('./pages/Settings')
const Bills = lazy(() => loadBills().then((m) => ({ default: m.Bills })))
const Calendar = lazy(() => loadCalendar().then((m) => ({ default: m.Calendar })))
const Settings = lazy(() => loadSettings().then((m) => ({ default: m.Settings })))

function prefetchPages() {
  const run = () => void Promise.all([loadBills(), loadCalendar(), loadSettings()]).catch(() => {})
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 3000 })
  else setTimeout(run, 1500)
}

const TITLES: Record<Route, string> = {
  dashboard: 'Overview',
  bills: 'Bills',
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
            <Root />
          </UIProvider>
        </ToastProvider>
      </StoreProvider>
    </MotionConfig>
  )
}

function Root() {
  const { data, dispatch } = useStore()
  const { today, openEditor } = useUI()
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

  const hasBills = data.bills.length > 0
  const showWelcome = route === 'dashboard' && !hasBills
  const showMonth = hasBills && route !== 'settings'

  const page = showWelcome ? (
    <Welcome />
  ) : route === 'bills' ? (
    <Bills />
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
        className="mx-auto max-w-[1240px] px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] outline-none sm:px-6 lg:px-10 lg:pb-16"
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
      </main>

      <TabBar route={route} />
      <BillEditor />
      <OccurrenceSheet />
      <ConfirmDialog />
    </div>
  )
}
