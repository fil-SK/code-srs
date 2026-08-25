import {
  buildCardDeckMap,
  buildContinueLearning,
  buildRange,
  calendarDaysBetween,
  computeDeckMetrics,
  computeDeckPerformance,
  computeHeatmap,
  computeKpis,
  computeRetentionSeries,
  computeStreak,
  deriveMilestones,
  estimateSessionMinutes,
  formatDayCount,
  formatEventDate,
  formatRangeLabel,
  type DashboardMessage,
  type DateRangePreset,
  type DeckMetrics,
  type ID,
  type Millis,
  markLabelFor,
  metricsFor,
  stripInlineMarkers,
} from '@itera/core'

import type {
  MobileCollectionViewModel,
  MobileDeckViewModel,
  MobileLibraryCollectionViewModel,
  MobileLibraryDeckViewModel,
  MobileLibraryViewModel,
} from '@/src/types/library'
import type { MobileNotificationsViewModel } from '@/src/types/notifications'
import type { MobileProgressViewModel } from '@/src/types/progress'
import type { MobileTodayViewModel } from '@/src/types/today'
import { demoTodayRetention } from './demoReviewHistory'
import { demoCardStatus, isDemoCardDue } from './demoScheduling'
import {
  DEMO_INTERACTION_LABELS,
  DEMO_SCOPE_RAIL,
  type DemoCard,
  type DemoDeck,
  type DemoWorkspace,
} from './demoWorkspace'

// Everything the demo screens read, derived from one workspace.
//
// Pure functions over a workspace value, with no React and no navigation, so a
// route file stays a thin binding and the resolution rules are unit-testable.
// That matters more than usual here: test files may not live under app/,
// because Expo Router's require.context would pull them into the bundle
// (itera-decisions D356), so any logic worth proving has to live in src/.
//
// Deck numbers are derived from the demo card list rather than authored per
// screen. That is the whole point of the layer: Today, Library, the Deck screen
// and Progress can no longer disagree about how many cards a deck has.

export type DemoScopeId = ID | 'all' | 'unfiled'

/**
 * Per-deck metrics in core's own `DeckMetrics` shape, so the shared
 * `sortDecks` can consume them unchanged.
 *
 * `masteryFraction` follows core's definition - the share of cards that have
 * reached the matured "review" state - rather than inventing a second notion of
 * progress for this platform.
 */
export function demoDeckMetrics(workspace: DemoWorkspace, now: Millis): Map<ID, DeckMetrics> {
  return computeDeckMetrics(
    workspace.cards,
    workspace.cards.filter((card) => isDemoCardDue(card, now)),
  )
}

function demoLastStudiedLabel(lastStudied: Millis | undefined, now: Millis): string {
  if (lastStudied === undefined) return 'Never'
  const days = calendarDaysBetween(lastStudied, now)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}

export function findDemoDeck(workspace: DemoWorkspace, deckId: string | undefined): DemoDeck | null {
  if (!deckId) return null
  return workspace.decks.find((deck) => deck.id === deckId) ?? null
}

export function demoDeckCards(workspace: DemoWorkspace, deckId: ID): DemoCard[] {
  return workspace.cards.filter((card) => card.deckId === deckId)
}

export interface DemoScope {
  id: DemoScopeId
  name: string
  description: string
  decks: DemoDeck[]
}

/**
 * Resolves a Library scope by lookup: the two synthetic scopes, or a real
 * collection. An unknown id resolves to `null` so the route can render an
 * honest not-found state instead of quietly showing some other collection.
 */
export function resolveDemoScope(
  workspace: DemoWorkspace,
  scopeId: string | undefined,
): DemoScope | null {
  if (!scopeId) return null

  if (scopeId === 'all') {
    return {
      id: 'all',
      name: 'All Decks',
      description: 'View and manage all your decks.',
      decks: [...workspace.decks],
    }
  }

  if (scopeId === 'unfiled') {
    return {
      id: 'unfiled',
      name: 'Unfiled',
      description: 'Decks that do not belong to a collection yet.',
      decks: workspace.decks.filter((deck) => deck.collectionId === null),
    }
  }

  const collection = workspace.collections.find((entry) => entry.id === scopeId)
  if (!collection) return null

  return {
    id: collection.id,
    name: collection.name,
    description: collection.description,
    decks: workspace.decks.filter((deck) => deck.collectionId === collection.id),
  }
}

/** The name shown on a deck's back button - its collection, or Unfiled. */
export function demoCollectionNameFor(workspace: DemoWorkspace, deck: DemoDeck): string {
  if (deck.collectionId === null) return 'Unfiled'
  return workspace.collections.find((entry) => entry.id === deck.collectionId)?.name ?? 'Unfiled'
}

export function toLibraryDeckViewModel(
  deck: DemoDeck,
  metrics: Map<ID, DeckMetrics>,
  now: Millis,
): MobileLibraryDeckViewModel {
  const deckMetrics = metricsFor(metrics, deck.id)
  return {
    id: deck.id,
    name: deck.name,
    description: deck.description,
    cardCount: deckMetrics.cardCount,
    dueCount: deckMetrics.dueCount,
    progressPercent: Math.round(deckMetrics.masteryFraction * 100),
    lastStudiedLabel: demoLastStudiedLabel(deckMetrics.lastStudied, now),
    lastStudiedAt: deckMetrics.lastStudied,
  }
}

/** The scope rail: the designed order, every entry resolved from the workspace. */
export function demoScopeRail(workspace: DemoWorkspace): MobileLibraryCollectionViewModel[] {
  const rail: MobileLibraryCollectionViewModel[] = []

  for (const scopeId of DEMO_SCOPE_RAIL) {
    if (scopeId === 'all') {
      rail.push({ id: 'all', name: 'All Decks', kind: 'all' })
      continue
    }
    if (scopeId === 'unfiled') {
      rail.push({ id: 'unfiled', name: 'Unfiled', kind: 'unfiled' })
      continue
    }
    const collection = workspace.collections.find((entry) => entry.id === scopeId)
    if (collection) rail.push({ id: collection.id, name: collection.name, kind: 'collection' })
  }

  return rail
}

export function demoLibraryViewModel(workspace: DemoWorkspace, now: Millis): MobileLibraryViewModel {
  const metrics = demoDeckMetrics(workspace, now)
  return {
    collections: demoScopeRail(workspace),
    decks: workspace.decks.map((deck) => toLibraryDeckViewModel(deck, metrics, now)),
  }
}

export function demoCollectionViewModel(
  workspace: DemoWorkspace,
  scopeId: string | undefined,
  now: Millis,
): MobileCollectionViewModel | null {
  const scope = resolveDemoScope(workspace, scopeId)
  if (!scope) return null

  const metrics = demoDeckMetrics(workspace, now)
  const decks = scope.decks.map((deck) => toLibraryDeckViewModel(deck, metrics, now))

  return {
    id: scope.id,
    name: scope.name,
    description: scope.description,
    deckCount: decks.length,
    cardCount: decks.reduce((total, deck) => total + deck.cardCount, 0),
    dueToday: decks.reduce((total, deck) => total + deck.dueCount, 0),
    decks,
  }
}

export function demoDeckViewModel(
  workspace: DemoWorkspace,
  deckId: string | undefined,
  now: Millis,
): MobileDeckViewModel | null {
  const deck = findDemoDeck(workspace, deckId)
  if (!deck) return null

  const deckMetrics = metricsFor(demoDeckMetrics(workspace, now), deck.id)

  return {
    id: deck.id,
    collectionName: demoCollectionNameFor(workspace, deck),
    name: deck.name,
    description: deck.description,
    cardCount: deckMetrics.cardCount,
    dueCount: deckMetrics.dueCount,
    masteryPercent: Math.round(deckMetrics.masteryFraction * 100),
    lastStudiedLabel: demoLastStudiedLabel(deckMetrics.lastStudied, now),
    cards: demoDeckCards(workspace, deck.id).map((card) => ({
      id: card.id,
      // The card list is one line of plain text, so the shared flattening is
      // what turns authored markers into a readable label. It is presentation,
      // never sanitisation - see core's plainText.ts.
      prompt: stripInlineMarkers(card.prompt.value),
      interactionType: card.interaction.type,
      interactionLabel: DEMO_INTERACTION_LABELS[card.interaction.type],
      tag: card.tag,
      status: demoCardStatus(card),
    })),
  }
}

/**
 * The greeting is a parameter rather than something this picks, for two
 * reasons: `pickDashboardMessage` is random, so calling it here would make an
 * otherwise deterministic selector non-deterministic, and the workspace value
 * changes whenever a notification is marked read - which would have re-rolled
 * Today's greeting as a side effect of opening the inbox.
 */
export function demoTodayViewModel(
  workspace: DemoWorkspace,
  greeting: DashboardMessage,
  now: Millis,
): MobileTodayViewModel {
  const metrics = demoDeckMetrics(workspace, now)
  const dueCards = workspace.cards.filter((card) => isDemoCardDue(card, now))
  const dueToday = dueCards.length
  const streak = computeStreak(workspace.reviewLogs, now)
  const retention = demoTodayRetention(workspace.reviewLogs, now)

  const decks = buildContinueLearning(workspace.decks, metrics, workspace.decks.length)
    .filter((row) => metricsFor(metrics, row.deckId).cardCount > 0)
    .slice(0, 4)
    .map((row) => {
      return {
        id: row.deckId,
        name: row.name,
        description: row.description ?? '',
        dueCount: row.dueCount,
        progressPercent: Math.round(row.masteryFraction * 100),
      }
    })

  return {
    greeting,
    dueToday,
    streak: streak.current,
    retention: retention === null ? null : Math.round(retention * 100),
    estimatedMinutes: estimateSessionMinutes(workspace.reviewLogs, dueToday),
    decks,
  }
}

export function demoProgressViewModel(
  workspace: DemoWorkspace,
  now: Millis,
  preset: DateRangePreset = '30d',
): MobileProgressViewModel {
  const dueCards = workspace.cards.filter((card) => isDemoCardDue(card, now))
  const range = buildRange(preset, now)
  const kpis = computeKpis(workspace.cards, dueCards, workspace.reviewLogs, range, now)
  const heatmap = computeHeatmap(workspace.reviewLogs, range.days, now)
  const retentionPoints = computeRetentionSeries(
    workspace.reviewLogs,
    range,
    buildCardDeckMap(workspace.cards),
    undefined,
    range.days,
  )
  const performance = computeDeckPerformance(
    workspace.reviewLogs,
    workspace.cards,
    dueCards,
    workspace.decks,
    range,
  )
  const deckById = new Map(workspace.decks.map((deck) => [deck.id, deck]))

  return {
    rangeLabel: formatRangeLabel(range),
    metrics: [
      {
        id: 'learned',
        label: 'Learned',
        value: String(kpis.learned.value),
        supportingText: `${kpis.learned.value} of ${kpis.learned.total} active`,
      },
      { id: 'due', label: 'Due', value: String(kpis.due), supportingText: 'Ready today' },
      {
        id: 'reviews',
        label: 'Reviews',
        value: String(kpis.reviews.value),
        supportingText: 'This period',
      },
      {
        id: 'retention',
        label: 'Retention',
        value: kpis.retention.value === null ? '—' : `${Math.round(kpis.retention.value * 100)}%`,
        supportingText: 'Mature reviews',
      },
      {
        id: 'streak',
        label: 'Current streak',
        value: formatDayCount(kpis.streak),
        supportingText: `Best: ${formatDayCount(kpis.bestStreak)}`,
      },
    ],
    activityDays: heatmap.map((day) => ({ id: String(day.date), level: day.level, count: day.count })),
    retentionPercent: kpis.retention.value === null ? null : Math.round(kpis.retention.value * 100),
    retentionSeries: retentionPoints.map((point) => point.retention),
    retentionLabels: [
      formatEventDate(retentionPoints[0]?.bucketStart ?? range.from, now),
      formatEventDate(retentionPoints[Math.floor(retentionPoints.length / 2)]?.bucketStart ?? range.from, now),
      formatEventDate(retentionPoints.at(-1)?.bucketStart ?? range.from, now),
    ],
    decks: performance.map((row) => {
      const deck = deckById.get(row.deckId)
      if (!deck) throw new Error(`Demo deck performance references missing deck ${row.deckId}`)
      return {
        id: deck.id,
        name: deck.name,
        mark: markLabelFor(deck.name, 2),
        retentionLabel:
          row.retention === null
            ? 'Not enough data'
            : `${Math.round(row.retention * 100)}% retention`,
        retentionKnown: row.retention !== null,
        dueLabel: `${row.due} due`,
      }
    }),
    milestones: deriveMilestones(workspace.reviewLogs).map((milestone) => ({
      id: `${milestone.type}-${milestone.threshold}-${milestone.date}`,
      type: milestone.type,
      title: milestone.title,
      subtitle: milestone.subtitle,
      dateLabel: formatEventDate(milestone.date, now),
    })),
  }
}

export function demoNotificationsViewModel(
  workspace: DemoWorkspace,
): MobileNotificationsViewModel {
  return {
    title: 'Notifications',
    subtitle: 'Updates about your study progress and sessions.',
    items: workspace.notifications.map((item) => ({ ...item })),
  }
}

export function demoUnreadCount(workspace: DemoWorkspace): number {
  return workspace.notifications.filter((item) => item.unread).length
}
