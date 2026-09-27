import { category } from './categories'
import { frequencyMeta, nextDueDate } from './dates'
import { monthlyEquivalent } from './engine'
import type { AppData } from './types'

function csvCell(v: string | number | boolean | null | undefined): string {
  const s = v == null ? '' : String(v)
  // Neutralize spreadsheet formula injection and quote when needed.
  const safe = /^[=+\-@\t\r]/.test(s) && !/^-?\d/.test(s) ? `'${s}` : s
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

const toCsv = (rows: (string | number | boolean | null | undefined)[][]) =>
  rows.map((r) => r.map(csvCell).join(',')).join('\r\n')

export function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const stamp = (today: string) => today

export function exportJson(data: AppData, today: string) {
  download(`billwise-backup-${stamp(today)}.json`, JSON.stringify({ ...data, exportedAt: new Date().toISOString() }, null, 2), 'application/json')
}

export function exportBillsCsv(data: AppData, today: string) {
  const rows = [
    ['Name', 'Category', 'Amount', 'Frequency', 'Monthly equivalent', 'First due', 'Ends', 'Next due', 'Autopay', 'Notes'],
    ...data.bills.map((b) => [
      b.name,
      category(b.category).label,
      b.amount.toFixed(2),
      frequencyMeta(b.frequency).label,
      monthlyEquivalent(b).toFixed(2),
      b.startDate,
      b.endDate ?? '',
      nextDueDate(b, today) ?? '',
      b.autopay ? 'Yes' : 'No',
      b.notes,
    ]),
  ]
  download(`billwise-bills-${stamp(today)}.csv`, '﻿' + toCsv(rows), 'text/csv;charset=utf-8')
}

export function exportPaymentsCsv(data: AppData, today: string) {
  const names = new Map(data.bills.map((b) => [b.id, b]))
  const rows = [
    ['Bill', 'Category', 'Due date', 'Paid on', 'Amount', 'Method'],
    ...[...data.payments]
      .sort((a, b) => b.dueDate.localeCompare(a.dueDate))
      .map((p) => {
        const bill = names.get(p.billId)
        return [
          bill?.name ?? 'Deleted bill',
          bill ? category(bill.category).label : '',
          p.dueDate,
          p.paidOn,
          p.amount.toFixed(2),
          p.auto ? 'Autopay' : 'Manual',
        ]
      }),
  ]
  download(`billwise-payments-${stamp(today)}.csv`, '﻿' + toCsv(rows), 'text/csv;charset=utf-8')
}
