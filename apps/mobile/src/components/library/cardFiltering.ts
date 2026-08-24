import type { MobileCardStatus } from '@/src/types/library'

// The deck card list's status filter, as data and one predicate.
//
// A deliberate subset of web's card toolbar. Web offers search, an interaction
// type filter, a status filter with six values and five sort keys; the mobile
// deck screen was designed with one search field and one filter control, and
// this milestone honours that simplification rather than porting the desktop
// toolbar onto a phone. Every option here does real filtering.

export type CardStatusFilter = 'all' | MobileCardStatus

export const CARD_STATUS_OPTIONS: { value: CardStatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'New', label: 'New' },
  { value: 'Learning', label: 'Learning' },
  { value: 'Review', label: 'Review' },
]

export function cardStatusMatches(status: MobileCardStatus, filter: CardStatusFilter): boolean {
  return filter === 'all' || status === filter
}
