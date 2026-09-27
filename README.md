# Billwise

A private ledger for your bills. Add your bills once and Billwise shows:

- **How much you owe each month**, set large, with what's settled and what remains
- **What falls due**: late entries first, then your "due soon" window (3–14 days), then later
- **What you've already paid**, including custom amounts and payment dates for variable bills
- **What's still open**, as a month of entries you can filter by status, category and search

It also has recurring schedules (weekly through yearly, plus one-time), autopay, a calendar, spending by category,
a six-month trend, daily browser reminders, JSON backup/restore and CSV export.

All data stays in the browser's `localStorage`. There is no server, no account and no tracking.

## Design: the Editorial Ledger

- **Two editions.** Paper (light) and Ink (dark), switchable in Settings. The default follows the device setting.
- **Four colors.** Paper, ink, vermilion (late or needing attention) and olive (settled). Categories carry no color.
  Every text pair meets WCAG AA (4.5:1) and every control boundary meets 3:1 in both editions.
- **Type.** Fraunces, a variable serif with an optical-size axis, for headlines and figures. Instrument Sans for
  interface text. Numbers use lining, tabular figures.
- **Status is typographic.** Settled entries are struck through with a pen-stroke, late entries are set in
  vermilion, and status is always spelled out in words as well.
- **Imagery.** Engraving-style line art (`src/components/ui/Engraving.tsx`) is drawn in the current ink color, so it
  suits both editions.
- **Motion.** Figures "set" digit by digit and rules draw in on the first screen only. After that:
  - Settling an entry draws a stroke through it, then the row folds away.
  - On touch screens, you can swipe an entry right to settle it.
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

`dist/` is a static site with hash routing and relative asset paths, so you can host it anywhere: Netlify, Vercel,
GitHub Pages, S3 or a sub-folder.

Before deploying, set `VITE_SITE_URL` in `.env` (e.g. `VITE_SITE_URL=https://billwise.app`) so the social-share tags
(`og:image`, `og:url`, `twitter:image`) become the absolute URLs that link-preview crawlers require.

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
  lib/          pure logic: types, recurrence engine (dates.ts), totals & agenda (engine.ts),
                storage + validation, sample data, CSV/JSON export, font loading, motion constants
  state/        store (reducer + persistence + cross-tab sync), toasts, UI state, actions with undo
  hooks/        today (rolls over at midnight), routing, theme, notifications, media queries
  components/   LedgerRow, sheets (bill editor, entry details), charts, masthead/tab bar, UI primitives
  pages/        Dashboard (Overview), Bills, Calendar, Settings, Welcome
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

## Quality notes

Lighthouse 12, production build, first visit (median of 3 mobile runs):

| Profile | Performance | Accessibility | Best practices | SEO | First paint | Main content (LCP) | Layout shift |
|---|---|---|---|---|---|---|---|
| Mobile (simulated slow 4G) | 94 | 100 | 100 | 100 | 1.8 s | 2.9 s | 0 |
| Desktop | 100 | 100 | 100 | 100 | 0.4 s | 0.6 s | 0 |

- **Fonts.** The three faces are self-hosted, subset, and registered after first paint (`src/lib/fonts.ts`). Until
  they arrive, text sets in metric-matched fallbacks, so nothing reflows when they swap in (layout shift is 0).
  The mobile LCP is when the headline repaints in Fraunces. That's the cost of the display typography, about 125 KB
  of variable fonts. Switching the fonts to `font-display: optional` would bring LCP to about 2 s, but first-time
  visitors would then see the fallback faces.
- **Code splitting.** Only the two possible first screens (Welcome and Overview) are in the main bundle. Bills,
  Calendar and Settings load on demand and prefetch when the browser is idle.
- **Accessibility.**
  - Controls are labelled, focus is visible, dialogs trap focus, and touch targets are 44px.
  - Status is never shown by color alone, and the chart legends double as data tables.
  - The calendar supports arrow-key navigation, and every swipe action has a tick-box equivalent.
