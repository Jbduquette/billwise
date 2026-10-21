import { CalendarDays } from 'lucide-react'
import { useEffect, useState } from 'react'

type Part = 'year' | 'month' | 'day'

/** The order this device writes dates in (10/21/2026, 21/10/2026, 2026/10/21…). */
const ORDER: Part[] = (() => {
  try {
    const parts = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(new Date(2026, 10, 23))
      .map((p) => p.type)
      .filter((t): t is Part => t === 'year' || t === 'month' || t === 'day')
    return parts.length === 3 ? parts : ['month', 'day', 'year']
  } catch {
    return ['month', 'day', 'year']
  }
})()

const LEN: Record<Part, number> = { year: 4, month: 2, day: 2 }
export const DATE_PLACEHOLDER = ORDER.map((p) => (p === 'year' ? 'YYYY' : p === 'month' ? 'MM' : 'DD')).join('/')

/** yyyy-MM-dd → the device's order, e.g. 10/21/2026. */
export function formatTyped(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return ''
  const v: Record<Part, string> = { year: m[1], month: m[2], day: m[3] }
  return ORDER.map((p) => v[p]).join('/')
}

/** What someone typed → yyyy-MM-dd, or null if it isn't a whole, real date. Accepts 3/5/26, 03-05-2026, 03052026. */
export function parseTyped(text: string): string | null {
  const groups = text.split(/\D+/).filter(Boolean)
  let raw: string[]
  if (groups.length === 3) raw = groups
  else if (groups.length === 1 && groups[0].length === 8) {
    let i = 0
    raw = ORDER.map((p) => groups[0].slice(i, (i += LEN[p])))
  } else return null
  const v = Object.fromEntries(ORDER.map((p, i) => [p, raw[i]])) as Record<Part, string>
  if (v.year.length !== 4 && v.year.length !== 2) return null
  const y = v.year.length === 2 ? 2000 + Number(v.year) : Number(v.year)
  const mo = Number(v.month)
  const d = Number(v.day)
  if (y < 1900 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > new Date(y, mo, 0).getDate()) return null
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** As someone types digits, add the slash once a part is full: 1 → 10 → 10/ → 10/2… */
function autoSlash(prev: string, next: string): string {
  let t = next.replace(/[.\-\s]/g, '/').replace(/[^\d/]/g, '').replace(/\/{2,}/g, '/')
  if (t.length > prev.length && /\d$/.test(t)) {
    const segs = t.split('/')
    const i = segs.length - 1
    if (i < 2 && segs[i].length >= LEN[ORDER[i]]) t += '/'
  }
  return t.slice(0, 10)
}

interface DateFieldProps {
  id: string
  /** yyyy-MM-dd, or '' while empty or not yet a whole date. */
  value: string
  onChange: (iso: string) => void
  onBlur?: () => void
  min?: string
  invalid?: boolean
  describedBy?: string
  /** For focusing the first invalid field on submit. */
  dataField?: string
}

/**
 * A date you can type: the phone shows its number keypad and the slashes fill themselves in. The calendar
 * button beside it opens the device's own date picker for anyone who'd rather tap. (A bare
 * `<input type="date">` never offers a keyboard on phones, and some phone browsers show nothing at all.)
 */
export function DateField({ id, value, onChange, onBlur, min, invalid, describedBy, dataField }: DateFieldProps) {
  const [text, setText] = useState(() => formatTyped(value))

  // Follow changes made from outside (the picker, a reset), but never clobber a half-typed date.
  useEffect(() => {
    setText((t) => (parseTyped(t) === value || (!value && !parseTyped(t)) ? t : formatTyped(value)))
  }, [value])

  const formatId = `${id}-format`
  return (
    <div className="relative">
      <input
        id={id}
        data-field={dataField}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        className="field tabular pr-12"
        placeholder={DATE_PLACEHOLDER}
        maxLength={10}
        value={text}
        onChange={(e) => {
          const next = autoSlash(text, e.target.value)
          setText(next)
          onChange(parseTyped(next) ?? '')
        }}
        onBlur={() => {
          const iso = parseTyped(text)
          if (iso) setText(formatTyped(iso))
          onBlur?.()
        }}
        aria-invalid={invalid || undefined}
        aria-describedby={[describedBy, formatId].filter(Boolean).join(' ')}
      />
      <span id={formatId} className="sr-only">
        Type the date as {ORDER.join(', ')}, in numbers, or use the calendar button.
      </span>
      {/* The device's own picker sits, invisible, over the calendar icon: a tap opens it on phones, and
          showPicker() opens it on desktop browsers, where clicking the field itself would not. */}
      <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 grid w-11 place-items-center text-ink-2">
        <CalendarDays className="size-[1.125rem]" strokeWidth={1.75} />
      </span>
      <input
        type="date"
        tabIndex={-1}
        aria-label="Choose from a calendar"
        title="Choose from a calendar"
        value={value}
        min={min}
        onChange={(e) => {
          setText(formatTyped(e.target.value))
          onChange(e.target.value)
          onBlur?.()
        }}
        onClick={(e) => {
          try {
            e.currentTarget.showPicker?.()
          } catch {
            /* already open, or not supported: the tap itself opens it on phones */
          }
        }}
        className="absolute inset-y-0 right-0 w-11 cursor-pointer text-base opacity-0"
      />
    </div>
  )
}
