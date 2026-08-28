import type { Card, MultipleChoiceInteraction } from '@itera/core'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native'
import { QueryClientProvider } from '@tanstack/react-query'
import { StyleSheet } from 'react-native'
import type { ReactNode } from 'react'

import { LibraryDeckScreen } from '@/src/components/library/LibraryDeckScreen'
import { CardStudyScreen } from '@/src/components/review/CardStudyScreen'
import { DemoWorkspaceProvider } from '@/src/demo/DemoWorkspaceProvider'
import { useDemoEntities } from '@/src/demo/demoEntities'
import { demoDeckViewModel, findDemoCard } from '@/src/demo/demoSelectors'
import { useDemoWorkspace, type DemoWorkspaceValue } from '@/src/demo/demoWorkspaceContext'
import { createTestQueryClient, settleQueries, storedEntities } from '@/src/test/demoHarness'
import { resetRouterCalls } from '@/src/test/routerDouble'
import { MultipleChoiceEditorScreen } from './MultipleChoiceEditorScreen'

// Native Multiple Choice authoring end to end, over the real composed demo
// runtime.
//
// As with Recall, the rules are core's: `validateMultipleChoiceForm` decides
// validity and `saveMultipleChoiceCard` writes the record. What is proved here
// is the binding, plus the two option-list behaviours the native editor
// reproduces because they are the form model's semantics rather than
// presentation - single-select exclusivity, and the multiple -> single trim.
//
// No grading assertion appears in this file on purpose: the exact-set
// comparison lives in domain/grading/multipleChoice.ts, belongs to the Review
// session, and the editor must not know about it.

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

const DECK_ID = 'fixture-modern-cpp'

function CreateHost({ onSaved }: { onSaved?: (card: Card) => void }) {
  return (
    <MultipleChoiceEditorScreen
      deckId={DECK_ID}
      deckName="Modern C++"
      onCancel={() => {}}
      onSaved={(record) => onSaved?.(record)}
    />
  )
}

function EditHost({ cardId }: { cardId: string }) {
  const entities = useDemoEntities()
  const card = findDemoCard(entities, cardId)
  return card ? (
    <MultipleChoiceEditorScreen
      card={card}
      deckId={card.deckId}
      deckName="Modern C++"
      onCancel={() => {}}
      onSaved={() => {}}
    />
  ) : null
}

function DeckHost({ deckId }: { deckId: string }) {
  const entities = useDemoEntities()
  const viewModel = demoDeckViewModel(entities, deckId, Date.now())
  return viewModel ? <LibraryDeckScreen viewModel={viewModel} /> : null
}

function setOption(index: number, text: string) {
  fireEvent.changeText(screen.getByTestId(`mc-option-input-${index}`), text)
}

function markCorrect(position: number) {
  fireEvent.press(screen.getByLabelText(`Option ${position} is correct`))
}

function isCorrect(position: number): boolean {
  return screen.getByLabelText(`Option ${position} is correct`).props.accessibilityState.checked
}

function saveDisabled(label = 'Create card'): boolean {
  return screen.getByLabelText(label).props.accessibilityState.disabled
}

async function pressSave(label = 'Create card') {
  await act(async () => {
    fireEvent.press(screen.getByLabelText(label))
  })
  await settleQueries()
}

/** A valid single-select card: prompt, two filled options, one correct. */
function fillValidCard(prompt = 'Which owns its pointee?') {
  fireEvent.changeText(screen.getByTestId('mc-prompt-input'), prompt)
  setOption(0, 'std::unique_ptr')
  setOption(1, 'std::observer_ptr')
  markCorrect(1)
}

/** The first seeded Multiple Choice card that has actually been reviewed. */
async function seededReviewedMc(): Promise<Card> {
  const { cards } = await storedEntities()
  const card =
    cards.find((c) => c.interaction.type === 'multiple_choice' && c.scheduling.reps > 0) ??
    cards.find((c) => c.interaction.type === 'multiple_choice')
  if (!card) throw new Error('the demo seed has no Multiple Choice card')
  return card
}

describe('Multiple Choice validation', () => {
  it('surfaces the shared validator rather than a second native rule', async () => {
    await mount(<CreateHost />)

    // The empty form starts at the shared model's own default: two blank
    // options, neither correct.
    expect(saveDisabled()).toBe(true)

    fireEvent.changeText(screen.getByTestId('mc-prompt-input'), 'Which owns its pointee?')
    expect(screen.getByText('All options need text.')).toBeTruthy()
    expect(screen.getByText('Mark at least one option as correct.')).toBeTruthy()
    expect(screen.queryByText('Prompt is required.')).toBeNull()

    setOption(0, 'std::unique_ptr')
    setOption(1, 'std::observer_ptr')
    expect(screen.queryByText('All options need text.')).toBeNull()
    expect(saveDisabled()).toBe(true)

    markCorrect(1)
    expect(screen.queryByText('Mark at least one option as correct.')).toBeNull()
    expect(saveDisabled()).toBe(false)
  })

  it('refuses a prompt that is only whitespace', async () => {
    await mount(<CreateHost />)
    fillValidCard()
    expect(saveDisabled()).toBe(false)

    fireEvent.changeText(screen.getByTestId('mc-prompt-input'), '   ')
    expect(saveDisabled()).toBe(true)
    expect(screen.getByText('Prompt is required.')).toBeTruthy()
  })

  it('refuses an option whose text was emptied again', async () => {
    await mount(<CreateHost />)
    fillValidCard()

    setOption(0, '')
    expect(saveDisabled()).toBe(true)
    expect(screen.getByText('All options need text.')).toBeTruthy()
  })
})

describe('the option list', () => {
  it('adds options and removes them down to the shared two-option floor', async () => {
    await mount(<CreateHost />)

    // The floor is the shared validator's rule; Remove is disabled rather than
    // hidden so the control does not vanish under the finger mid-edit.
    expect(screen.getByTestId('mc-option-remove-0').props.accessibilityState.disabled).toBe(true)

    fireEvent.press(screen.getByLabelText('Add option'))
    expect(screen.getByTestId('mc-option-input-2')).toBeTruthy()
    expect(screen.getByTestId('mc-option-remove-0').props.accessibilityState.disabled).toBe(false)

    setOption(0, 'first')
    setOption(1, 'second')
    setOption(2, 'third')

    fireEvent.press(screen.getByTestId('mc-option-remove-1'))
    expect(screen.queryByTestId('mc-option-input-2')).toBeNull()
    // The right option went: the removed one was 'second'.
    expect(screen.getByTestId('mc-option-input-0').props.value).toBe('first')
    expect(screen.getByTestId('mc-option-input-1').props.value).toBe('third')
    expect(screen.getByTestId('mc-option-remove-0').props.accessibilityState.disabled).toBe(true)
  })

  it('keeps single-select exclusive, and trims to the first correct option on multiple -> single', async () => {
    await mount(<CreateHost />)
    // A prompt, so Save is gated on the correct-answer state this test is
    // about rather than on the prompt rule.
    fireEvent.changeText(screen.getByTestId('mc-prompt-input'), 'Which of these?')
    fireEvent.press(screen.getByLabelText('Add option'))
    setOption(0, 'a')
    setOption(1, 'b')
    setOption(2, 'c')

    // Single-select: marking one clears the rest.
    markCorrect(1)
    markCorrect(3)
    expect(isCorrect(1)).toBe(false)
    expect(isCorrect(3)).toBe(true)

    // Multi-select: they accumulate.
    fireEvent.press(screen.getByLabelText('Allow multiple correct answers'))
    markCorrect(1)
    expect(isCorrect(1)).toBe(true)
    expect(isCorrect(3)).toBe(true)
    expect(saveDisabled()).toBe(false)

    // Back to single: a structural invariant, not an author omission - the
    // first correct option in list order survives, and the form stays valid
    // rather than showing an error the author cannot see the cause of.
    fireEvent.press(screen.getByLabelText('Allow multiple correct answers'))
    expect(isCorrect(1)).toBe(true)
    expect(isCorrect(3)).toBe(false)
    expect(screen.queryByText('Single-select cards can only have one correct option.')).toBeNull()
    expect(saveDisabled()).toBe(false)
  })

  it('gives every option control a 44 point target, slop included', async () => {
    // The declared geometry only. Whether it is comfortable in the hand is a
    // device question, but a control that cannot reach 44 on paper will not
    // reach it in the hand either.
    await mount(<CreateHost />)

    const marker = screen.getByLabelText('Option 1 is correct')
    const markerBox = StyleSheet.flatten(marker.props.style) as { width: number; height: number }
    const markerSlop = marker.props.hitSlop as number
    expect(markerBox.width + markerSlop * 2).toBeGreaterThanOrEqual(44)
    expect(markerBox.height + markerSlop * 2).toBeGreaterThanOrEqual(44)

    const remove = screen.getByLabelText('Remove option 1')
    const removeBox = StyleSheet.flatten(remove.props.style) as { width: number; height: number }
    const removeSlop = remove.props.hitSlop as number
    expect(removeBox.width + removeSlop * 2).toBeGreaterThanOrEqual(44)
    expect(removeBox.height + removeSlop * 2).toBeGreaterThanOrEqual(44)
  })

  it('names each option control for a screen reader', async () => {
    await mount(<CreateHost />)

    // "Correct" repeated down a column tells a screen-reader user nothing.
    expect(screen.getByLabelText('Option 1 is correct')).toBeTruthy()
    expect(screen.getByLabelText('Option 2 is correct')).toBeTruthy()
    expect(screen.getByLabelText('Remove option 1')).toBeTruthy()
    expect(screen.getByLabelText('Remove option 2')).toBeTruthy()
  })
})

describe('creating a Multiple Choice card', () => {
  it('writes a canonical Card with the shared option payload', async () => {
    const saved: Card[] = []
    await mount(<CreateHost onSaved={(card) => saved.push(card)} />)

    const before = (await storedEntities()).cards.length
    fillValidCard()
    fireEvent.press(screen.getByLabelText('Randomize option order in Review'))
    fireEvent.changeText(screen.getByTestId('card-tags-input'), 'pointers, ownership')
    await pressSave()

    const { cards } = await storedEntities()
    expect(cards).toHaveLength(before + 1)

    const created = cards.find((card) => card.prompt.value === 'Which owns its pointee?')
    expect(created?.deckId).toBe(DECK_ID)
    expect(created?.interaction.type).toBe('multiple_choice')

    const interaction = created?.interaction as MultipleChoiceInteraction
    expect(interaction.selectionMode).toBe('single')
    expect(interaction.randomizeOptions).toBe(true)
    expect(interaction.options).toHaveLength(2)
    expect(interaction.options.map((option) => option.content.value)).toEqual([
      'std::unique_ptr',
      'std::observer_ptr',
    ])
    expect(interaction.options.map((option) => option.correct)).toEqual([true, false])
    // Every option carries a stable id, minted by the shared form model.
    expect(new Set(interaction.options.map((option) => option.id)).size).toBe(2)
    expect(interaction.options.every((option) => option.id.length > 0)).toBe(true)

    expect(created?.tags).toEqual(['pointers', 'ownership'])
    expect(saved.map((card) => card.id)).toEqual([created?.id])
  })

  it('starts the card at canonical New scheduling and appears immediately', async () => {
    await mount(<CreateHost />)
    const before = seen.cards.length

    fillValidCard('Reactive MC prompt')
    await pressSave()

    expect(seen.cards).toHaveLength(before + 1)
    const created = seen.cards.find((card) => card.prompt.value === 'Reactive MC prompt')
    expect(created?.scheduling.state).toBe('new')
    expect(created?.scheduling.reps).toBe(0)
    expect(created?.scheduling.due).toBeLessThanOrEqual(Date.now())
  })

  it('preserves technical option text byte for byte', async () => {
    const option = '`std::map<K, V>::operator[]` inserts {} on a missing key'
    await mount(<CreateHost />)

    fireEvent.changeText(screen.getByTestId('mc-prompt-input'), 'Which statement is true?')
    setOption(0, option)
    setOption(1, 'It throws std::out_of_range')
    markCorrect(1)
    await pressSave()

    const created = (await storedEntities()).cards.find(
      (card) => card.prompt.value === 'Which statement is true?',
    )
    const interaction = created?.interaction as MultipleChoiceInteraction
    expect(interaction.options[0].content.value).toBe(option)
  })

  it('opens in Card study through the existing registry', async () => {
    await mount(<CreateHost />)
    fillValidCard('Studyable MC prompt')
    await pressSave()

    const created = (await storedEntities()).cards.find(
      (card) => card.prompt.value === 'Studyable MC prompt',
    )
    expect(created).toBeTruthy()

    const study = render(<CardStudyScreen card={created!} onExit={() => {}} />)
    expect(study.getByText('Studyable MC prompt')).toBeTruthy()
    expect(study.getByText('std::unique_ptr')).toBeTruthy()
  })
})

describe('editing a Multiple Choice card', () => {
  it('loads the prompt, the mode and every option from the canonical record', async () => {
    const card = await seededReviewedMc()
    const interaction = card.interaction as MultipleChoiceInteraction

    await mount(<EditHost cardId={card.id} />)

    expect(screen.getByTestId('mc-prompt-input').props.value).toBe(card.prompt.value)
    interaction.options.forEach((option, index) => {
      expect(screen.getByTestId(`mc-option-input-${index}`).props.value).toBe(option.content.value)
      expect(isCorrect(index + 1)).toBe(option.correct)
    })
    expect(
      screen.getByLabelText('Allow multiple correct answers').props.accessibilityState.checked,
    ).toBe(interaction.selectionMode === 'multiple')
    expect(saveDisabled('Save card')).toBe(false)
  })

  it('keeps the card identity and its entire scheduling state', async () => {
    const before = await seededReviewedMc()
    expect(before.scheduling.reps).toBeGreaterThan(0)
    const optionCount = (before.interaction as MultipleChoiceInteraction).options.length

    await mount(<EditHost cardId={before.id} />)
    fireEvent.changeText(screen.getByTestId('mc-prompt-input'), 'Reworded MC prompt')
    setOption(0, 'A rewritten first option')
    await pressSave('Save card')

    const entities = await storedEntities()
    const after = entities.cards.find((card) => card.id === before.id)
    const interaction = after?.interaction as MultipleChoiceInteraction

    expect(after?.prompt.value).toBe('Reworded MC prompt')
    expect(interaction.options[0].content.value).toBe('A rewritten first option')
    expect(interaction.options).toHaveLength(optionCount)

    expect(after?.id).toBe(before.id)
    expect(after?.createdAt).toBe(before.createdAt)
    expect(after?.deckId).toBe(before.deckId)
    expect(after?.suspended).toBe(before.suspended)
    expect(after?.order).toBe(before.order)
    expect(after?.scheduling).toEqual(before.scheduling)
    // History for that id is still attached, because the id never changed.
    expect(entities.reviewLogs.some((log) => log.cardId === before.id)).toBe(true)
  })

  it('can add an option to an existing card without minting a new card', async () => {
    const before = await seededReviewedMc()
    const optionCount = (before.interaction as MultipleChoiceInteraction).options.length
    const cardCount = (await storedEntities()).cards.length

    await mount(<EditHost cardId={before.id} />)
    fireEvent.press(screen.getByLabelText('Add option'))
    setOption(optionCount, 'A newly added option')
    await pressSave('Save card')

    const entities = await storedEntities()
    expect(entities.cards).toHaveLength(cardCount)
    const interaction = entities.cards.find((card) => card.id === before.id)
      ?.interaction as MultipleChoiceInteraction
    expect(interaction.options).toHaveLength(optionCount + 1)
    expect(interaction.options[optionCount].content.value).toBe('A newly added option')
  })
})

describe('deleting a Multiple Choice card', () => {
  it('deletes from the row actions sheet behind a confirmation, and stays on the deck', async () => {
    await mount(<DeckHost deckId={DECK_ID} />)

    const viewModel = demoDeckViewModel(await storedEntities(), DECK_ID, Date.now())
    const target = viewModel?.cards.find((card) => card.interactionType === 'multiple_choice')
    expect(target).toBeTruthy()

    const logsBefore = (await storedEntities()).reviewLogs.length

    fireEvent.press(screen.getByLabelText(`Actions for ${target!.prompt}`))
    // An authorable type, so Edit is offered here as well.
    expect(screen.getByLabelText('Edit card')).toBeTruthy()
    fireEvent.press(screen.getByLabelText('Delete card'))

    expect(screen.getByText('Delete this card?')).toBeTruthy()
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Delete card'))
    })
    await settleQueries()

    const after = await storedEntities()
    expect(after.cards.some((card) => card.id === target!.id)).toBe(false)
    // Card deletion cascades nothing; orphan history is allowed on purpose.
    expect(after.reviewLogs).toHaveLength(logsBefore)
    expect(screen.getByText('Cards')).toBeTruthy()
  })
})

describe('Reset Demo', () => {
  it('discards an authored Multiple Choice card and restores the deterministic seed', async () => {
    await mount(<CreateHost />)
    const seededCount = seen.cards.length

    fillValidCard('Ephemeral MC prompt')
    await pressSave()
    expect(seen.cards).toHaveLength(seededCount + 1)

    await act(async () => {
      demo.resetDemoWorkspace()
    })
    await settleQueries()

    expect(seen.cards).toHaveLength(seededCount)
    expect(seen.cards.some((card) => card.prompt.value === 'Ephemeral MC prompt')).toBe(false)
  })
})
