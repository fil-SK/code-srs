import type { Deck, MilestoneType } from '@itera/core'

export interface MobileProgressMetricViewModel {
  id: 'learned' | 'due' | 'reviews' | 'retention' | 'streak'
  label: string
  value: string
  supportingText: string
}

export interface MobileProgressActivityDay {
  id: string
  level: 0 | 1 | 2 | 3 | 4
}

export interface MobileProgressDeckViewModel {
  id: Deck['id']
  name: Deck['name']
  mark: string
  retentionLabel: string
  /**
   * Whether `retentionLabel` carries a real figure. The screen used to decide
   * that by testing whether the label started with '89', which broke the moment
   * any other deck reached that number.
   */
  retentionKnown: boolean
  dueLabel: string
}

export interface MobileProgressMilestoneViewModel {
  id: string
  type: MilestoneType
  title: string
  subtitle: string
  dateLabel: string
}

export interface MobileProgressViewModel {
  rangeLabel: string
  metrics: MobileProgressMetricViewModel[]
  activityDays: MobileProgressActivityDay[]
  retentionPercent: number
  retentionSeries: number[]
  decks: MobileProgressDeckViewModel[]
  milestones: MobileProgressMilestoneViewModel[]
}
