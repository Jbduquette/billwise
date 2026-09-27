import { useEffect } from 'react'
import { agenda } from '../lib/engine'
import { formatMoney } from '../lib/format'
import { readLocal, writeLocal } from '../lib/storage'
import type { AppData } from '../lib/types'

const LAST_KEY = 'billwise:notified-on'

export const notificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window

/**
 * While the app is open, send one summary notification per day for bills that
 * are overdue or due today/tomorrow. (Browsers only deliver these while a tab is open.)
 */
export function useBillNotifications(data: AppData, today: string) {
  const enabled = data.settings.notifications

  useEffect(() => {
    if (!enabled || !notificationsSupported() || Notification.permission !== 'granted') return

    const check = () => {
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
        new Notification(`${urgent.length} bill${urgent.length > 1 ? 's' : ''} need attention · ${formatMoney(total, data.settings.currency)}`, {
          body: names + (urgent.length > 3 ? ` +${urgent.length - 3} more` : ''),
          icon: './favicon.svg',
          tag: 'billwise-daily',
        })
        writeLocal(LAST_KEY, today)
      } catch {
        /* some mobile browsers only allow notifications from a service worker */
      }
    }

    check()
    const id = window.setInterval(check, 30 * 60_000)
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
