// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DeckIconPicker } from './DeckIconPicker'

afterEach(() => cleanup())

describe('DeckIconPicker', () => {
  it('offers fifteen broad choices and excludes retired choices from search', async () => {
    const user = userEvent.setup()
    render(<DeckIconPicker onChange={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Choose icon' }))
    const choices = within(screen.getByRole('group', { name: 'Icon choices' }))
    expect(choices.getAllByRole('button')).toHaveLength(15)
    expect(choices.getByRole('button', { name: 'Database' })).toBeTruthy()
    expect(choices.queryByRole('button', { name: 'Branches' })).toBeNull()
    await user.type(screen.getByLabelText('Search deck icons'), 'git')
    expect(choices.queryAllByRole('button')).toHaveLength(0)
    expect(screen.getByRole('status').textContent).toContain('No matching icons')
  })

  it('preserves a retired selection until a replacement is explicitly chosen', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DeckIconPicker value="git-branch" onChange={onChange} />)
    expect(screen.getByText('Branches')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Choose icon' }))
    expect(onChange).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Database' }))
    expect(onChange).toHaveBeenCalledWith('database')
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Choose icon' }))
  })
})
