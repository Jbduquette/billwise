import { useEffect, useState } from 'react'
import { todayISO } from '../lib/dates'

/** Today's date that rolls over at midnight and when a backgrounded tab is revisited. */
export function useToday(): string {
  const [today, setToday] = useState(todayISO)
  useEffect(() => {
    const sync = () => setToday(todayISO())
    const id = window.setInterval(sync, 60_000)
    document.addEventListener('visibilitychange', sync)
    window.addEventListener('focus', sync)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', sync)
      window.removeEventListener('focus', sync)
    }
  }, [])
  return today
}
