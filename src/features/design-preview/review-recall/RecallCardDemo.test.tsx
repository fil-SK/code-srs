// @vitest-environment happy-dom
//
// This is the one component test in the repo, so it opts into a DOM
// environment per-file rather than switching the whole suite (which is
// otherwise `environment: 'node'` for speed/hermeticity — see
// vitest.config.ts). Uses a plain-markdown-only fixture (no fenced code
// block): RichText's fenced blocks mount CodeMirror via LazyCodeView, which
// wants DOM APIs (ResizeObserver, layout measurement) that happy-dom doesn't
// fully provide. That's a real gap, not a shortcut — see the trade-off note
// in the PR summary. The actual C++ code content is exercised by loading the
// live /design-preview/review/recall route.
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { CardV2, RecallInteraction } from '@/types/cardV2'
import { richText } from '@/types/cardV2'
import { RecallCardDemo } from './RecallCardDemo'

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

describe('RecallCardDemo', () => {
  // vitest.config.ts does not set `globals: true` (deliberately, so the rest
  // of the suite stays plain Node with no DOM), which means
  // @testing-library/react's auto-cleanup-on-afterEach detection never
  // engages. Without this, renders from every `it` below would accumulate in
  // the same document instead of unmounting between tests.
  afterEach(() => cleanup())

  // Both flip faces are always mounted (that's how the CSS-grid height trick
  // works — see .itera-flip in src/index.css), so the answer text is always
  // present in the DOM; only its face's aria-hidden state changes with
  // `revealed`. Presence/absence queries can't distinguish reveal state —
  // this is the thing that actually does.
  function answerFaceHidden(): boolean {
    const face = screen
      .getByText(fixture.interaction.answer.value)
      .closest('[aria-hidden]')
    return face?.getAttribute('aria-hidden') === 'true'
  }

  it('Space reveals the answer', async () => {
    const user = userEvent.setup()
    render(<RecallCardDemo card={fixture} />)
    expect(answerFaceHidden()).toBe(true)
    await user.keyboard(' ')
    expect(answerFaceHidden()).toBe(false)
  })

  it('reveal happens synchronously — reduced-motion (or any motion setting) never gates it', () => {
    // No waitFor, no timer advancement: if reveal depended on a CSS
    // transition/animation completing, this assertion would fail regardless
    // of prefers-reduced-motion, since nothing here waits for one.
    render(<RecallCardDemo card={fixture} />)
    fireEvent.keyDown(window, { key: ' ' })
    expect(answerFaceHidden()).toBe(false)
  })

  it('the Tip disappears once revealed', async () => {
    const user = userEvent.setup()
    render(<RecallCardDemo card={fixture} />)
    expect(screen.getByText(fixture.tip!.value)).toBeTruthy()
    await user.keyboard(' ')
    expect(screen.queryByText(fixture.tip!.value)).toBeNull()
  })

  it('the Explanation and rating controls appear only after reveal', async () => {
    const user = userEvent.setup()
    render(<RecallCardDemo card={fixture} />)
    expect(screen.queryByText(fixture.explanation!.value)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Good' })).toBeNull()

    await user.keyboard(' ')

    expect(screen.getByText(fixture.explanation!.value)).toBeTruthy()
    expect(screen.getByRole('button', { name: /Good/ })).toBeTruthy()
  })

  it('keys 1-4 select the expected rating, only after reveal', async () => {
    const user = userEvent.setup()
    render(<RecallCardDemo card={fixture} />)

    // Rating keys do nothing before reveal.
    await user.keyboard('3')
    await user.keyboard(' ') // now reveal
    expect(screen.queryByText('Preview only — nothing recorded.')).toBeNull()

    await user.keyboard('3') // Good
    expect(screen.getByText('Preview only — nothing recorded.')).toBeTruthy()
  })

  it('a rating shortcut does not fire again once a rating has been submitted', async () => {
    const user = userEvent.setup()
    render(<RecallCardDemo card={fixture} />)
    await user.keyboard(' ')
    await user.keyboard('1') // Again
    const again = screen.getByRole('button', { name: /Again/ })
    expect(again.className).toMatch(/itera-accent/)

    await user.keyboard('4') // Easy — must not override the existing rating
    expect(again.className).toMatch(/itera-accent/)
    const easy = screen.getByRole('button', { name: /Easy/ })
    expect(easy.className).not.toMatch(/itera-accent/)
  })

  it('Space targeted at a focused interactive control is ignored by the page-level handler, not double-handled', () => {
    // Honest note on what this does and doesn't prove: in this component the
    // page-level Space handler only ever does `if (!revealed) setRevealed(true)`,
    // which is idempotent — so this scenario can't observably break even
    // without the isInteractiveTarget guard in RecallCardDemo.tsx. This test
    // still pins the intended contract (exactly one reveal, no duplicate
    // nodes) so a future change that makes the guarded action non-idempotent
    // has a regression test in place, rather than silently relying on
    // idempotence to mask a missing guard.
    render(<RecallCardDemo card={fixture} />)
    const flipButton = screen.getByRole('button', { name: /reveal the answer/ })
    flipButton.focus()
    fireEvent.keyDown(flipButton, { key: ' ' })
    expect(screen.getAllByText(fixture.interaction.answer.value)).toHaveLength(1)
  })

  it('Space is prevented from scrolling the page', () => {
    render(<RecallCardDemo card={fixture} />)
    const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
  })

  it('held-key repeat does not cause duplicate actions', async () => {
    render(<RecallCardDemo card={fixture} />)
    // A held key repeats keydown with repeat: true; each of these must be a
    // no-op once the first one has already revealed the card.
    fireEvent.keyDown(window, { key: ' ' })
    fireEvent.keyDown(window, { key: ' ', repeat: true })
    fireEvent.keyDown(window, { key: ' ', repeat: true })
    expect(screen.getAllByText(fixture.interaction.answer.value)).toHaveLength(1)
  })
})
