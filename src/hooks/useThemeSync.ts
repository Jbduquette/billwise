import { useEffect } from 'react'
import type { ThemePref } from '../lib/types'
import { useMediaQuery } from './useMediaQuery'

/** Resolves the theme preference and stamps it on <html data-theme>. */
export function useThemeSync(pref: ThemePref) {
  const prefersLight = useMediaQuery('(prefers-color-scheme: light)')
  const resolved = pref === 'system' ? (prefersLight ? 'light' : 'dark') : pref
  useEffect(() => {
    document.documentElement.dataset.theme = resolved
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'light' ? '#f2ede3' : '#16140f')
  }, [resolved])
  return resolved
}
