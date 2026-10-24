# Billwise

A private ledger for your bills. Add your bills once and Billwise shows:

- **How much you owe each month**, set large, with what's settled and what remains
- **What falls due**: late entries first, then your "due soon" window (3–14 days), then later
- **What you've already paid**, including custom amounts and payment dates for variable bills
- **What's still open**, as a month of entries you can filter by status, category and search
- **Skip a bill** for one due date. It leaves what's owed without counting as paid. To skip, use the **Skip** button
  on a row (on hover or keyboard focus), the details sheet, or swipe left on a phone. Undo it, restore it, or pay it
  after all whenever you like
- **Budget around your bills.** Enter what comes in (a paycheck every two weeks, a monthly pension, a one-off) and
  set money aside for what isn't a bill (groceries, fuel, savings). The Budget tab takes the month's bills straight
  from the ledger and shows what's left or how far short the plan runs. It also looks six months ahead, so
  three-paycheck months and heavy-bill months show up early

It also has recurring schedules (weekly through yearly, plus one-time), autopay, a calendar, spending by category,
a six-month trend, daily browser reminders, JSON backup/restore and CSV export.

By default all data stays in the browser's `localStorage`: no account, no server and no tracking. Signing in to
**sync** is optional (see below).

## Sync across devices (optional, Supabase)

Settings → *Sync across devices* signs in with an emailed one-time code (no password). Once signed in, the ledger
is kept in step on every device that signs in to the same account.

- **Storage.** One row per person in a Supabase table, `ledgers` (`user_id`, `data` jsonb, `revision`). Row-level
  security means a signed-in person can only read or change their own row, and signed-out visitors get no access at
  all. The schema is in [`supabase/schema.sql`](supabase/schema.sql).
- **Offline first.** `localStorage` stays the working copy, so nothing changes offline. Edits save to the cloud
  about a second after they're made. Other devices check for changes when the app comes back into view, when it
  reconnects, and every 90 seconds while it's open.
- **Conflicts.** Each save names the revision it started from. If another device saved first, the two copies are
  merged by record id, so every bill, payment, skip, income and set-aside from both sides is kept. The catch: a
  record deleted on one device and still present on another can come back.
- **First sign-in on a device that already has a ledger.** You choose whether to use the account's ledger or merge
  the two.
- **Kept per device.** The reminders setting, which depends on each device's notification permission.
- **Cost to visitors who don't sync.** The Supabase client (about 55 KB gzipped) is code-split and loads only for
  people who sign in. The CSP allows connections to the project's URL only.
- **Configuration.** The project URL and publishable key are in `.env`. The publishable key is public by design;
  row-level security is what protects the data.
- **Email.** `supabase/email-template.html` is the sign-in email, which carries a code and a link. The code matters
  on iPhone, where the installed app and Safari keep separate storage.
- **Testing.** `review/sync-test.mjs` (not committed) runs three "devices" against a fake Supabase in Node, through
  a dev-only hook (`window.__billwiseFakeSupabase`) that production builds strip out.

## The app

Billwise installs as an app on phones and computers, straight from the site. There's no app store.

- **Installing.** Settings → *The app* has an **Install app** button in Chrome and Edge (Android, Windows, macOS,
  ChromeOS). On iPhone and iPad, open the site in Safari, tap **Share**, then **Add to Home Screen**. Any browser's
  menu also offers "Install app" or "Add to Home screen".
- **Offline.** A service worker keeps every file the app needs, so it opens instantly and works with no connection.
- **Updates.** Each deploy ships a new edition. The app checks hourly and whenever it comes back into view, then
  shows "A new edition of Billwise is ready · Reload". If that's dismissed, the update applies the next time the
  app is opened.
- **Home-screen shortcuts.** Long-press or right-click the icon for *Add a bill*, *Bills*, *Budget* and *Calendar*.
- **Icon badge.** Where supported, the icon shows how many entries are late or due today.
- **Reminders.** These are sent through the service worker, so they also work on Android. Like the site's
  reminders, they only arrive while the app is open.
- **Your ledger.** On Android and desktop the installed app shares the browser's ledger for billwiseledger.com. On
  iPhone and iPad, the Home Screen app keeps its own ledger, separate from Safari's. To move your bills across,
  export a backup in Safari and import it in the app.

How it's built:

- `pwa/service-worker.js` is a template.
- At build time, `pwa/vite-plugin.mjs` fills in the file list and an edition hash, and writes it to `dist/sw.js`.
- Registration, updates and the install prompt are handled in `src/lib/pwa.ts`.
- The service worker only runs in production builds. Use `npm run build && npm run preview` to try it locally.

## Design: the Editorial Ledger

- **Two editions.** Paper (light) and Ink (dark), switchable in Settings. The default follows the device setting.
- **Colour.** Paper, ink, vermilion (late or needing attention) and olive (settled), plus:
  - **Ink green** for the masthead band, with a gold rule beneath it.
  - **Gold foil**, kept for a few moments: the month's headline figure, the drop cap, the selected month in the
    trend, the "Enter a bill" button. It's a dark antique gold on paper and a bright gold on ink, and every stop
    of the gradient is at least 3:1 for display text.
  - **Category inks**: one muted printer's colour per category, shown as a small diamond and in the breakdown
    bars, always beside the category's name.

  Every text pair meets WCAG AA (4.5:1) and every control and graphic boundary meets 3:1 in both editions.
- **Paper with depth.** The page is a sheet of paper on a desk: uneven edges (an SVG displacement filter, drawn once
  as its own layer), a soft shadow, and raised cards for the month's figures and lists. Headlines are lightly
  letterpressed. On phones the lists sit straight on the page so every pixel of width goes to the bills.
- **Type.** Fraunces, a variable serif with an optical-size axis, for headlines and figures. Instrument Sans for
  interface text. Numbers use lining, tabular figures. The month's sentence opens with a drop cap.
- **Status is typographic.** Settled entries are struck through with a pen-stroke and carry a vermilion **PAID**
  rubber stamp with the date. Late entries are set in vermilion, and status is always spelled out in words as well.
- **Imagery.** Engraving-style line art is drawn in the current ink colour, so it suits both editions:
  - an engraving for each month beside the headline on wide screens (`src/components/ui/MonthVignette.tsx`:
    January's pine, February's snowdrops… October's oak, November's maple, December's holly);
  - fleurons between sections;
  - the illustrations in empty states (`src/components/ui/Engraving.tsx`).
- **Motion.** Figures "set" digit by digit and rules draw in on the first screen only. After that:
  - Settling an entry drops the PAID stamp onto it with a little spring, and in "Coming due" the row then folds away.
  - Changing month, the big figures count to their new values and the page turns from its spine.
  - On touch screens, you can swipe an entry right to settle it, or left to skip it.
  - Pages cross-fade quickly, with no repeated fade-ups.

  Everything respects `prefers-reduced-motion`.

## Run it

Requires Node.js 20+.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build
```

### Deploying (Netlify)

Live at **https://billwiseledger.com**. It's also served at https://billwiseledger.netlify.app, and `www` redirects to
the apex domain. The project is linked to the Netlify project `billwiseledger` (`.netlify/state.json`, not committed).

```bash
npm run deploy     # build → verify the CSP covers every inline script → netlify deploy --prod
```

This needs the Netlify CLI (`npm install -g netlify-cli`) and a one-time `netlify login`.

- **`netlify.toml`** sets the security headers and caching:
  - A strict Content-Security-Policy that allows the single inline theme script by hash.
  - `X-Frame-Options`, `Referrer-Policy` and `Permissions-Policy`.
  - Immutable caching for hashed `/assets/*`, and 30 days for `/fonts/*`.

  If you edit the inline script in `index.html`, `scripts/check-csp.mjs` fails the deploy and prints the new hash
  to put in `netlify.toml`.
- **`.env.production`** sets `VITE_SITE_URL=https://billwiseledger.com` for the absolute social-share URLs.
- **`public/404.html` and `404.js`** send mistyped paths such as `/bills` or `/Calendar/` to the matching screen.
- **DNS** is at GoDaddy: an `A` record for `@` → `75.2.60.5`, and a `CNAME` for `www` →
  `billwiseledger.netlify.app`. Netlify issues and renews the HTTPS certificate automatically.

### Maintenance scripts

| Script | What it does |
|---|---|
| `npm run fonts` | Rebuilds `public/fonts` from the Fontsource sources. Subsets them to Latin-1 plus typographic punctuation and limits each font's weight range. |
| `npm run brand` | Renders the app icons and the 1200×630 share image from `scripts/brand/*.html` with your local Chrome. |
| `npm run review` | With `npm run dev` running, renders `review/*.png`: the app framed at desktop and phone sizes, each with the sample month held in memory. Example: `npm run review -- "dashboard:light:1440:1200,bills:dark:390:844:add" name` |

Set `CHROME_PATH` if Chrome isn't found automatically.

Dev-only URL switches (stripped from production builds):

- `?static` shows every animation in its final state.
- `?demo` loads the sample month in memory, and your stored data is not touched. `?demo=empty` shows the first-visit screen.
- `&theme=light|dark` picks the edition.

## Stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · Motion · date-fns · lucide-react (category picker only)

## Project layout

```
src/
  lib/          pure logic: types, recurrence engine (dates.ts), totals & agenda (engine.ts), budget (budget.ts),
                storage + validation, sample data, CSV/JSON export, font loading, motion constants
  state/        store (reducer + persistence + cross-tab sync), toasts, UI state, actions with undo
  hooks/        today (rolls over at midnight), routing, theme, notifications, media queries
  components/   LedgerRow, sheets (bill editor, budget editor, entry details), charts, masthead/tab bar, UI primitives
  pages/        Dashboard (Overview), Bills, Budget, Calendar, Settings, Welcome
scripts/        font subsetting, brand rendering, review boards
```

### How the numbers work

- **Bills and occurrences.** A bill is a schedule: amount, frequency, first due date and an optional end date. An
  occurrence is one due date of that bill. Occurrences are derived, never stored, so editing a bill updates every
  month instantly.
- **Payments.** A payment settles one occurrence (`billId + dueDate`) and records the actual amount and date paid.
- **Monthly total.** Settled amounts plus the expected amounts still open, for occurrences due that month.
- **Due dates.** Each is computed from the anchor (`start + n × period`). A bill due on the 31st lands on 28 February
  and returns to the 31st in March without drifting.
- **Autopay.** Autopay bills are settled on their due date. If you reopen one afterwards, that choice sticks.
- **Skips.** A skip marks one occurrence (`billId + dueDate`) as set aside. A skipped entry isn't counted in the
  month's total, outstanding or settled figures, the category breakdown, the trend, "Coming due" or reminders. It is
  reported on its own, as "Skipped · n not counted". An entry is paid, skipped or open, never two at once:
  paying a skipped entry clears the skip, and autopay never settles a skipped one.
- **Budget.** Left over = income − bills − set-asides, for the month in view.
  - *Bills* is the same monthly total the Overview shows, so skipped entries are left out.
  - *Income* counts the paydays that land in the month. A recurring source's pattern runs backwards and forwards
    from the payday you enter, so a biweekly paycheck brings in two paydays most months and three in two months of
    the year.
  - *Set-asides* are flat monthly amounts.
  - A *typical month* adds up each running bill's monthly equivalent. That's how the page spots a month made heavy
    by a quarterly or yearly bill.

## Quality notes

Lighthouse 12, production build, first visit (median of 3 mobile runs):

| Profile | Performance | Accessibility | Best practices | SEO | First paint | Main content (LCP) | Layout shift |
|---|---|---|---|---|---|---|---|
| Mobile (simulated slow 4G) | 97 | 100 | 100 | 100 | 1.8 s | 2.3 s | 0 |
| Desktop | 100 | 100 | 100 | 100 | 0.4 s | 0.6 s | 0 |

- **Fonts.** The three faces are self-hosted, subset, and registered after first paint (`src/lib/fonts.ts`). Until
  they arrive, text sets in metric-matched fallbacks, so nothing reflows when they swap in (layout shift is 0).
  The mobile LCP is when the headline repaints in Fraunces. That's the cost of the display typography, about 125 KB
  of variable fonts. Switching the fonts to `font-display: optional` would bring LCP to about 2 s, but first-time
  visitors would then see the fallback faces.
- **Code splitting.** Only the two possible first screens (Welcome and Overview) are in the main bundle. Bills,
  Budget, Calendar and Settings load on demand and prefetch when the browser is idle.
- **Accessibility.**
  - Controls are labelled, focus is visible, dialogs trap focus, and touch targets are 44px.
  - Status is never shown by color alone, and the chart legends double as data tables.
  - The calendar supports arrow-key navigation, and every swipe action has a tick-box equivalent.
