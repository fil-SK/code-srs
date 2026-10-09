// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ThemeProvider } from '@/app/theme'
import { CardFormatDemo } from './CardFormatDemo'

afterEach(cleanup)

function renderDemo() {
  render(<ThemeProvider><CardFormatDemo /></ThemeProvider>)
}

describe('About card samples', () => {
  it('opens Recall first, reveals its answer and resets the attempt', () => {
    renderDemo()
    expect(screen.getByRole('button', { name: /^Recall(?: Think|$)/ }).getAttribute('aria-pressed')).toBe('true')
    expect(fireEvent.keyDown(document.body, { key: ' ', code: 'Space' })).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Recall card, click or press Space to reveal the answer' }))
    expect(screen.getByRole('button', { name: 'Recall card, answer showing' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(screen.getByRole('button', { name: 'Recall card, click or press Space to reveal the answer' })).toBeTruthy()
  })

  it('grades an actual choice and clears feedback when switching types', () => {
    renderDemo()
    fireEvent.click(screen.getByRole('button', { name: /^Multiple Choice/ }))
    fireEvent.click(screen.getByRole('radio', { name: 'Stack' }))
    fireEvent.click(screen.getByRole('button', { name: 'Submit answer' }))
    expect(screen.getByRole('button', { name: 'Multiple choice card, results showing' })).toBeTruthy()
    expect(screen.getByText(/A stack removes/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /^Good/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /^Recall(?: Think|$)/ }))
    expect(screen.getByRole('button', { name: 'Recall card, click or press Space to reveal the answer' })).toBeTruthy()
  })
})
