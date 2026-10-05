// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { getRepository } from '@fliptap/core'
import { DeckCreateDialog } from './DeckCreateDialog'

function renderDialog(onClose: () => void) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <DeckCreateDialog parentId="parent" parentName="Systems" returnFocusTo={null} onClose={onClose} />
    </QueryClientProvider>,
  )
}

describe('DeckCreateDialog', () => {
  beforeEach(async () => getRepository().decks.clear())
  afterEach(() => cleanup())

  it('creates a named child deck with the selected icon', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderDialog(onClose)

    expect(screen.getByRole('button', { name: 'Create deck' }).hasAttribute('disabled')).toBe(true)
    await user.type(screen.getByLabelText('Deck name'), '  Memory model  ')
    await user.click(screen.getByRole('button', { name: 'Choose icon' }))
    await user.click(screen.getByRole('button', { name: 'Systems', exact: true }))
    await user.click(screen.getByRole('button', { name: 'Memory', exact: true }))
    await user.click(screen.getByRole('button', { name: 'Create deck' }))

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
    expect(await getRepository().decks.getAll()).toEqual([
      expect.objectContaining({ name: 'Memory model', parentId: 'parent', iconId: 'memory' }),
    ])
  })

  it('creates nothing when a filled form is cancelled', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderDialog(onClose)

    await user.type(screen.getByLabelText('Deck name'), 'Discarded deck')
    await user.click(screen.getByRole('button', { name: 'Choose icon' }))
    await user.click(screen.getByRole('button', { name: 'Terminal', exact: true }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onClose).toHaveBeenCalledOnce()
    expect(await getRepository().decks.getAll()).toEqual([])
  })
})
