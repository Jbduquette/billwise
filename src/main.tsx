import { MotionGlobalConfig } from 'motion/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { loadFonts } from './lib/fonts'

function mount() {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
  loadFonts()
}

/** Dev-only review switches. Stripped from production builds. */
async function devSetup() {
  const params = new URLSearchParams(window.location.search)
  // ?static — render every animation in its final state (screenshots, reviews).
  if (params.has('static')) MotionGlobalConfig.skipAnimations = true
  // ?demo — review with the sample month held in memory (localStorage untouched); ?theme=light|dark picks the edition.
  if (!params.has('demo')) return
  const [{ buildSampleData }, { DEFAULT_SETTINGS }, { todayISO }] = await Promise.all([
    import('./lib/sample'),
    import('./lib/storage'),
    import('./lib/dates'),
    // Warm the on-demand pages so review screenshots never catch a page mid-load.
    import('./pages/Bills'),
    import('./pages/Calendar'),
    import('./pages/Settings'),
  ])
  const theme = params.get('theme')
  const settings = { ...DEFAULT_SETTINGS, theme: theme === 'light' || theme === 'dark' ? theme : DEFAULT_SETTINGS.theme }
  // ?demo=empty reviews the first-visit screen.
  window.__billwiseDemo =
    params.get('demo') === 'empty' ? { version: 1, bills: [], payments: [], settings } : buildSampleData(todayISO(), settings)
  document.documentElement.dataset.theme = settings.theme === 'dark' ? 'dark' : 'light'
}

if (import.meta.env.DEV) void devSetup().then(mount)
else mount()
