import type { Card, Deck, ReviewLog } from '@itera/core'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native'
import type { ReactNode } from 'react'

import { DeckFormScreen } from '@/src/components/cards/DeckFormScreen'
import { MultipleChoiceEditorScreen } from '@/src/components/cards/MultipleChoiceEditorScreen'
import { RecallEditorScreen } from '@/src/components/cards/RecallEditorScreen'
import { DemoReviewSession } from '@/src/components/review/DemoReviewSession'
import { DemoWorkspaceProvider } from '@/src/demo/DemoWorkspaceProvider'
import { useDemoEntities, type DemoEntities } from '@/src/demo/demoEntities'
import {
  demoLibraryViewModel,
  demoProgressViewModel,
  demoTodayViewModel,
} from '@/src/demo/demoSelectors'
import { useDemoWorkspace, type DemoWorkspaceValue } from '@/src/demo/demoWorkspaceContext'
import { createTestQueryClient, settleQueries, storedEntities } from '@/src/test/demoHarness'
import { mockReducedMotion } from '@/src/test/reviewHarness'
import { resetRouterCalls } from '@/src/test/routerDouble'

// Reset Demo as the owner uses it: after a session of real work, not after one
// isolated mutation.
//
// The three authoring suites each prove Reset discards the one thing they
// authored, and demoRuntime.test.tsx proves the seed is rebuilt from the
// recorded anchor. What is proved here is the composite: a run that created a
// deck, authored two cards, edited a seeded card, graded a review and read a
// notification is undone completely and in one action, leaving state that is
// equal to the seed rather than merely similar to it - and that a second reset
// is a no-op rather than a slow drift.
//
// This matters because Reset Demo is what the owner presses between showings.
// A reset that leaves one authored deck behind turns the next demonstration
// into a bug report.

mockReducedMotion()
afterEach(cleanup)

jest.mock('expo-router', () => ({
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  useRouter: () => require('@/src/test/routerDouble').routerDouble,
  useFocusEffect: () => {},
}))

jest.mock('@/src/data/supabaseClient', () => ({
  isMobileSupabaseConfigured: false,
  getMobileSupabase: jest.fn(() => {
    throw new Error('Demo mode must never construct a Supabase client.')
  }),
}))

/** The greeting is a parameter, so a test supplies one rather than rolling one. */
const GREETING = { mainText: 'Ready?', subtext: 'Keep going.' }

const SEEDED_DECK = 'fixture-modern-cpp'

let demo: DemoWorkspaceValue
let entities: DemoEntities
let view: ReturnType<typeof render>
let client: QueryClient

function Probe() {
  demo = useDemoWorkspace()
  const seen = useDemoEntities()
  entities = { decks: seen.decks, cards: seen.cards, reviewLogs: seen.reviewLogs }
  return null
}

beforeEach(() => {
  resetRouterCalls()
})

function tree(children: ReactNode) {
  return (
    <QueryClientProvider client={client}>
      <DemoWorkspaceProvider>
        <Probe />
        {children}
      </DemoWorkspaceProvider>
    </QueryClientProvider>
  )
}

async function mount() {
  client = createTestQueryClient()
  view = render(tree(null))
  await settleQueries()
}

async function show(children: ReactNode) {
  view.rerender(tree(children))
  await settleQueries()
}

async function press(label: string | RegExp) {
  await act(async () => {
    fireEvent.press(screen.getByLabelText(label))
  })
  await settleQueries()
}

function byId<T extends { id: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
}

/**
 * Everything the demo is, as one comparable value: what the repository holds,
 * what the inbox holds, and what the three derived screens report. Sorted by
 * id, because `cards.search` orders by `updatedAt` the way Dexie does and an
 * edit legitimately moves a row within that ordering.
 */
async function snapshot() {
  const stored = await storedEntities()
  const now = demo.now
  const today = demoTodayViewModel(entities, GREETING, now)
  const progress = demoProgressViewModel(entities, now)
  const library = demoLibraryViewModel(entities, now)
  return {
    decks: byId(stored.decks) as Deck[],
    cards: byId(stored.cards) as Card[],
    reviewLogs: byId(stored.reviewLogs) as ReviewLog[],
    notifications: demo.notifications,
    today: { dueToday: today.dueToday, streak: today.streak, retention: today.retention },
    progressMetrics: progress.metrics,
    libraryDeckNames: library.decks.map((deck) => deck.name),
  }
}

/** A run of real work: a deck, two cards, an edit, a review and a read notification. */
async function useTheDemoForAWhile() {
  let deck: Deck | null = null
  await show(
    <DeckFormScreen
      onCancel={() => {}}
      onSaved={(created) => {
        deck = created
      }}
      target={{ kind: 'create' }}
    />,
  )
  fireEvent.changeText(screen.getByTestId('deck-name-input'), 'Owner demo deck')
  await press('Create deck')
  if (!deck) throw new Error('the deck form did not report a saved deck')
  const deckId = (deck as Deck).id

  await show(
    <RecallEditorScreen
      deckId={deckId}
      deckName="Owner demo deck"
      onCancel={() => {}}
      onSaved={() => {}}
    />,
  )
  fireEvent.changeText(screen.getByTestId('recall-prompt-input'), 'Authored during the demo')
  fireEvent.changeText(screen.getByTestId('recall-answer-input'), 'And it should not survive.')
  await press('Create card')

  await show(
    <MultipleChoiceEditorScreen
      deckId={deckId}
      deckName="Owner demo deck"
      onCancel={() => {}}
      onSaved={() => {}}
    />,
  )
  fireEvent.changeText(screen.getByTestId('mc-prompt-input'), 'Authored MC during the demo')
  fireEvent.changeText(screen.getByTestId('mc-option-input-0'), 'std::unique_ptr<T>')
  fireEvent.changeText(screen.getByTestId('mc-option-input-1'), 'std::observer_ptr<T>')
  fireEvent.press(screen.getByLabelText('Option 1 is correct'))
  await press('Create card')

  // Edit a seeded card, so the run also changed something the seed owns.
  const seededRecall = (await storedEntities()).cards.find(
    (card) => card.deckId === SEEDED_DECK && card.interaction.type === 'recall',
  )
  if (!seededRecall) throw new Error('the seed has no Recall card in the fixture deck')
  await show(
    <RecallEditorScreen
      card={seededRecall}
      deckId={seededRecall.deckId}
      deckName="Modern C++"
      onCancel={() => {}}
      onSaved={() => {}}
    />,
  )
  fireEvent.changeText(screen.getByTestId('recall-prompt-input'), 'Edited during the demo')
  await press('Save card')

  // Grade one seeded card through the real session.
  await show(
    <SessionHost
      deckId={SEEDED_DECK}
      onExit={() => {}}
    />,
  )
  const flip = screen.queryByLabelText('Recall card, question showing')
  if (flip) {
    await act(async () => {
      fireEvent.press(flip)
    })
  } else {
    const options = screen.queryAllByRole('radio').concat(screen.queryAllByRole('checkbox'))
    if (options.length > 0) fireEvent.press(options[0])
    const submit = screen.queryByText('Submit answer')
    if (submit) fireEvent.press(submit)
  }
  await settleQueries()
  await press(/^Good,/)
  await show(null)

  // And read a notification, the one piece of demo state with no store.
  const unread = demo.notifications.find((item) => item.unread)
  if (!unread) throw new Error('the seeded inbox has no unread notification')
  await act(async () => {
    demo.markNotificationRead(unread.id)
  })
  await settleQueries()

  return { deckId, editedCardId: seededRecall.id }
}

function SessionHost({ deckId, onExit }: { deckId: string; onExit: () => void }) {
  const { decks, cards, reviewLogs, isLoading } = useDemoEntities()
  if (isLoading) return null
  return (
    <DemoReviewSession deckId={deckId} entities={{ decks, cards, reviewLogs }} onExit={onExit} />
  )
}

async function resetDemo() {
  await act(async () => {
    demo.resetDemoWorkspace()
  })
  await settleQueries()
}

describe('Reset Demo after a full run', () => {
  it('undoes authoring, editing, reviewing and the inbox in one action', async () => {
    await mount()
    const seeded = await snapshot()

    const { deckId, editedCardId } = await useTheDemoForAWhile()

    // The run really did change things, or the reset below would prove nothing.
    const used = await snapshot()
    expect(used.decks.length).toBe(seeded.decks.length + 1)
    expect(used.cards.length).toBe(seeded.cards.length + 2)
    expect(used.reviewLogs.length).toBe(seeded.reviewLogs.length + 1)
    expect(used.notifications.filter((item) => item.unread).length).toBeLessThan(
      seeded.notifications.filter((item) => item.unread).length,
    )
    expect(used.cards.find((card) => card.id === editedCardId)?.prompt.value).toBe(
      'Edited during the demo',
    )

    await resetDemo()

    const after = await snapshot()
    expect(after.decks).toEqual(seeded.decks)
    expect(after.cards).toEqual(seeded.cards)
    expect(after.reviewLogs).toEqual(seeded.reviewLogs)
    expect(after.notifications).toEqual(seeded.notifications)

    // Named consequences, so a failure says what the owner would have seen.
    expect(after.decks.some((deck) => deck.id === deckId)).toBe(false)
    expect(after.cards.some((card) => card.prompt.value === 'Authored during the demo')).toBe(false)
    expect(after.cards.some((card) => card.prompt.value === 'Authored MC during the demo')).toBe(
      false,
    )
    expect(after.cards.find((card) => card.id === editedCardId)?.prompt.value).toBe(
      seeded.cards.find((card) => card.id === editedCardId)?.prompt.value,
    )

    // The derived screens, which is what the owner actually looks at.
    expect(after.today).toEqual(seeded.today)
    expect(after.progressMetrics).toEqual(seeded.progressMetrics)
    expect(after.libraryDeckNames).toEqual(seeded.libraryDeckNames)
  })

  it('leaves no authored entity in the query cache', async () => {
    await mount()
    const seededCardCount = entities.cards.length

    const { deckId } = await useTheDemoForAWhile()
    expect(entities.decks.some((deck) => deck.id === deckId)).toBe(true)

    await resetDemo()

    // Read through the probe, which is what the shared hooks currently see:
    // clearing the cache is the load-bearing middle layer of the reset, and a
    // repository-only assertion would pass even if the screens kept rendering
    // pre-reset entities.
    expect(entities.decks.some((deck) => deck.id === deckId)).toBe(false)
    expect(entities.cards.some((card) => card.prompt.value === 'Authored during the demo')).toBe(
      false,
    )
    expect(entities.cards).toHaveLength(seededCardCount)
  })

  it('is idempotent, so a second reset is a no-op rather than a drift', async () => {
    await mount()
    const seeded = await snapshot()

    await useTheDemoForAWhile()
    await resetDemo()
    const once = await snapshot()

    await resetDemo()
    const twice = await snapshot()

    expect(once).toEqual(seeded)
    expect(twice).toEqual(once)
  })
})
