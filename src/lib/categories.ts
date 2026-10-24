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
  /** Used by the category picker. */
  icon: LucideIcon
  /** Its printed ink (a CSS colour), shown as a small mark beside the name, never on its own. */
  ink: string
}

export const CATEGORIES: Category[] = [
  { id: 'housing', label: 'Housing', icon: House, ink: 'var(--cat-housing)' },
  { id: 'transport', label: 'Transport', icon: Car, ink: 'var(--cat-transport)' },
  { id: 'connectivity', label: 'Phone & internet', icon: Wifi, ink: 'var(--cat-connectivity)' },
  { id: 'utilities', label: 'Utilities', icon: Zap, ink: 'var(--cat-utilities)' },
  { id: 'insurance', label: 'Insurance', icon: ShieldCheck, ink: 'var(--cat-insurance)' },
  { id: 'health', label: 'Health', icon: HeartPulse, ink: 'var(--cat-health)' },
  { id: 'subscriptions', label: 'Subscriptions', icon: Clapperboard, ink: 'var(--cat-subscriptions)' },
  { id: 'debt', label: 'Loans & cards', icon: Landmark, ink: 'var(--cat-debt)' },
  { id: 'other', label: 'Other', icon: Receipt, ink: 'var(--cat-other)' },
]

const byId = new Map(CATEGORIES.map((c) => [c.id, c]))

export const category = (id: CategoryId): Category => byId.get(id) ?? CATEGORIES[CATEGORIES.length - 1]

export const isCategoryId = (v: unknown): v is CategoryId => typeof v === 'string' && byId.has(v as CategoryId)
