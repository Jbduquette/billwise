const cache = new Map<string, Intl.NumberFormat>()

type Style = 'full' | 'compact' | 'whole'

function nf(currency: string, style: Style): Intl.NumberFormat {
  const key = `${currency}|${style}`
  let f = cache.get(key)
  if (!f) {
    try {
      f = new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
        ...(style === 'compact' ? { notation: 'compact', maximumFractionDigits: 1 } : {}),
        ...(style === 'whole' ? { maximumFractionDigits: 0, minimumFractionDigits: 0 } : {}),
      })
    } catch {
      f = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' })
    }
    cache.set(key, f)
  }
  return f
}

export function formatMoney(value: number, currency: string): string {
  return nf(currency, 'full').format(Number.isFinite(value) ? value : 0)
}

/** Short label for tight spaces: "$1.9K" for large values, "$16" below a thousand. */
export function formatCompact(value: number, currency: string): string {
  const v = Number.isFinite(value) ? value : 0
  return nf(currency, Math.abs(v) >= 1000 ? 'compact' : 'whole').format(v)
}

/** Round to cents so sums stay free of floating-point dust. */
export const round2 = (n: number) => Math.round(n * 100) / 100

export const CURRENCIES: { code: string; label: string }[] = [
  { code: 'USD', label: 'US Dollar' },
  { code: 'EUR', label: 'Euro' },
  { code: 'GBP', label: 'British Pound' },
  { code: 'CAD', label: 'Canadian Dollar' },
  { code: 'AUD', label: 'Australian Dollar' },
  { code: 'NZD', label: 'New Zealand Dollar' },
  { code: 'JPY', label: 'Japanese Yen' },
  { code: 'CHF', label: 'Swiss Franc' },
  { code: 'INR', label: 'Indian Rupee' },
  { code: 'MXN', label: 'Mexican Peso' },
  { code: 'BRL', label: 'Brazilian Real' },
  { code: 'ZAR', label: 'South African Rand' },
  { code: 'SEK', label: 'Swedish Krona' },
  { code: 'SGD', label: 'Singapore Dollar' },
  { code: 'PHP', label: 'Philippine Peso' },
]

export function pluralize(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`
}
