import { getRepository, type Card, type Deck, type SchedulingState } from '@itera/core'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native'
import type { ReactNode } from 'react'

import { DeckFormScreen } from '@/src/components/cards/DeckFormScreen'
import { MultipleChoiceEditorScreen } from '@/src/components/cards/MultipleChoiceEditorScreen'
import { RecallEditorScreen } from '@/src/components/cards/RecallEditorScreen'
import { LibraryDeckScreen } from '@/src/components/library/LibraryDeckScreen'
import { CardStudyScreen } from '@/src/components/review/CardStudyScreen'
import { DemoReviewSession } from '@/src/components/review/DemoReviewSession'
import { DemoWorkspaceProvider } from '@/src/demo/DemoWorkspaceProvider'
import { useDemoEntities, type DemoEntities } from '@/src/demo/demoEntities'
import { createDemoQueue } from '@/src/demo/demoQueue'
import {
  demoDeckViewModel,
  demoProgressViewModel,
  demoTodayViewModel,
  findDemoCard,
} from '@/src/demo/demoSelectors'
import { useDemoWorkspace, type DemoWorkspaceValue } from '@/src/demo/demoWorkspaceContext'
import { createTestQueryClient, settleQueries, storedEntities } from '@/src/test/demoHarness'
import { mockReducedMotion } from '@/src/test/reviewHarness'
import { resetRouterCalls } from '@/src/test/routerDouble'

// The whole life of an authored card, over one mounted demo runtime: create a
// deck, author a card into it, review that card through the real session, then
// edit its wording.
//
// The three authoring suites already prove the native screens are bound to the
// shared form models, and prove scheduling preservation against a card the
// *seed* had already reviewed. What none of them proves is the loop a learner
// actually performs, and it is the one that would embarrass the product if it
// were broken: a card this device created, reviewed on this device, and then
// corrected a typo in, must not lose the FSRS position it just earned.
//
// Everything here goes through the same Repository and the same query hooks the
// demo UI uses. Nothing special-cases an authored entity, which is the point -
// if an authored card needed its own path anywhere, these assertions would be
// the ones to fail.
//
// One mounted provider for the whole flow. Each `render` composes a fresh
// InMemoryRepository, so a second `render` would be a second workspace;
// `rerender` swaps the screen the way the navigator swaps a route while the
// app, the query client and the backend stay put.

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

async function mount(children: ReactNode) {
  client = createTestQueryClient()
  view = render(tree(children))
  await settleQueries()
}

/** Swap the visible screen without unmounting the runtime beneath it. */
async function show(children: ReactNode) {
  view.rerender(tree(children))
  await settleQueries()
}

/**
 * What focusing a screen does. The demo clock is frozen at composition and
 * bumped by `useDemoScreen`'s focus effect (D424), so a card authored a
 * millisecond ago becomes due at the next screen focus - which is exactly what
 * navigating from the editor back to a list or into Review performs.
 */
async function focusScreen() {
  await act(async () => {
    demo.refreshDemoNow()
  })
  await settleQueries()
}

async function press(label: string | RegExp) {
  await act(async () => {
    fireEvent.press(screen.getByLabelText(label))
  })
  await settleQueries()
}

// The three authoring steps, each through its production screen.

async function createDeck(name: string): Promise<Deck> {
  let created: Deck | null = null
  await show(
    <DeckFormScreen
      onCancel={() => {}}
      onSaved={(deck) => {
        created = deck
      }}
      target={{ kind: 'create' }}
    />,
  )
  fireEvent.changeText(screen.getByTestId('deck-name-input'), name)
  await press('Create deck')
  if (!created) throw new Error('the deck form did not report a saved deck')
  return created
}

async function authorRecall(deckId: string, prompt: string, answer: string): Promise<Card> {
  let created: Card | null = null
  await show(
    <RecallEditorScreen
      deckId={deckId}
      deckName="Acceptance"
      onCancel={() => {}}
      onSaved={(record) => {
        created = record
      }}
    />,
  )
  fireEvent.changeText(screen.getByTestId('recall-prompt-input'), prompt)
  fireEvent.changeText(screen.getByTestId('recall-answer-input'), answer)
  await press('Create card')
  if (!created) throw new Error('the Recall editor did not report a saved card')
  return created
}

async function authorMultipleChoice(deckId: string, prompt: string): Promise<Card> {
  let created: Card | null = null
  await show(
    <MultipleChoiceEditorScreen
      deckId={deckId}
      deckName="Acceptance"
      onCancel={() => {}}
      onSaved={(record) => {
        created = record
      }}
    />,
  )
  fireEvent.changeText(screen.getByTestId('mc-prompt-input'), prompt)
  fireEvent.changeText(screen.getByTestId('mc-option-input-0'), 'std::unique_ptr<T>')
  fireEvent.changeText(screen.getByTestId('mc-option-input-1'), 'std::observer_ptr<T>')
  fireEvent.press(screen.getByLabelText('Option 1 is correct'))
  await press('Create card')
  if (!created) throw new Error('the Multiple Choice editor did not report a saved card')
  return created
}

function SessionHost({ deckId, onExit }: { deckId: string; onExit: () => void }) {
  const { decks, cards, reviewLogs, isLoading } = useDemoEntities()
  if (isLoading) return null
  return (
    <DemoReviewSession deckId={deckId} entities={{ decks, cards, reviewLogs }} onExit={onExit} />
  )
}

/** Runs a deck-scoped session and grades whatever it opens on, once. */
async function reviewDeck(deckId: string) {
  await show(<SessionHost deckId={deckId} onExit={() => {}} />)

  const flip = screen.queryByLabelText('Recall card, question showing')
  if (flip) {
    await act(async () => {
      fireEvent.press(flip)
    })
  } else {
    const options = screen.queryAllByRole('radio').concat(screen.queryAllByRole('checkbox'))
    if (options.length === 0) throw new Error('no answerable control on the review card')
    fireEvent.press(options[0])
    fireEvent.press(screen.getByText('Submit answer'))
  }
  await settleQueries()

  await press(/^Good,/)
}

function EditCardHost({ cardId }: { cardId: string }) {
  const seen = useDemoEntities()
  const card = findDemoCard(seen, cardId)
  if (!card) return null
  const props = {
    card,
    deckId: card.deckId,
    deckName: 'Acceptance',
    onCancel: () => {},
    onSaved: () => {},
  }
  return card.interaction.type === 'recall' ? (
    <RecallEditorScreen {...props} />
  ) : (
    <MultipleChoiceEditorScreen {...props} />
  )
}

function DeckHost({ deckId }: { deckId: string }) {
  const seen = useDemoEntities()
  const viewModel = demoDeckViewModel(seen, deckId, Date.now())
  return viewModel ? <LibraryDeckScreen viewModel={viewModel} /> : null
}

function StudyHost({ cardId }: { cardId: string }) {
  const seen = useDemoEntities()
  const card = findDemoCard(seen, cardId)
  return card ? <CardStudyScreen card={card} onExit={() => {}} /> : null
}

async function storedCard(id: string): Promise<Card> {
  const found = (await storedEntities()).cards.find((card) => card.id === id)
  if (!found) throw new Error(`the repository does not hold card ${id}`)
  return found
}

/** The greeting is a parameter, so a test supplies one rather than rolling one. */
const GREETING = { mainText: 'Ready?', subtext: 'Keep going.' }

/** Progress's own Due KPI, read as the screen renders it. */
function progressDueMetric(source: DemoEntities, now: number): number {
  const metric = demoProgressViewModel(source, now).metrics.find((row) => row.id === 'due')
  if (!metric) throw new Error('Progress has no Due metric')
  return Number(metric.value)
}

async function logsFor(cardId: string) {
  return (await storedEntities()).reviewLogs.filter((log) => log.cardId === cardId)
}

/** Every field of a SchedulingState, named, so a failure says which one moved. */
function schedulingFacts(state: SchedulingState) {
  return {
    due: state.due,
    stability: state.stability,
    difficulty: state.difficulty,
    elapsedDays: state.elapsedDays,
    scheduledDays: state.scheduledDays,
    reps: state.reps,
    lapses: state.lapses,
    learningSteps: state.learningSteps,
    state: state.state,
    lastReview: state.lastReview,
  }
}

describe('a card authored, reviewed and then edited on this device', () => {
  it('keeps its identity, its FSRS position and its history across the edit (Recall)', async () => {
    await mount(null)
    const deck = await createDeck('Acceptance deck')
    const created = await authorRecall(deck.id, 'What does RAII bind?', 'A resource to a scope.')

    // Canonical New, straight from core's initialSchedulingState.
    const asCreated = await storedCard(created.id)
    expect(asCreated.deckId).toBe(deck.id)
    expect(asCreated.interaction.type).toBe('recall')
    expect(asCreated.scheduling.state).toBe('new')
    expect(asCreated.scheduling.reps).toBe(0)
    expect(asCreated.scheduling.lastReview).toBeUndefined()

    // It is a real queue member, through the same helper the session uses.
    await focusScreen()
    expect(
      createDemoQueue(entities, { now: demo.now, deckId: deck.id }).map((card) => card.id),
    ).toEqual([created.id])

    await reviewDeck(deck.id)

    const reviewed = await storedCard(created.id)
    expect(reviewed.scheduling.reps).toBe(1)
    expect(reviewed.scheduling.state).not.toBe('new')
    expect(reviewed.scheduling.lastReview).toBeDefined()
    expect(reviewed.scheduling.due).toBeGreaterThan(asCreated.scheduling.due)
    const logs = await logsFor(created.id)
    expect(logs).toHaveLength(1)

    // The edit a learner makes after noticing a typo.
    await show(<EditCardHost cardId={created.id} />)
    fireEvent.changeText(screen.getByTestId('recall-prompt-input'), 'What does RAII actually bind?')
    await press('Save card')

    const edited = await storedCard(created.id)
    expect(edited.prompt.value).toBe('What does RAII actually bind?')
    expect(edited.id).toBe(created.id)
    expect(edited.createdAt).toBe(reviewed.createdAt)
    expect(edited.deckId).toBe(deck.id)
    expect(edited.suspended).toBe(reviewed.suspended)
    expect(edited.order).toBe(reviewed.order)
    // The assertion this whole file exists for.
    expect(schedulingFacts(edited.scheduling)).toEqual(schedulingFacts(reviewed.scheduling))
    expect(await logsFor(created.id)).toEqual(logs)
    // No second card was minted by the edit.
    expect((await storedEntities()).cards.filter((card) => card.deckId === deck.id)).toHaveLength(1)
  })

  it('keeps its identity, its FSRS position and its history across the edit (Multiple Choice)', async () => {
    await mount(null)
    const deck = await createDeck('MC acceptance deck')
    const created = await authorMultipleChoice(deck.id, 'Which type owns its pointee?')

    const asCreated = await storedCard(created.id)
    expect(asCreated.interaction.type).toBe('multiple_choice')
    expect(asCreated.scheduling.reps).toBe(0)

    await focusScreen()
    expect(
      createDemoQueue(entities, { now: demo.now, deckId: deck.id }).map((card) => card.id),
    ).toEqual([created.id])

    await reviewDeck(deck.id)

    const reviewed = await storedCard(created.id)
    expect(reviewed.scheduling.reps).toBe(1)
    expect(await logsFor(created.id)).toHaveLength(1)

    await show(<EditCardHost cardId={created.id} />)
    fireEvent.changeText(screen.getByTestId('mc-prompt-input'), 'Which of these owns its pointee?')
    await press('Save card')

    const edited = await storedCard(created.id)
    expect(edited.prompt.value).toBe('Which of these owns its pointee?')
    expect(edited.id).toBe(created.id)
    expect(edited.createdAt).toBe(reviewed.createdAt)
    expect(schedulingFacts(edited.scheduling)).toEqual(schedulingFacts(reviewed.scheduling))
    expect(await logsFor(created.id)).toHaveLength(1)
  })

  it('adds an option to a reviewed card without resetting it to New', async () => {
    await mount(null)
    const deck = await createDeck('MC option deck')
    const created = await authorMultipleChoice(deck.id, 'Which is a smart pointer?')
    await focusScreen()
    await reviewDeck(deck.id)
    const reviewed = await storedCard(created.id)

    await show(<EditCardHost cardId={created.id} />)
    fireEvent.press(screen.getByLabelText('Add option'))
    fireEvent.changeText(screen.getByTestId('mc-option-input-2'), 'std::shared_ptr<T>')
    await press('Save card')

    const edited = await storedCard(created.id)
    const interaction = edited.interaction
    if (interaction.type !== 'multiple_choice') throw new Error('the type changed under an edit')
    expect(interaction.options).toHaveLength(3)
    expect(new Set(interaction.options.map((option) => option.id)).size).toBe(3)
    expect(schedulingFacts(edited.scheduling)).toEqual(schedulingFacts(reviewed.scheduling))
  })
})

describe('an authored card is an ordinary card everywhere', () => {
  it('reaches the deck list, the deck search, the status filter and Card study', async () => {
    await mount(null)
    const deck = await createDeck('Integration deck')
    const prompt = 'What does std::vector<T>::push_back() do?'
    const created = await authorRecall(deck.id, prompt, 'Appends, reallocating when full.')

    await show(<DeckHost deckId={deck.id} />)

    // Listed, and counted by the metric the screen draws beside the list.
    expect(screen.getByText(prompt)).toBeTruthy()
    expect(demoDeckViewModel(await storedEntities(), deck.id, Date.now())?.cardCount).toBe(1)

    // Found by the deck's own search, with no special casing.
    fireEvent.changeText(screen.getByLabelText('Search cards'), 'push_back')
    expect(screen.getByText(prompt)).toBeTruthy()
    fireEvent.changeText(screen.getByLabelText('Search cards'), 'zzzz')
    expect(screen.getByText('No matching cards')).toBeTruthy()
    fireEvent.changeText(screen.getByLabelText('Search cards'), '')

    // And by the status filter, as the New card it is.
    fireEvent.press(screen.getByLabelText('Filter cards'))
    fireEvent.press(screen.getByLabelText('Show New cards'))
    expect(screen.getByText('Status: New')).toBeTruthy()
    expect(screen.getByText(prompt)).toBeTruthy()

    // And it opens in Card study through the existing registry.
    await show(<StudyHost cardId={created.id} />)
    expect(screen.getByText(prompt)).toBeTruthy()
  })

  it('is returned by the repository due query and moves Today and Progress', async () => {
    await mount(null)
    const todayBefore = demoTodayViewModel(entities, GREETING, demo.now).dueToday
    const dueBefore = progressDueMetric(entities, demo.now)

    const deck = await createDeck('Counting deck')
    await authorRecall(deck.id, 'Counted prompt', 'Counted answer')
    await focusScreen()

    // The canonical due query, not a demo helper.
    const due = await getRepository().cards.getDue({ now: demo.now })
    expect(due.some((card) => card.deckId === deck.id)).toBe(true)

    expect(demoTodayViewModel(entities, GREETING, demo.now).dueToday).toBe(
      todayBefore + 1,
    )
    expect(progressDueMetric(entities, demo.now)).toBe(dueBefore + 1)

    // Reviewing it takes it back out of both.
    await reviewDeck(deck.id)
    await focusScreen()
    expect(demoTodayViewModel(entities, GREETING, demo.now).dueToday).toBe(todayBefore)
    expect(progressDueMetric(entities, demo.now)).toBe(dueBefore)
  })
})
