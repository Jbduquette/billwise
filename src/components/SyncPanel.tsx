import { useEffect, useId, useState, type FormEvent } from 'react'
import { format } from 'date-fns'
import { cx } from '../lib/cx'
import { useSync } from '../state/sync'
import { Button } from './ui/Button'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function friendly(e: unknown, fallback: string) {
  const m = e && typeof e === 'object' && 'message' in e && typeof e.message === 'string' ? e.message : ''
  if (/rate limit|too many|seconds/i.test(m)) return 'Too many sign-in emails were sent just now. Wait a few minutes, then try again.'
  if (/expired|invalid|token/i.test(m)) return 'That code didn’t work. Check it, or send a new one.'
  if (/fetch|network/i.test(m) || !navigator.onLine) return 'Couldn’t reach the sync service. Check your connection.'
  return m || fallback
}

/** Settings → Sync: sign in with an emailed code, then see the state of the synced copy. */
export function SyncPanel() {
  const sync = useSync()
  if (!sync.available) return null
  if (sync.meta) return <SignedIn />
  if (sync.pendingEmail) return <EnterCode />
  return <SignIn />
}

function SignIn() {
  const { sendCode } = useSync()
  const id = useId()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const v = email.trim()
    if (!EMAIL.test(v)) {
      setError('Enter your email address.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await sendCode(v)
    } catch (err) {
      setError(friendly(err, 'Couldn’t send the email.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <p className="font-serif text-[1.0625rem] leading-relaxed text-ink-2 italic">
        Sign in with your email to keep this ledger in step on your phone, your computer and the installed app. It’s
        stored in your own Billwise account, which only you can open. Without signing in, it stays on this device.
      </p>
      <label htmlFor={id} className="label mt-5">
        Email
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={id}
          type="email"
          inputMode="email"
          autoComplete="email"
          className="field sm:max-w-sm"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : `${id}-hint`}
        />
        <Button variant="primary" type="submit" disabled={busy}>
          {busy ? 'Sending…' : 'Email me a sign-in code'}
        </Button>
      </div>
      {error ? (
        <p id={`${id}-err`} role="alert" className="mt-1.5 text-[13px] font-medium text-verm">
          {error}
        </p>
      ) : (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-muted">
          No password: each time you sign in on a new device, we email you a code.
        </p>
      )}
    </form>
  )
}

function EnterCode() {
  const { pendingEmail, verifyCode, sendCode, cancelSignIn } = useSync()
  const id = useId()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const v = code.replace(/\D/g, '')
    if (v.length < 6) {
      setError('Enter the code from the email.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await verifyCode(v)
    } catch (err) {
      setError(friendly(err, 'Sign-in didn’t complete.'))
    } finally {
      setBusy(false)
    }
  }

  const resend = async () => {
    setError(null)
    try {
      await sendCode(pendingEmail!)
      setNote('A new code is on its way.')
    } catch (err) {
      setError(friendly(err, 'Couldn’t send the email.'))
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <p className="font-serif text-[1.0625rem] leading-relaxed text-ink-2 italic">
        We emailed a sign-in code to <span className="text-ink not-italic">{pendingEmail}</span>. Type it here, or tap
        the link in the email on this device.
      </p>
      <label htmlFor={id} className="label mt-5">
        Code from the email
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={id}
          className="field tabular tracking-[0.3em] sm:max-w-[13rem]"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={10}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="12345678"
          autoFocus
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
        />
        <Button variant="primary" type="submit" disabled={busy}>
          {busy ? 'Checking…' : 'Sign in'}
        </Button>
      </div>
      {error && (
        <p id={`${id}-err`} role="alert" className="mt-1.5 text-[13px] font-medium text-verm">
          {error}
        </p>
      )}
      {note && !error && (
        <p role="status" className="mt-1.5 text-sm text-muted">
          {note}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={resend}>
          Send a new code
        </Button>
        <Button variant="ghost" size="sm" onClick={cancelSignIn}>
          Use a different email
        </Button>
      </div>
    </form>
  )
}

function SignedIn() {
  const { meta, status, lastSynced, error, syncNow, signOut, deleteSynced } = useSync()
  // Re-render now and then so "just now" ages.
  const [, tick] = useState(0)
  useEffect(() => {
    const t = window.setInterval(() => tick((n) => n + 1), 30_000)
    return () => window.clearInterval(t)
  }, [])

  const line =
    status === 'syncing'
      ? 'Syncing…'
      : status === 'offline'
        ? 'Offline. Changes are kept here and sync when you’re back online.'
        : status === 'error'
          ? `Couldn’t sync: ${error ?? 'unknown error'}`
          : lastSynced
            ? `Synced ${Date.now() - lastSynced < 60_000 ? 'just now' : `at ${format(lastSynced, 'h:mm a')}`}`
            : 'Synced'

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-medium text-ink">Signed in as {meta!.email}</p>
          <p role="status" className={cx('mt-0.5 text-sm', status === 'error' ? 'font-medium text-verm' : 'text-muted')}>
            {line}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button onClick={syncNow} disabled={status === 'syncing'}>
            Sync now
          </Button>
          <Button onClick={() => void signOut()}>Sign out</Button>
        </div>
      </div>
      <p className="mt-4 text-sm text-muted">
        Changes save to your account a moment after you make them, and other devices pick them up when they’re next
        opened. Signing out keeps the ledger on this device.
      </p>
      <Button variant="ghost" size="sm" className="mt-3 -ml-3 text-verm hover:bg-verm-soft hover:text-verm" onClick={() => void deleteSynced()}>
        Delete the synced copy
      </Button>
    </div>
  )
}
