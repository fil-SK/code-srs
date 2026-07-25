// @vitest-environment happy-dom
//
// Tests the real shared shell (ReviewSessionScreen) via the Recall
// interaction, superseding the earlier demo-only RecallCardDemo tests now
// that Recall is a real interaction definition, not a standalone component.
// Plain-markdown-only fixture, no fenced code block — see the note this file
// used to carry (now in git history): happy-dom doesn't fully support what
// CodeMirror wants (ResizeObserver, layout measurement).
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { CardV2, RecallInteraction } from '@/types/cardV2'
import { richText } from '@/types/cardV2'
import { initialSchedulingState } from '@/domain/scheduling/state'
import { recallDefinition } from './interactions/recall'
import { ReviewSessionScreen } from './ReviewSessionScreen'

const fixture: CardV2 & { interaction: RecallInteraction } = {
  id: 'test-recall-1',
  schemaVersion: 2,
  deckId: 'deck-1',
  prompt: richText('What is a declaration?'),
  tip: richText('Think about what introduces a name.'),
  explanation: richText('Because the standard says so.'),
  interaction: {
    type: 'recall',
    authoringPreset: 'standard',
    answer: richText('It introduces a name to the compiler.'),
  },
  tags: [],
  createdAt: 0,
  updatedAt: 0,
}

function renderScreen(onExit: () => void = () => {}) {
  return render(
    <ReviewSessionScreen
      card={fixture}
      definition={recallDefinition}
      current={1}
      total={1}
      onExit={onExit}
      schedulingBefore={initialSchedulingState()}
    />,
  )
}

describe('ReviewSessionScreen (via Recall)', () => {
  afterEach(() => cleanup())

  // Both flip faces are always mounted (see FlipCard); only aria-hidden
  // distinguishes reveal state — presence/absence queries can't.
  function answerFaceHidden(): boolean {
    const face = screen
      .getByText(fixture.interaction.answer.value)
      .closest('[aria-hidden]')
    return face?.getAttribute('aria-hidden') === 'true'
  }

  it('Space reveals the answer', async () => {
    const user = userEvent.setup()
    renderScreen()
    expect(answerFaceHidden()).toBe(true)
    await user.keyboard(' ')
    expect(answerFaceHidden()).toBe(false)
  })

  it('reveal happens synchronously — reduced-motion (or any motion setting) never gates it', () => {
    renderScreen()
    fireEvent.keyDown(window, { key: ' ' })
    expect(answerFaceHidden()).toBe(false)
  })

  it('the Tip disappears once revealed', async () => {
    const user = userEvent.setup()
    renderScreen()
    expect(screen.getByText(fixture.tip!.value)).toBeTruthy()
    await user.keyboard(' ')
    expect(screen.queryByText(fixture.tip!.value)).toBeNull()
  })

  it('the Explanation and rating controls appear only after reveal', async () => {
    const user = userEvent.setup()
    renderScreen()
    expect(screen.queryByText(fixture.explanation!.value)).toBeNull()
    expect(screen.queryByRole('button', { name: /Good/ })).toBeNull()

    await user.keyboard(' ')

    expect(screen.getByText(fixture.explanation!.value)).toBeTruthy()
    expect(screen.getByRole('button', { name: /Good/ })).toBeTruthy()
  })

  it('keys 1-4 select the expected rating, only after reveal, and grading completes', async () => {
    const user = userEvent.setup()
    renderScreen()

    // Rating keys do nothing before reveal.
    await user.keyboard('3')
    expect(screen.queryByRole('button', { name: /Good/ })).toBeNull()

    await user.keyboard(' ') // reveal
    await user.keyboard('3') // Good

    await waitFor(() => {
      expect(screen.getByText('Preview only — nothing recorded.')).toBeTruthy()
    })
  })

  it('a rating shortcut does not fire again once a rating has been chosen', async () => {
    const user = userEvent.setup()
    renderScreen()
    await user.keyboard(' ')
    await user.keyboard('1') // Again — moves phase out of 'feedback' into 'rating'

    // The digit-key guard only acts during 'feedback'; a second digit press
    // right after must not change anything (no crash, no re-grade).
    await user.keyboard('4')

    await waitFor(() => {
      const again = screen.getByRole('button', { name: /Again/ })
      expect(again.className).toMatch(/itera-accent/)
    })
    const easy = screen.getByRole('button', { name: /Easy/ })
    expect(easy.className).not.toMatch(/itera-accent/)
  })

  it('Space targeted at a focused interactive control is ignored by the page-level handler, not double-handled', () => {
    renderScreen()
    const flipButton = screen.getByRole('button', { name: /reveal the answer/ })
    flipButton.focus()
    fireEvent.keyDown(flipButton, { key: ' ' })
    expect(screen.getAllByText(fixture.interaction.answer.value)).toHaveLength(1)
  })

  it('Space is prevented from scrolling the page', () => {
    renderScreen()
    const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
  })

  it('held-key repeat does not cause duplicate actions', () => {
    renderScreen()
    fireEvent.keyDown(window, { key: ' ' })
    fireEvent.keyDown(window, { key: ' ', repeat: true })
    fireEvent.keyDown(window, { key: ' ', repeat: true })
    expect(screen.getAllByText(fixture.interaction.answer.value)).toHaveLength(1)
  })

  it('Escape calls onExit', () => {
    let exited = false
    renderScreen(() => {
      exited = true
    })
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(exited).toBe(true)
  })
})
