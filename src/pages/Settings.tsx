import { useId, useRef, useState, type ReactNode } from 'react'
import { PageHeader } from '../components/layout/PageHeader'
import { Button } from '../components/ui/Button'
import { Segmented } from '../components/ui/Segmented'
import { Switch } from '../components/ui/Switch'
import { notificationsSupported, requestNotificationPermission } from '../hooks/useBillNotifications'
import { exportBillsCsv, exportJson, exportPaymentsCsv } from '../lib/exporters'
import { CURRENCIES, pluralize } from '../lib/format'
import { buildSampleData } from '../lib/sample'
import { EMPTY_DATA, sanitize } from '../lib/storage'
import type { ThemePref } from '../lib/types'
import { useStore } from '../state/store'
import { useToast } from '../state/toast'
import { useUI } from '../state/ui'

const SELECT_BG = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%237a7164' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
}

export function Settings() {
  const { data, dispatch, persisted } = useStore()
  const { today, confirm } = useUI()
  const toast = useToast()
  const fileInput = useRef<HTMLInputElement>(null)
  const currencyId = useId()
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    notificationsSupported() ? Notification.permission : 'unsupported',
  )
  const s = data.settings

  const toggleNotifications = async (on: boolean) => {
    if (!on) {
      dispatch({ type: 'settings', patch: { notifications: false } })
      return
    }
    const result = await requestNotificationPermission()
    setPermission(result)
    if (result === 'granted') {
      dispatch({ type: 'settings', patch: { notifications: true } })
      toast("Reminders on. You'll hear about bills due today or tomorrow.")
    } else if (result === 'unsupported') {
      toast("This browser doesn't support notifications.", { tone: 'error' })
    } else {
      toast('Notifications are blocked. Allow them in your browser’s site settings.', { tone: 'error' })
    }
  }

  const onImport = async (file: File) => {
    try {
      const parsed = sanitize(JSON.parse(await file.text()))
      if (!parsed) throw new Error('invalid')
      const ok = await confirm({
        title: 'Replace your ledger?',
        message: `This backup holds ${pluralize(parsed.bills.length, 'bill')} and ${pluralize(parsed.payments.length, 'payment')}. It will replace everything currently in Billwise.`,
        confirmLabel: 'Replace ledger',
        tone: 'danger',
      })
      if (!ok) return
      dispatch({ type: 'replace', data: parsed })
      toast(`Imported ${pluralize(parsed.bills.length, 'bill')}`)
    } catch {
      toast("That file isn't a valid Billwise backup.", { tone: 'error' })
    }
  }

  const loadSample = async () => {
    if (data.bills.length) {
      const ok = await confirm({
        title: 'Load a sample month?',
        message: 'Sample bills will replace your current bills and payment history. Export a backup first if you want to keep them.',
        confirmLabel: 'Replace with sample',
        tone: 'danger',
      })
      if (!ok) return
    }
    dispatch({ type: 'replace', data: buildSampleData(today, s) })
    toast('Sample month loaded', { tone: 'info' })
  }

  const eraseAll = async () => {
    const ok = await confirm({
      title: 'Erase the whole ledger?',
      message: 'Every bill, payment and setting will be permanently removed from this browser. This cannot be undone.',
      confirmLabel: 'Erase everything',
      tone: 'danger',
    })
    if (!ok) return
    dispatch({ type: 'replace', data: { ...EMPTY_DATA, settings: { ...EMPTY_DATA.settings, theme: s.theme } } })
    toast('Ledger erased', { tone: 'info' })
  }

  return (
    <>
      <PageHeader eyebrow="Preferences & records" title="Settings" />

      <div className="max-w-3xl">
        <Section title="Display" note="How the ledger is set">
          <Row label="Edition" hint="Paper for daylight, ink for evenings.">
            <Segmented<ThemePref>
              label="Edition"
              value={s.theme}
              onChange={(theme) => dispatch({ type: 'settings', patch: { theme } })}
              className="w-full border-b-0 sm:w-auto"
              options={[
                { value: 'light', label: 'Paper' },
                { value: 'dark', label: 'Ink' },
                { value: 'system', label: 'Match device', ariaLabel: 'Match device setting' },
              ]}
            />
          </Row>
          <Row label="Currency" htmlFor={currencyId}>
            <select
              id={currencyId}
              className="field appearance-none bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat pr-10 sm:w-72"
              style={SELECT_BG}
              value={s.currency}
              onChange={(e) => dispatch({ type: 'settings', patch: { currency: e.target.value } })}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.label}
                </option>
              ))}
            </select>
          </Row>
          <Row label="“Due soon” window" hint="How far ahead a bill counts as coming due.">
            <Segmented<string>
              label="Due soon window"
              value={String(s.dueSoonDays)}
              onChange={(v) => dispatch({ type: 'settings', patch: { dueSoonDays: Number(v) } })}
              className="w-full border-b-0 sm:w-auto"
              options={['3', '5', '7', '14'].map((v) => ({ value: v, label: `${v} days` }))}
            />
          </Row>
        </Section>

        <Section title="Reminders" note="While Billwise is open">
          <Switch
            checked={s.notifications && permission === 'granted'}
            onChange={toggleNotifications}
            disabled={permission === 'unsupported'}
            label="Browser notifications"
            description={
              permission === 'unsupported'
                ? "This browser doesn't support notifications."
                : permission === 'denied'
                  ? 'Blocked by your browser. Allow notifications for this site, then try again.'
                  : 'One note a day about bills that are late, or due today or tomorrow.'
            }
          />
        </Section>

        <Section title="Your records" note="Kept in this browser only">
          <p className="mb-5 font-serif text-[1.0625rem] leading-relaxed text-ink-2 italic">
            Nothing here is sent to a server.{' '}
            {!persisted && (
              <strong className="font-sans text-[15px] font-semibold text-verm not-italic">
                Your browser is blocking storage (private mode?), so changes won't be kept after this tab closes.
              </strong>
            )}{' '}
            Export a backup to move your ledger to another device.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button onClick={() => exportJson(data, today)} disabled={!data.bills.length}>
              Export backup (JSON)
            </Button>
            <Button onClick={() => fileInput.current?.click()}>Import backup</Button>
            <Button onClick={() => exportBillsCsv(data, today)} disabled={!data.bills.length}>
              Bills as a spreadsheet (CSV)
            </Button>
            <Button onClick={() => exportPaymentsCsv(data, today)} disabled={!data.payments.length && !data.skips.length}>
              Payment history (CSV)
            </Button>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void onImport(f)
              e.target.value = ''
            }}
          />
          <div className="mt-6 flex flex-col gap-2 border-t border-rule pt-5 sm:flex-row">
            <Button variant="ghost" onClick={loadSample}>
              Load a sample month
            </Button>
            <Button variant="ghost" className="text-verm hover:bg-verm-soft hover:text-verm sm:ml-auto" onClick={eraseAll}>
              Erase the whole ledger
            </Button>
          </div>
        </Section>

        <p className="sc pt-6 pb-4">
          Billwise · {pluralize(data.bills.length, 'bill')} · {pluralize(data.payments.length, 'payment')} recorded
        </p>
      </div>
    </>
  )
}

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  const id = useId()
  return (
    <section className="border-b border-rule-strong py-7" aria-labelledby={id}>
      <div className="mb-4 flex items-baseline gap-3">
        <h2 id={id} className="font-serif text-[1.5rem] font-[420] tracking-[-0.01em] text-ink">
          {title}
        </h2>
        {note && <span className="sc">{note}</span>}
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  )
}

function Row({ label, hint, htmlFor, children }: { label: string; hint?: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        {htmlFor ? (
          <label htmlFor={htmlFor} className="text-[15px] font-medium text-ink">
            {label}
          </label>
        ) : (
          <p className="text-[15px] font-medium text-ink">{label}</p>
        )}
        {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
      </div>
      {children}
    </div>
  )
}
