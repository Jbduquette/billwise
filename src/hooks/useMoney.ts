import { useMemo } from 'react'
import { formatCompact, formatMoney } from '../lib/format'
import { useStore } from '../state/store'

/** Currency formatters bound to the user's currency; stable between renders. */
export function useMoney() {
  const currency = useStore().data.settings.currency
  return useMemo(
    () => ({
      currency,
      money: (n: number) => formatMoney(n, currency),
      compact: (n: number) => formatCompact(n, currency),
    }),
    [currency],
  )
}
