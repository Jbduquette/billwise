import { motion } from 'motion/react'
import { useState } from 'react'
import { Button } from '../components/ui/Button'
import { Engraving } from '../components/ui/Engraving'
import { EASE_OUT, intro } from '../lib/motion'
import { buildSampleData } from '../lib/sample'
import { useStore } from '../state/store'
import { useToast } from '../state/toast'
import { useUI } from '../state/ui'

const ARTICLES = [
  { no: 'i.', title: 'What you owe', body: 'One figure for the month, set large, with what is settled and what remains.' },
  { no: 'ii.', title: 'What falls due', body: 'Late entries first, then the coming week, then everything after.' },
  { no: 'iii.', title: 'Where it goes', body: 'Your month by category, and the last six months side by side.' },
  { no: 'iv.', title: 'Kept private', body: 'Everything stays in this browser. No account, no server, no tracking.' },
]

export function Welcome() {
  const { data, dispatch } = useStore()
  const { openEditor, today } = useUI()
  const toast = useToast()
  const [drawIn] = useState(() => !intro.done)

  return (
    <div className="pt-6 lg:pt-12">
      <section className="grid items-center gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        {/* The headline paints immediately (it is the page's largest element); the rest follows. */}
        <div className="order-2 lg:order-1">
          <p className="sc">Billwise — a private ledger</p>
          <h1 className="mt-4 font-serif text-[2.9rem] leading-[0.98] font-[350] tracking-[-0.035em] text-balance text-ink sm:text-[4rem] lg:text-[4.75rem]">
            Every bill, <em className="font-[300] text-verm">set in order.</em>
          </h1>
          <p className="mt-5 max-w-xl font-serif text-[1.25rem] leading-[1.45] font-[350] text-ink-2 italic">
            Enter your bills once. Each month, Billwise tells you what's owed, what's due, and what's settled.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
            <Button variant="primary" size="lg" onClick={() => openEditor(null)} className="sm:px-7">
              Begin your ledger
            </Button>
            <button
              type="button"
              onClick={() => {
                dispatch({ type: 'replace', data: buildSampleData(today, data.settings) })
                toast('A sample month is loaded. Clear it any time in Settings.', { tone: 'info' })
              }}
              className="min-h-11 text-[15px] text-ink underline decoration-rule-strong underline-offset-[6px] hover:decoration-ink"
            >
              or browse a sample month →
            </button>
          </div>
          <p className="sc mt-8">Kept privately in this browser · No account</p>
        </div>

        <motion.div
          className="order-1 lg:order-2"
          initial={drawIn ? { opacity: 0, y: 12 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.1 }}
        >
          <Engraving kind="letters" className="mx-auto w-full max-w-[22rem] lg:max-w-[34rem]" title="Engraving of sealed letters and a pen" />
        </motion.div>
      </section>

      <section aria-label="In this ledger" className="mt-14 lg:mt-20">
        <div className="rule-double mb-6" />
        <ol className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
          {ARTICLES.map((a, i) => (
            <motion.li
              key={a.title}
              initial={drawIn ? { opacity: 0 } : false}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: drawIn ? 0.35 + i * 0.08 : 0 }}
              className="lg:border-l lg:border-rule lg:pl-6 lg:first:border-l-0 lg:first:pl-0"
            >
              <span className="font-serif text-[15px] text-verm italic">{a.no}</span>
              <h2 className="mt-1 font-serif text-[1.3125rem] text-ink">{a.title}</h2>
              <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{a.body}</p>
            </motion.li>
          ))}
        </ol>
      </section>
    </div>
  )
}
