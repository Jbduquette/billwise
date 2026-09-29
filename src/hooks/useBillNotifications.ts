import { useEffect } from 'react'
import { agenda } from '../lib/engine'
import { formatMoney } from '../lib/format'
import { readLocal, writeLocal } from '../lib/storage'
import type { AppData } from '../lib/types'

const LAST_KEY = 'billwise:notified-on'

export const notificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window

/**
 * Shows a notification through the service worker when there is one: Android only allows it that way,
 * and tapping it brings the app forward. Falls back to a page notification in a plain tab.
 */
async function notify(title: string, options: NotificationOptions) {
  const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined
  if (reg?.active) await reg.showNotification(title, options)
  else new Notification(title, options)
}

/**
 * While the app is open, send one summary notification per day for bills that
 * are overdue or due today/tomorrow. (Browsers only deliver these while the app or a tab is open.)
 */
export function useBillNotifications(data: AppData, today: string) {
  const enabled = data.settings.notifications

  useEffect(() => {
    if (!enabled || !notificationsSupported() || Notification.permission !== 'granted') return

    const check = async () => {
      if (readLocal<string | null>(LAST_KEY, null) === today) return
      const { overdue, soon } = agenda(data, today)
      const urgent = [...overdue, ...soon.filter((o) => o.daysUntil <= 1)]
      if (!urgent.length) return

      const total = urgent.reduce((s, o) => s + o.amount, 0)
      const names = urgent
        .slice(0, 3)
        .map((o) => `${o.bill.name} (${o.daysUntil < 0 ? 'overdue' : o.daysUntil === 0 ? 'today' : 'tomorrow'})`)
        .join(', ')
      try {
        // Claim the day first so two open windows don't both notify.
        writeLocal(LAST_KEY, today)
        await notify(`${urgent.length} bill${urgent.length > 1 ? 's' : ''} need attention · ${formatMoney(total, data.settings.currency)}`, {
          body: names + (urgent.length > 3 ? ` +${urgent.length - 3} more` : ''),
          icon: './icon-192.png',
          tag: 'billwise-daily',
        })
      } catch {
        writeLocal(LAST_KEY, null)
      }
    }

    void check()
    const id = window.setInterval(() => void check(), 30 * 60_000)
    return () => window.clearInterval(id)
  }, [enabled, data, today])
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!notificationsSupported()) return 'unsupported'
  if (Notification.permission !== 'default') return Notification.permission
  try {
    return await Notification.requestPermission()
  } catch {
    return 'denied'
  }
}

type BadgingNavigator = Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> }

/**
 * On the installed app's icon (dock, taskbar, home screen), show how many entries are late or due today.
 * Browsers without the Badging API, and plain tabs, simply ignore it.
 */
export function useAppBadge(data: AppData, today: string) {
  useEffect(() => {
    const nav = navigator as BadgingNavigator
    if (!nav.setAppBadge) return
    const { overdue, soon } = agenda(data, today)
    const count = overdue.length + soon.filter((o) => o.daysUntil <= 0).length
    const done = count ? nav.setAppBadge(count) : nav.clearAppBadge?.()
    done?.catch(() => {})
  }, [data, today])
}
