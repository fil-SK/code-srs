// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Card } from '@/types'
import { getRepository } from '@/data'
import { initialSchedulingState } from '@/domain/scheduling/state'
import { newId } from '@/lib/id'
import { CardStateMigrationSection } from './CardStateMigrationSection'

function basicCard(overrides: Partial<Card> = {}): Card {
  const now = 1_000
  return {
    id: newId(),
    deckId: 'deck-1',
    tags: [],
    createdAt: now,
    updatedAt: now,
    suspended: false,
    scheduling: initialSchedulingState(now),
    type: 'basic',
    content: { front: 'Q', back: 'A' },
    ...overrides,
  } as Card
}

describe('CardStateMigrationSection', () => {
  beforeEach(async () => {
    const repo = getRepository()
    await repo.cards.clear()
    await repo.cardStates.clear()
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('Apply is disabled until a dry run has actually run, and a dry run writes nothing', async () => {
    const repo = getRepository()
    const card = basicCard()
    await repo.cards.put(card)

    const user = userEvent.setup()
    render(<CardStateMigrationSection />)

    const apply = screen.getByRole('button', { name: 'Apply' }) as HTMLButtonElement
    expect(apply.disabled).toBe(true)

    await user.click(screen.getByRole('button', { name: 'Run dry run' }))

    expect(await screen.findByText('Dry run only — nothing written yet.')).toBeTruthy()
    expect(await repo.cardStates.getAll()).toHaveLength(0)
    expect((screen.getByRole('button', { name: 'Apply' }) as HTMLButtonElement).disabled).toBe(
      false,
    )
  })

  it('Apply confirms, then writes real CardState rows matching the cards', async () => {
    const repo = getRepository()
    const card = basicCard({ suspended: true })
    await repo.cards.put(card)

    vi.stubGlobal('confirm', vi.fn(() => true))
    const user = userEvent.setup()
    render(<CardStateMigrationSection />)

    await user.click(screen.getByRole('button', { name: 'Run dry run' }))
    await screen.findByText('Dry run only — nothing written yet.')
    await user.click(screen.getByRole('button', { name: 'Apply' }))

    expect(await screen.findByText('Applied.')).toBeTruthy()
    const state = await repo.cardStates.getById(card.id)
    expect(state?.suspended).toBe(true)
    expect(state?.cardId).toBe(card.id)
  })

  it('does not write anything if the confirm dialog is declined', async () => {
    const repo = getRepository()
    const card = basicCard()
    await repo.cards.put(card)

    vi.stubGlobal('confirm', vi.fn(() => false))
    const user = userEvent.setup()
    render(<CardStateMigrationSection />)

    await user.click(screen.getByRole('button', { name: 'Run dry run' }))
    await screen.findByText('Dry run only — nothing written yet.')
    await user.click(screen.getByRole('button', { name: 'Apply' }))

    expect(screen.queryByText('Applied.')).toBeNull()
    expect(await repo.cardStates.getAll()).toHaveLength(0)
  })
})
