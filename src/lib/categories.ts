import {
  Car,
  Clapperboard,
  HeartPulse,
  House,
  Landmark,
  Receipt,
  ShieldCheck,
  Wifi,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import type { CategoryId } from './types'

export interface Category {
  id: CategoryId
  label: string
  /** Used by the category picker only; the ledger itself identifies categories by name, not color. */
  icon: LucideIcon
}

export const CATEGORIES: Category[] = [
  { id: 'housing', label: 'Housing', icon: House },
  { id: 'transport', label: 'Transport', icon: Car },
  { id: 'connectivity', label: 'Phone & internet', icon: Wifi },
  { id: 'utilities', label: 'Utilities', icon: Zap },
  { id: 'insurance', label: 'Insurance', icon: ShieldCheck },
  { id: 'health', label: 'Health', icon: HeartPulse },
  { id: 'subscriptions', label: 'Subscriptions', icon: Clapperboard },
  { id: 'debt', label: 'Loans & cards', icon: Landmark },
  { id: 'other', label: 'Other', icon: Receipt },
]

const byId = new Map(CATEGORIES.map((c) => [c.id, c]))

export const category = (id: CategoryId): Category => byId.get(id) ?? CATEGORIES[CATEGORIES.length - 1]

export const isCategoryId = (v: unknown): v is CategoryId => typeof v === 'string' && byId.has(v as CategoryId)
