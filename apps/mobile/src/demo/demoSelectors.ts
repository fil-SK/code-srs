import {
  buildCardDeckMap,
  buildContinueLearning,
  buildRange,
  calendarDaysBetween,
  childDeckCount,
  collectionIdFor,
  computeDeckMetrics,
  computeDeckPerformance,
  computeHeatmap,
  computeKpis,
  computeRetentionSeries,
  computeStreak,
  deriveCollections,
  deriveMilestones,
  estimateSessionMinutes,
  formatDayCount,
  formatEventDate,
  formatRangeLabel,
  leafDecks,
  type Card,
  type DashboardMessage,
  type DateRangePreset,
  type Deck,
  type DeckMetrics,
  type ID,
  type LibraryCollection,
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
import type { DemoEntities } from './demoEntities'
import { demoCardStatus, isDemoCardDue } from './demoScheduling'
import {
  DEMO_COLLECTION_RAIL,
  DEMO_INTERACTION_LABELS,
  type DemoNotification,
} from './demoWorkspace'

// Everything the demo screens read, derived from the canonical entities.
//
// Pure functions over an entity value, with no React and no navigation, so a
// route file stays a thin binding and the resolution rules are unit-testable.
// That matters more than usual here: test files may not live under app/,
// because Expo Router's require.context would pull them into the bundle
// (itera-decisions D356), so any logic worth proving has to live in src/.
//
// Deck numbers are derived from the demo card list rather than authored per
// screen. That is the whole point of the layer: Today, Library, the Deck screen
// and Progress can no longer disagree about how many cards a deck has.
//
// The entities arrive as a plain `DemoEntities` value read through the shared
// hooks (see demoEntities.ts), so these stay pure functions with no React and
// no repository of their own. Collections are *derived* here through core's
// `collectionTree` - there is no collection field on a deck to read.

export type DemoScopeId = ID | 'all' | 'unfiled'

/**
 * Per-deck metrics in core's own `DeckMetrics` shape, so the shared
 * `sortDecks` can consume them unchanged.
 *
 * `masteryFraction` follows core's definition - the share of cards that have
 * reached the matured "review" state - rather than inventing a second notion of
 * progress for this platform.
 */
export function demoDeckMetrics(entities: DemoEntities, now: Millis): Map<ID, DeckMetrics> {
  return computeDeckMetrics(
    entities.cards,
    entities.cards.filter((card) => isDemoCardDue(card, now)),
  )
}

function demoLastStudiedLabel(lastStudied: Millis | undefined, now: Millis): string {
  if (lastStudied === undefined) return 'Never'
  const days = calendarDaysBetween(lastStudied, now)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}

export function findDemoDeck(entities: DemoEntities, deckId: string | undefined): Deck | null {
  if (!deckId) return null
  return entities.decks.find((deck) => deck.id === deckId) ?? null
}

export function demoDeckCards(entities: DemoEntities, deckId: ID): Card[] {
  return entities.cards.filter((card) => card.deckId === deckId)
}

/**
 * One card, by its canonical id.
 *
 * The card study route resolves through this rather than branching on an id,
 * for the same reason the deck route does: a lookup that cannot find its
 * subject returns `null` and the route says so, where a factory that ignored
 * its parameter would show some other card with no sign anything was wrong.
 */
export function findDemoCard(entities: DemoEntities, cardId: string | undefined): Card | null {
  if (!cardId) return null
  return entities.cards.find((card) => card.id === cardId) ?? null
}

/**
 * The collections this workspace has, derived from the deck tree.
 *
 * Core's rule, called not copied: a Collection is any deck with at least one
 * child deck, and its id *is* that deck's id. Nothing on a deck says which
 * collection it belongs to, which is the property that makes a deck authored
 * later with a parentId appear in the right place with no second field to set.
 */
export function demoCollections(entities: DemoEntities): LibraryCollection[] {
  return deriveCollections(entities.decks)
}

/**
 * The browsable decks: the leaves of the tree.
 *
 * A collection deck is not a Library row - it is the scope the rows sit in - so
 * All Decks and every collection scope list leaves only. The same split web
 * makes, through the same helper.
 */
export function demoLeafDecks(entities: DemoEntities): Deck[] {
  return leafDecks(entities.decks)
}

/** A collection's own deck record, for the name and description it carries. */
function collectionDeck(entities: DemoEntities, collectionId: ID): Deck | undefined {
  return entities.decks.find((deck) => deck.id === collectionId)
}

export interface DemoScope {
  id: DemoScopeId
  name: string
  description: string
  decks: Deck[]
}

/**
 * Resolves a Library scope by lookup: the two synthetic scopes, or a real
 * collection. An unknown id resolves to `null` so the route can render an
 * honest not-found state instead of quietly showing some other collection.
 */
export function resolveDemoScope(
  entities: DemoEntities,
  scopeId: string | undefined,
): DemoScope | null {
  if (!scopeId) return null

  if (scopeId === 'all') {
    return {
      id: 'all',
      name: 'All Decks',
      description: 'View and manage all your decks.',
      decks: demoLeafDecks(entities),
    }
  }

  if (scopeId === 'unfiled') {
    return {
      id: 'unfiled',
      name: 'Unfiled',
      description: 'Decks that do not belong to a collection yet.',
      // A leaf deck with no parent. Unfiled is the absence of a parent, which
      // is exactly what web means by it too.
      decks: demoLeafDecks(entities).filter((deck) => deck.parentId === undefined),
    }
  }

  const collections = demoCollections(entities)
  const collection = collections.find((entry) => entry.id === scopeId)
  if (!collection) return null

  const deck = collectionDeck(entities, collection.id)

  return {
    id: collection.id,
    name: collection.name,
    // The description is the collection deck's own, because a collection *is* a
    // deck. There is no second record to read it from.
    description: deck?.description ?? '',
    decks: demoLeafDecks(entities).filter(
      (leaf) => collectionIdFor(leaf, collections) === collection.id,
    ),
  }
}

/** The name shown on a deck's back button - its collection, or Unfiled. */
export function demoCollectionNameFor(entities: DemoEntities, deck: Deck): string {
  const collections = demoCollections(entities)
  const collectionId = collectionIdFor(deck, collections)
  if (collectionId === undefined) return 'Unfiled'
  return collections.find((entry) => entry.id === collectionId)?.name ?? 'Unfiled'
}

export function toLibraryDeckViewModel(
  deck: Deck,
  metrics: Map<ID, DeckMetrics>,
  now: Millis,
): MobileLibraryDeckViewModel {
  const deckMetrics = metricsFor(metrics, deck.id)
  return {
    id: deck.id,
    name: deck.name,
    description: deck.description ?? '',
    cardCount: deckMetrics.cardCount,
    dueCount: deckMetrics.dueCount,
    progressPercent: Math.round(deckMetrics.masteryFraction * 100),
    lastStudiedLabel: demoLastStudiedLabel(deckMetrics.lastStudied, now),
    lastStudiedAt: deckMetrics.lastStudied,
  }
}

/**
 * The scope rail: the designed order first, then anything the deck tree has
 * that the designed order has never heard of.
 *
 * The authored list carries presentation order only. Membership comes from the
 * derived collections, so a collection that stops existing (its last child deck
 * moved or deleted) leaves the rail on its own, and one that comes into
 * existence - a deck authored with a parentId - joins it without this file
 * being edited. That second half is what the rail exists to prove.
 */
export function demoScopeRail(entities: DemoEntities): MobileLibraryCollectionViewModel[] {
  const collections = demoCollections(entities)
  const rail: MobileLibraryCollectionViewModel[] = []
  const placed = new Set<ID>()

  for (const scopeId of DEMO_COLLECTION_RAIL) {
    if (scopeId === 'all') {
      rail.push({ id: 'all', name: 'All Decks', kind: 'all' })
      continue
    }
    if (scopeId === 'unfiled') {
      rail.push({ id: 'unfiled', name: 'Unfiled', kind: 'unfiled' })
      continue
    }
    const collection = collections.find((entry) => entry.id === scopeId)
    if (collection) {
      rail.push({ id: collection.id, name: collection.name, kind: 'collection' })
      placed.add(collection.id)
    }
  }

  for (const collection of collections) {
    if (placed.has(collection.id)) continue
    rail.push({ id: collection.id, name: collection.name, kind: 'collection' })
  }

  return rail
}

export function demoLibraryViewModel(entities: DemoEntities, now: Millis): MobileLibraryViewModel {
  const metrics = demoDeckMetrics(entities, now)
  return {
    collections: demoScopeRail(entities),
    decks: demoLeafDecks(entities).map((deck) => toLibraryDeckViewModel(deck, metrics, now)),
  }
}

export function demoCollectionViewModel(
  entities: DemoEntities,
  scopeId: string | undefined,
  now: Millis,
): MobileCollectionViewModel | null {
  const scope = resolveDemoScope(entities, scopeId)
  if (!scope) return null

  const metrics = demoDeckMetrics(entities, now)
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
  entities: DemoEntities,
  deckId: string | undefined,
  now: Millis,
): MobileDeckViewModel | null {
  const deck = findDemoDeck(entities, deckId)
  if (!deck) return null

  const deckMetrics = metricsFor(demoDeckMetrics(entities, now), deck.id)

  return {
    id: deck.id,
    collectionName: demoCollectionNameFor(entities, deck),
    name: deck.name,
    description: deck.description ?? '',
    cardCount: deckMetrics.cardCount,
    childDeckCount: childDeckCount(entities.decks, deck.id),
    dueCount: deckMetrics.dueCount,
    masteryPercent: Math.round(deckMetrics.masteryFraction * 100),
    lastStudiedLabel: demoLastStudiedLabel(deckMetrics.lastStudied, now),
    cards: demoDeckCards(entities, deck.id).map((card) => ({
      id: card.id,
      // The card list is one line of plain text, so the shared flattening is
      // what turns authored markers into a readable label. It is presentation,
      // never sanitisation - see core's plainText.ts.
      prompt: stripInlineMarkers(card.prompt.value),
      interactionType: card.interaction.type,
      interactionLabel: DEMO_INTERACTION_LABELS[card.interaction.type],
      // The authored tag, where it already lived on the canonical card.
      tag: card.tags[0] ?? '',
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
  entities: DemoEntities,
  greeting: DashboardMessage,
  now: Millis,
): MobileTodayViewModel {
  const metrics = demoDeckMetrics(entities, now)
  const dueCards = entities.cards.filter((card) => isDemoCardDue(card, now))
  const dueToday = dueCards.length
  const streak = computeStreak(entities.reviewLogs, now)
  const retention = demoTodayRetention(entities.reviewLogs, now)

  const decks = buildContinueLearning(entities.decks, metrics, entities.decks.length)
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
    estimatedMinutes: estimateSessionMinutes(entities.reviewLogs, dueToday),
    decks,
  }
}

export function demoProgressViewModel(
  entities: DemoEntities,
  now: Millis,
  preset: DateRangePreset = '30d',
): MobileProgressViewModel {
  const dueCards = entities.cards.filter((card) => isDemoCardDue(card, now))
  const range = buildRange(preset, now)
  const kpis = computeKpis(entities.cards, dueCards, entities.reviewLogs, range, now)
  const heatmap = computeHeatmap(entities.reviewLogs, range.days, now)
  const retentionPoints = computeRetentionSeries(
    entities.reviewLogs,
    range,
    buildCardDeckMap(entities.cards),
    undefined,
    range.days,
  )
  const performance = computeDeckPerformance(
    entities.reviewLogs,
    entities.cards,
    dueCards,
    entities.decks,
    range,
  )
  const deckById = new Map(entities.decks.map((deck) => [deck.id, deck]))

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
    milestones: deriveMilestones(entities.reviewLogs).map((milestone) => ({
      id: `${milestone.type}-${milestone.threshold}-${milestone.date}`,
      type: milestone.type,
      title: milestone.title,
      subtitle: milestone.subtitle,
      dateLabel: formatEventDate(milestone.date, now),
    })),
  }
}

// The inbox takes the notification list directly rather than an entity value:
// notifications are the one demo concept with no Repository store, so they live
// in the demo provider and never travel with the entities (see demoEntities).
export function demoNotificationsViewModel(
  notifications: DemoNotification[],
): MobileNotificationsViewModel {
  return {
    title: 'Notifications',
    subtitle: 'Updates about your study progress and sessions.',
    items: notifications.map((item) => ({ ...item })),
  }
}

export function demoUnreadCount(notifications: DemoNotification[]): number {
  return notifications.filter((item) => item.unread).length
}
