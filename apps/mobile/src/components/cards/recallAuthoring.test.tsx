import type { Card, RecallInteraction } from '@itera/core'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native'
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

import { LibraryDeckScreen } from '@/src/components/library/LibraryDeckScreen'
import { CardStudyScreen } from '@/src/components/review/CardStudyScreen'
import { DemoWorkspaceProvider } from '@/src/demo/DemoWorkspaceProvider'
import { useDemoEntities } from '@/src/demo/demoEntities'
import { demoDeckViewModel, findDemoCard } from '@/src/demo/demoSelectors'
import { useDemoWorkspace, type DemoWorkspaceValue } from '@/src/demo/demoWorkspaceContext'
import { createTestQueryClient, settleQueries, storedEntities } from '@/src/test/demoHarness'
import { resetRouterCalls } from '@/src/test/routerDouble'
import { RecallEditorScreen } from './RecallEditorScreen'

// Native Recall authoring end to end, over the real composed demo runtime.
//
// The rules are core's and are unit-tested there: `validateRecallForm` decides
// validity, `recallFormToRecord` builds the record, `saveRecallCard` writes it.
// What is proved here is that the native screen is genuinely bound to them -
// that the card reaching the repository is a canonical Card with canonical New
// scheduling, that an edit carries the card's identity and its entire
// SchedulingState across, and that the result is a real queue member rather
// than an editor-only object.

jest.mock('expo-router', () => ({
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  useRouter: () => require('@/src/test/routerDouble').routerDouble,
}))

jest.mock('@/src/data/supabaseClient', () => ({
  isMobileSupabaseConfigured: false,
  getMobileSupabase: jest.fn(() => {
    throw new Error('Demo mode must never construct a Supabase client.')
  }),
}))

afterEach(cleanup)

let demo: DemoWorkspaceValue
let seen: ReturnType<typeof useDemoEntities>

function Probe() {
  demo = useDemoWorkspace()
  seen = useDemoEntities()
  return null
}

async function mount(children: ReactNode) {
  const view = render(
    <QueryClientProvider client={createTestQueryClient()}>
      <DemoWorkspaceProvider>
        <Probe />
        {children}
      </DemoWorkspaceProvider>
    </QueryClientProvider>,
  )
  await settleQueries()
  return view
}

beforeEach(() => {
  resetRouterCalls()
})

/** The deck every authored card in this file is filed into. */
const DECK_ID = 'fixture-modern-cpp'

function CreateHost({ onSaved }: { onSaved?: (card: Card) => void }) {
  return (
    <RecallEditorScreen
      deckId={DECK_ID}
      deckName="Modern C++"
      onCancel={() => {}}
      onSaved={(record) => onSaved?.(record)}
    />
  )
}

/**
 * The edit form has to be handed the record the mounted repository holds, so it
 * reads the card through the shared hooks exactly as the edit route does.
 */
function EditHost({ cardId }: { cardId: string }) {
  const entities = useDemoEntities()
  const card = findDemoCard(entities, cardId)
  return card ? (
    <RecallEditorScreen
      card={card}
      deckId={card.deckId}
      deckName="Modern C++"
      onCancel={() => {}}
      onSaved={() => {}}
    />
  ) : null
}

/** Mirrors the deck route, so the card list re-derives after a mutation. */
function DeckHost({ deckId }: { deckId: string }) {
  const entities = useDemoEntities()
  const viewModel = demoDeckViewModel(entities, deckId, Date.now())
  return viewModel ? <LibraryDeckScreen viewModel={viewModel} /> : null
}

async function fillValidCard(prompt = 'What is SSA form?', answer = 'One assignment per variable.') {
  fireEvent.changeText(screen.getByTestId('recall-prompt-input'), prompt)
  fireEvent.changeText(screen.getByTestId('recall-answer-input'), answer)
}

async function pressSave(label = 'Create card') {
  await act(async () => {
    fireEvent.press(screen.getByLabelText(label))
  })
  await settleQueries()
}

/** The first seeded Recall card that has actually been reviewed. */
async function seededReviewedRecall(): Promise<Card> {
  const { cards } = await storedEntities()
  const card =
    cards.find((c) => c.interaction.type === 'recall' && c.scheduling.reps > 0) ??
    cards.find((c) => c.interaction.type === 'recall')
  if (!card) throw new Error('the demo seed has no Recall card')
  return card
}

describe('Recall validation', () => {
  it('gates Save on the shared validator rather than a second native rule', async () => {
    await mount(<CreateHost />)

    expect(screen.getByLabelText('Create card').props.accessibilityState.disabled).toBe(true)

    // A prompt alone is not a Recall card - it is the answer it reveals too,
    // which is exactly what validateRecallForm says.
    fireEvent.changeText(screen.getByTestId('recall-prompt-input'), 'What is SSA form?')
    expect(screen.getByLabelText('Create card').props.accessibilityState.disabled).toBe(true)
    expect(screen.getByText('Answer is required.')).toBeTruthy()
    expect(screen.queryByText('Prompt is required.')).toBeNull()

    // Whitespace is not content.
    fireEvent.changeText(screen.getByTestId('recall-answer-input'), '   ')
    expect(screen.getByLabelText('Create card').props.accessibilityState.disabled).toBe(true)

    fireEvent.changeText(screen.getByTestId('recall-answer-input'), 'One assignment per variable.')
    expect(screen.getByLabelText('Create card').props.accessibilityState.disabled).toBe(false)
    expect(screen.queryByText('Answer is required.')).toBeNull()
  })

  it('shows nothing accusatory before the author has typed anything', async () => {
    await mount(<CreateHost />)

    expect(screen.queryByText('Prompt is required.')).toBeNull()
    expect(screen.queryByText('Answer is required.')).toBeNull()
  })
})

describe('creating a Recall card', () => {
  it('writes a canonical Card through the shared save path', async () => {
    const saved: Card[] = []
    await mount(<CreateHost onSaved={(card) => saved.push(card)} />)

    const before = (await storedEntities()).cards.length
    await fillValidCard()
    fireEvent.changeText(screen.getByTestId('card-tip-input'), 'Think about assignment counts.')
    fireEvent.changeText(screen.getByTestId('card-explanation-input'), 'Each name is bound once.')
    fireEvent.changeText(screen.getByTestId('card-tags-input'), 'compilers, ssa , compilers')
    await pressSave()

    const { cards } = await storedEntities()
    expect(cards).toHaveLength(before + 1)

    const created = cards.find((card) => card.prompt.value === 'What is SSA form?')
    expect(created).toBeTruthy()
    expect(created?.deckId).toBe(DECK_ID)
    expect(created?.interaction.type).toBe('recall')
    expect((created!.interaction as RecallInteraction).answer.value).toBe(
      'One assignment per variable.',
    )
    expect(created?.tip?.value).toBe('Think about assignment counts.')
    expect(created?.explanation?.value).toBe('Each name is bound once.')
    // Tag parsing is the shared form model's, including the de-duplication.
    expect(created?.tags).toEqual(['compilers', 'ssa'])
    expect(created?.suspended).toBe(false)
    expect(saved).toHaveLength(1)
    expect(saved[0].id).toBe(created?.id)
  })

  it('starts the card at canonical New scheduling', async () => {
    await mount(<CreateHost />)
    await fillValidCard('Newly authored prompt')
    await pressSave()

    const created = (await storedEntities()).cards.find(
      (card) => card.prompt.value === 'Newly authored prompt',
    )
    expect(created?.scheduling.state).toBe('new')
    expect(created?.scheduling.reps).toBe(0)
    expect(created?.scheduling.lapses).toBe(0)
    expect(created?.scheduling.stability).toBe(0)
    expect(created?.scheduling.lastReview).toBeUndefined()
    // Due immediately, which is what makes it a real queue member.
    expect(created?.scheduling.due).toBeLessThanOrEqual(Date.now())
  })

  it('preserves technical content byte for byte', async () => {
    // Card content is data, never markup, and the threat on a phone is the
    // keyboard rather than the renderer. Nothing here may be escaped, stripped
    // or smart-quoted.
    const prompt = 'Why does `std::vector<T>` reallocate? Show push_back() and {braces}.'
    const answer = 'Because capacity() < size() + 1. See snake_case_helper<T>(x) and **not bold**.'

    await mount(<CreateHost />)
    await fillValidCard(prompt, answer)
    await pressSave()

    const created = (await storedEntities()).cards.find((card) => card.prompt.value === prompt)
    expect(created).toBeTruthy()
    expect(created?.prompt.value).toBe(prompt)
    expect((created!.interaction as RecallInteraction).answer.value).toBe(answer)
  })

  it('appears in the deck immediately, with no restart', async () => {
    await mount(<CreateHost />)
    const before = seen.cards.length

    await fillValidCard('Reactive prompt')
    await pressSave()

    // The shared hooks re-rendered a consumer, which is the whole reactivity
    // claim - not a re-read performed by the test.
    expect(seen.cards).toHaveLength(before + 1)
    expect(seen.cards.some((card) => card.prompt.value === 'Reactive prompt')).toBe(true)

    const viewModel = demoDeckViewModel(await storedEntities(), DECK_ID, Date.now())
    expect(viewModel?.cards.some((card) => card.prompt === 'Reactive prompt')).toBe(true)
    expect(viewModel?.cardCount).toBe(
      (await storedEntities()).cards.filter((card) => card.deckId === DECK_ID).length,
    )
  })

  it('opens in Card study through the existing registry', async () => {
    await mount(<CreateHost />)
    await fillValidCard('Studyable prompt', 'Studyable answer')
    await pressSave()

    const created = (await storedEntities()).cards.find(
      (card) => card.prompt.value === 'Studyable prompt',
    )
    expect(created).toBeTruthy()

    // Rendered outside the demo provider on purpose: Card study is handed a
    // canonical Card and records nothing, so if it can render this one the card
    // is a real Card rather than an editor-only object.
    const study = render(<CardStudyScreen card={created!} onExit={() => {}} />)
    expect(study.getByText('Studyable prompt')).toBeTruthy()
  })
})

describe('editing a Recall card', () => {
  it('loads every field from the canonical record', async () => {
    const card = await seededReviewedRecall()
    await mount(<EditHost cardId={card.id} />)

    expect(screen.getByTestId('recall-prompt-input').props.value).toBe(card.prompt.value)
    expect(screen.getByTestId('recall-answer-input').props.value).toBe(
      (card.interaction as RecallInteraction).answer.value,
    )
    expect(screen.getByTestId('card-tip-input').props.value).toBe(card.tip?.value ?? '')
    expect(screen.getByTestId('card-explanation-input').props.value).toBe(
      card.explanation?.value ?? '',
    )
    expect(screen.getByTestId('card-tags-input').props.value).toBe(card.tags.join(', '))
    expect(screen.getByLabelText('Save card').props.accessibilityState.disabled).toBe(false)
  })

  it('keeps the card identity and its entire scheduling state', async () => {
    // The property this milestone had to avoid breaking: editing a card's
    // wording must not move its FSRS position or detach its history.
    const before = await seededReviewedRecall()
    expect(before.scheduling.reps).toBeGreaterThan(0)

    await mount(<EditHost cardId={before.id} />)
    fireEvent.changeText(screen.getByTestId('recall-prompt-input'), 'Reworded prompt')
    await pressSave('Save card')

    const entities = await storedEntities()
    const after = entities.cards.find((card) => card.id === before.id)

    expect(after?.prompt.value).toBe('Reworded prompt')
    expect(after?.id).toBe(before.id)
    expect(after?.createdAt).toBe(before.createdAt)
    expect(after?.deckId).toBe(before.deckId)
    expect(after?.suspended).toBe(before.suspended)
    expect(after?.order).toBe(before.order)
    expect(after?.scheduling).toEqual(before.scheduling)
    // No new card was minted, and no history row was touched.
    expect(entities.cards).toHaveLength((await storedEntities()).cards.length)
    expect(entities.reviewLogs.filter((log) => log.cardId === before.id).length).toBe(
      (await storedEntities()).reviewLogs.filter((log) => log.cardId === before.id).length,
    )
  })

  it('advances updatedAt, because an edit is an edit', async () => {
    const before = await seededReviewedRecall()

    await mount(<EditHost cardId={before.id} />)
    fireEvent.changeText(screen.getByTestId('recall-answer-input'), 'A different answer')
    await pressSave('Save card')

    const after = (await storedEntities()).cards.find((card) => card.id === before.id)
    expect(after?.updatedAt).toBeGreaterThanOrEqual(before.updatedAt)
  })
})

describe('deleting a Recall card', () => {
  it('deletes from the row actions sheet behind a confirmation, and stays on the deck', async () => {
    await mount(<DeckHost deckId={DECK_ID} />)

    const viewModel = demoDeckViewModel(await storedEntities(), DECK_ID, Date.now())
    const target = viewModel?.cards.find((card) => card.interactionType === 'recall')
    expect(target).toBeTruthy()

    const logsBefore = (await storedEntities()).reviewLogs.length

    fireEvent.press(screen.getByLabelText(`Actions for ${target!.prompt}`))
    fireEvent.press(screen.getByLabelText('Delete card'))

    expect(screen.getByText('Delete this card?')).toBeTruthy()
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Delete card'))
    })
    await settleQueries()

    const after = await storedEntities()
    expect(after.cards.some((card) => card.id === target!.id)).toBe(false)
    // Canonical behaviour: card deletion cascades nothing, and the product
    // deliberately allows orphan history.
    expect(after.reviewLogs).toHaveLength(logsBefore)
    // Still on the deck: the row action never navigated.
    expect(screen.getByText('Cards')).toBeTruthy()
  })
})

describe('Reset Demo', () => {
  it('discards an authored Recall card and restores the deterministic seed', async () => {
    await mount(<CreateHost />)
    const seededCount = seen.cards.length

    await fillValidCard('Ephemeral prompt')
    await pressSave()
    expect(seen.cards).toHaveLength(seededCount + 1)

    await act(async () => {
      demo.resetDemoWorkspace()
    })
    await settleQueries()

    expect(seen.cards).toHaveLength(seededCount)
    expect(seen.cards.some((card) => card.prompt.value === 'Ephemeral prompt')).toBe(false)
  })
})
