import type { DashboardMessage, Deck } from '@itera/core'

export interface MobileTodayDeckViewModel {
  id: Deck['id']
  name: Deck['name']
  description: NonNullable<Deck['description']>
  dueCount: number
  progressPercent: number
}

export interface MobileTodayViewModel {
  greeting: DashboardMessage
  dueToday: number
  streak: number
  retention: number | null
  estimatedMinutes: number
  decks: MobileTodayDeckViewModel[]
}
