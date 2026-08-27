import type { Deck, Millis, MilestoneType } from '@itera/core'

export interface MobileProgressMetricViewModel {
  id: 'learned' | 'due' | 'reviews' | 'retention' | 'streak'
  label: string
  value: string
  supportingText: string
}

export interface MobileProgressActivityDay {
  id: string
  /** The local calendar date this cell is, which decides the column it lands in. */
  date: Millis
  /** "Today" / "Yesterday" / "Aug 12" - what a cell says when it is read aloud. */
  dateLabel: string
  level: 0 | 1 | 2 | 3 | 4
  count: number
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
  /** The dates the whole page is computed over, e.g. "Aug 24 - Sep 23, 2026". */
  rangeLabel: string
  /** What the KPI block is a summary of, e.g. "Last 30 days". */
  metricsHeading: string
  metrics: MobileProgressMetricViewModel[]
  activityDays: MobileProgressActivityDay[]
  retentionPercent: number | null
  /** Null buckets are real gaps and must never be joined by a line. */
  retentionSeries: (number | null)[]
  retentionLabels: [string, string, string]
  decks: MobileProgressDeckViewModel[]
  milestones: MobileProgressMilestoneViewModel[]
}
