// @vitest-environment happy-dom
//
// Adjust session is a transient session configuration: deck scope plus card
// count, nothing persisted. These assert the URL it builds (the whole contract
// between it and /review), that the counts it shows match the subtree scope
// /review will actually use, and that a bad custom value cannot start a
// session.
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import type { Card, Deck, SchedulingState } from '@/types'
import { richText } from '@/types/card'
import { AdjustSessionDialog } from './AdjustSessionDialog'

const decks: Deck[] = [
  { id: 'deck-1', name: 'Compilers', createdAt: 0, updatedAt: 0 },
  { id: 'deck-1a', name: 'MLIR', parentId: 'deck-1', createdAt: 0, updatedAt: 0 },
  { id: 'deck-2', name: 'Systems', createdAt: 0, updatedAt: 0 },
]

const scheduling: SchedulingState = {
  due: 0,
  stability: 4,
  difficulty: 5,
  elapsedDays: 1,
  scheduledDays: 4,
  reps: 2,
  lapses: 0,
  learningSteps: 0,
  state: 'review',
}

function card(id: string, deckId: string): Card {
  return {
    id,
    schemaVersion: 2,
    deckId,
    prompt: richText(id),
    interaction: { type: 'recall', answer: richText('a') },
    tags: [],
    createdAt: 0,
    updatedAt: 0,
    suspended: false,
    scheduling,
  }
}

// deck-1 subtree holds 5 due cards (3 direct + 2 in its child deck);
// deck-2 holds 2. Twelve in total would be wrong - the point is that the
// subtree number, not the direct-children number, is what surfaces.
const dueCards: Card[] = [
  card('a1', 'deck-1'),
  card('a2', 'deck-1'),
  card('a3', 'deck-1'),
  card('m1', 'deck-1a'),
  card('m2', 'deck-1a'),
  card('s1', 'deck-2'),
  card('s2', 'deck-2'),
]

function LocationProbe() {
  const location = useLocation()
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>
}

function renderDialog(cards: Card[] = dueCards) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route
          path="/"
          element={<AdjustSessionDialog decks={decks} dueCards={cards} onClose={() => {}} />}
        />
        <Route path="/review" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

const user = userEvent.setup()

function destination(): string {
  return screen.getByTestId('location').textContent ?? ''
}

async function start() {
  await user.click(screen.getByRole('button', { name: 'Start session' }))
}

async function chooseSize(label: string) {
  await user.click(screen.getByRole('button', { name: label }))
}

// No jest-dom in this suite (see vitest.config.ts) - read the property.
function startDisabled(): boolean {
  return (screen.getByRole('button', { name: 'Start session' }) as HTMLButtonElement).disabled
}

describe('AdjustSessionDialog', () => {
  afterEach(() => cleanup())

  it('defaults to every due card and starts the plain queue', async () => {
    renderDialog()
    expect(screen.getByText('All due cards')).toBeTruthy()
    expect(screen.getByText('Starts 7 cards.')).toBeTruthy()

    await start()
    expect(destination()).toBe('/review')
  })

  it('scopes to one deck and counts its whole subtree', async () => {
    renderDialog()
    await user.click(screen.getByRole('radio', { name: /One deck/ }))

    // deck-1 sorts first alphabetically among leaf decks; MLIR is its child.
    await user.selectOptions(screen.getByLabelText('Deck'), 'deck-1')
    expect(screen.getByText('Starts 5 cards.')).toBeTruthy()

    await start()
    expect(destination()).toBe('/review?deck=deck-1')
  })

  // /review?deck= scopes by subtree, so a parent deck is a legitimate choice;
  // the path label keeps a nested deck unambiguous.
  it('offers every deck, in tree order, with its full path', async () => {
    renderDialog()
    await user.click(screen.getByRole('radio', { name: /One deck/ }))
    const options = within(screen.getByLabelText('Deck')).getAllByRole('option')
    expect(options.map((o) => o.textContent)).toEqual([
      'Compilers',
      'Compilers / MLIR',
      'Systems',
    ])
  })

  it('counts only the selected deck when it has no children', async () => {
    renderDialog()
    await user.click(screen.getByRole('radio', { name: /One deck/ }))
    await user.selectOptions(screen.getByLabelText('Deck'), 'deck-1a')
    expect(screen.getByText('Starts 2 cards.')).toBeTruthy()
  })

  it.each([
    ['10', '/review?limit=10'],
    ['20', '/review?limit=20'],
    ['30', '/review?limit=30'],
  ])('passes the %s-card preset as a limit', async (label, expected) => {
    renderDialog(Array.from({ length: 40 }, (_, i) => card(`c${i}`, 'deck-2')))
    await chooseSize(label)
    await start()
    expect(destination()).toBe(expected)
  })

  it('accepts a valid custom count', async () => {
    renderDialog(Array.from({ length: 40 }, (_, i) => card(`c${i}`, 'deck-2')))
    await chooseSize('Custom')
    await user.type(screen.getByLabelText('Number of cards'), '7')
    expect(screen.getByText('Starts 7 cards.')).toBeTruthy()

    await start()
    expect(destination()).toBe('/review?limit=7')
  })

  it.each(['0', '-4', 'abc'])('refuses to start on the invalid custom value %o', async (raw) => {
    renderDialog()
    await chooseSize('Custom')
    await user.type(screen.getByLabelText('Number of cards'), raw)

    const field = screen.getByLabelText('Number of cards')
    // A number input drops non-numeric text outright; either way it must not
    // resolve to a session size.
    if (field.getAttribute('aria-invalid') === 'true') {
      expect(screen.getByText('Enter a whole number of cards, 1 or more.')).toBeTruthy()
    }
    expect(startDisabled()).toBe(true)
    // And the summary must not advertise a count Start will not honor.
    expect(screen.getByRole('status').textContent).toBe('Enter how many cards to study.')
  })

  it('cannot start while the custom field is empty', async () => {
    renderDialog()
    await chooseSize('Custom')
    expect(startDisabled()).toBe(true)
    expect(screen.getByRole('status').textContent).toBe('Enter how many cards to study.')
  })

  it('caps a preset larger than the scope, and says so', async () => {
    renderDialog()
    await chooseSize('30')
    expect(screen.getByText("Starts 7 cards — that's everything due in this scope.")).toBeTruthy()

    // The URL still carries what was asked for; /review caps it against the
    // real queue, so the two can never disagree.
    await start()
    expect(destination()).toBe('/review?limit=30')
  })

  it('combines deck scope and limit', async () => {
    renderDialog()
    await user.click(screen.getByRole('radio', { name: /One deck/ }))
    await user.selectOptions(screen.getByLabelText('Deck'), 'deck-2')
    await chooseSize('10')
    await start()
    expect(destination()).toBe('/review?deck=deck-2&limit=10')
  })

  it('will not start a session in a scope with nothing due', async () => {
    renderDialog([card('s1', 'deck-2')])
    await user.click(screen.getByRole('radio', { name: /One deck/ }))
    await user.selectOptions(screen.getByLabelText('Deck'), 'deck-1a')

    expect(screen.getByText('Nothing is due in this scope.')).toBeTruthy()
    expect(startDisabled()).toBe(true)
  })

  it('closes on Escape', async () => {
    let closed = false
    render(
      <MemoryRouter>
        <AdjustSessionDialog
          decks={decks}
          dueCards={dueCards}
          onClose={() => {
            closed = true
          }}
        />
      </MemoryRouter>,
    )
    await user.keyboard('{Escape}')
    expect(closed).toBe(true)
  })
})
