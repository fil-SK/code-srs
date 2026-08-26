import { stripInlineMarkers, type Card, type InteractionType } from '@itera/core'
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native'
import { QueryClientProvider } from '@tanstack/react-query'

import { DemoWorkspaceProvider } from '@/src/demo/DemoWorkspaceProvider'
import { useDemoEntities, type DemoEntities } from '@/src/demo/demoEntities'
import { createTestQueryClient, settleQueries } from '@/src/test/demoHarness'
import { mockReducedMotion } from '@/src/test/reviewHarness'
import { CardStudyScreen } from './CardStudyScreen'

// Card study over the real composed demo runtime, for all six interaction types.
//
// Two things are being proved, and the second is the reason this file exists.
//
// The first is coverage: every interaction type renders through the same
// registry and the same session shell a session uses, so a card can be
// inspected exactly as it would be reviewed.
//
// The second is the non-persistence guarantee. Study is not a review, so
// nothing may be recorded - no ReviewLog, no scheduling change, no due change.
// That is asserted against the live repository-backed entities after the card
// has actually been answered, because "no write happened" is only meaningful
// once the code path that would have written has run.
//
// The per-type semantics themselves are covered by the six interaction files
// and by core; what is asserted here is the study surface around them.

mockReducedMotion()
afterEach(cleanup)

const TYPES: InteractionType[] = [
  'recall',
  'multiple_choice',
  'write_code',
  'ordering',
  'matching',
  'walkthrough',
]

let entities: DemoEntities
let studied: Card

function StudyHost({
  pick,
  exits,
}: {
  pick: (cards: Card[]) => Card | undefined
  exits: { count: number }
}) {
  const seen = useDemoEntities()
  entities = { decks: seen.decks, cards: seen.cards, reviewLogs: seen.reviewLogs }
  // Taken from what the shared hooks actually read rather than a separately
  // built fixture, so the card under test is the same record the assertions
  // read back.
  if (seen.isLoading) return null
  const card = pick(seen.cards)
  if (!card) throw new Error('The demo dataset has no card matching this test.')
  studied = card
  return <CardStudyScreen card={card} onExit={() => (exits.count += 1)} />
}

async function renderStudyCard(pick: (cards: Card[]) => Card | undefined) {
  const exits = { count: 0 }
  const view = render(
    <QueryClientProvider client={createTestQueryClient()}>
      <DemoWorkspaceProvider>
        <StudyHost exits={exits} pick={pick} />
      </DemoWorkspaceProvider>
    </QueryClientProvider>,
  )
  await settleQueries()
  return { ...view, exits }
}

function renderStudy(type: InteractionType) {
  return renderStudyCard((cards) => cards.find((card) => card.interaction.type === type))
}

/** Drives the card to its revealed state, the way its type is meant to be answered. */
async function inspect(card: Card) {
  const interaction = card.interaction

  switch (interaction.type) {
    case 'recall':
      fireEvent.press(screen.getByLabelText('Recall card, question showing'))
      break

    case 'multiple_choice': {
      const correct = interaction.options.filter((option) => option.correct)
      for (const option of correct) {
        fireEvent.press(screen.getByLabelText(stripInlineMarkers(option.content.value)))
      }
      fireEvent.press(screen.getByText('Submit answer'))
      break
    }

    case 'write_code':
      fireEvent.changeText(
        screen.getByLabelText(/answer editor$/),
        interaction.acceptedAnswers[0],
      )
      fireEvent.press(screen.getByText('Submit answer'))
      break

    case 'ordering':
      // The presented order is seeded on mount, so agreeing with it is already
      // a response - orderingBehavior's readiness rule, not a local one.
      fireEvent.press(screen.getByText('Submit answer'))
      break

    case 'matching': {
      const [sourceColumn, valueColumn] = interaction.columns
      const labelOf = (columnIndex: number, itemId: string) =>
        stripInlineMarkers(
          interaction.columns[columnIndex].items.find((entry) => entry.id === itemId)!.content
            .value,
        )
      for (const row of interaction.relationships) {
        const sourceId = row[sourceColumn.id]
        fireEvent.press(screen.getByLabelText(new RegExp(`^${escape(labelOf(0, sourceId))},`)))
        await settleQueries()
        fireEvent.press(
          screen.getByLabelText(new RegExp(`^${escape(labelOf(1, row[valueColumn.id]))}`)),
        )
        await settleQueries()
      }
      fireEvent.press(screen.getByText('Submit answer'))
      break
    }

    case 'walkthrough': {
      for (const [index, step] of interaction.steps.entries()) {
        if (step.response.type === 'exact_input') {
          fireEvent.changeText(
            screen.getByLabelText('Walkthrough step answer'),
            step.response.acceptedAnswers[0],
          )
          fireEvent.press(screen.getByText('Submit step'))
        } else if (step.response.type === 'multiple_choice') {
          const correct = step.response.options.find((option) => option.correct)!
          fireEvent.press(screen.getByLabelText(stripInlineMarkers(correct.content.value)))
          fireEvent.press(screen.getByText('Submit step'))
        } else {
          fireEvent.press(screen.getByText('Reveal answer'))
        }
        await settleQueries()
        if (index < interaction.steps.length - 1) {
          fireEvent.press(screen.getByText('Continue'))
          await settleQueries()
        }
      }
      fireEvent.press(screen.getByText('Finish'))
      break
    }
  }

  await settleQueries()
}

/** Card content is real prose and carries regex metacharacters. */
function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

describe.each(TYPES)('studying a %s card', (type) => {
  it('renders the canonical card, not a preview fixture', async () => {
    await renderStudy(type)

    expect(studied.interaction.type).toBe(type)
    expect(screen.getByText(stripInlineMarkers(studied.prompt.value))).toBeTruthy()
  })

  it('says plainly that nothing is recorded, before anything is answered', async () => {
    await renderStudy(type)

    expect(screen.getByText('Preview only - nothing recorded.')).toBeTruthy()
    expect(screen.getByText('Preview')).toBeTruthy()
  })

  it('can be inspected through to its revealed state', async () => {
    await renderStudy(type)

    await inspect(studied)

    // The shell's own signal that it reached the revealed phase, which is the
    // one thing every type has in common.
    expect(screen.getByText('Nothing recorded')).toBeTruthy()
  })

  it('never offers a rating', async () => {
    await renderStudy(type)
    expect(screen.queryByText('How well did you recall it?')).toBeNull()

    await inspect(studied)

    expect(screen.queryByText('How well did you recall it?')).toBeNull()
    for (const rating of ['Again', 'Hard', 'Good', 'Easy']) {
      expect(screen.queryByLabelText(new RegExp(`^${rating},`))).toBeNull()
    }
  })

  it('appends no ReviewLog', async () => {
    await renderStudy(type)
    const logs = entities.reviewLogs

    await inspect(studied)

    // Identity, not length: a study surface must not touch the history at all.
    // The array can only change identity if something wrote and invalidated.
    expect(entities.reviewLogs).toBe(logs)
    expect(entities.reviewLogs.some((log) => log.cardId === studied.id)).toBe(
      logs.some((log) => log.cardId === studied.id),
    )
  })

  it('leaves the card s scheduling exactly as it found it', async () => {
    await renderStudy(type)
    const before = entities.cards.find((card) => card.id === studied.id)!.scheduling

    await inspect(studied)

    const after = entities.cards.find((card) => card.id === studied.id)!.scheduling
    expect(after).toBe(before)
    expect(after.due).toBe(before.due)
    expect(after.reps).toBe(before.reps)
  })

  it('exits without recording anything', async () => {
    const { exits } = await renderStudy(type)
    const cards = entities.cards
    const logs = entities.reviewLogs

    await inspect(studied)
    fireEvent.press(screen.getByLabelText('Close card preview'))

    expect(exits.count).toBe(1)
    expect(entities.cards).toBe(cards)
    expect(entities.reviewLogs).toBe(logs)
  })
})

describe('card study across decks', () => {
  it('shows the card it was given, not whichever card came first', async () => {
    const inDeck = (deckId: string) => (cards: Card[]) =>
      cards.find((card) => card.deckId === deckId)

    const cpp = await renderStudyCard(inDeck('fixture-modern-cpp'))
    const first = studied
    expect(cpp.getByText(stripInlineMarkers(first.prompt.value))).toBeTruthy()
    cpp.unmount()

    const algorithms = await renderStudyCard(inDeck('fixture-algorithms'))

    expect(studied.id).not.toBe(first.id)
    expect(studied.deckId).not.toBe(first.deckId)
    expect(algorithms.getByText(stripInlineMarkers(studied.prompt.value))).toBeTruthy()
    expect(algorithms.queryByText(stripInlineMarkers(first.prompt.value))).toBeNull()
  })
})
