// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { CardV2, WriteCodeInteraction } from '@/types/cardV2'
import { richText } from '@/types/cardV2'
import { initialSchedulingState } from '@/domain/scheduling/state'
import { writeCodeDefinition } from './index'
import { ReviewSessionScreen } from '../../ReviewSessionScreen'

// Real CodeMirror 6 has no existing precedent mounted under happy-dom in this
// repo (it relies on DOM measurement APIs jsdom-like environments can stub
// incompletely). These stubs keep the `.cm-editor` class CodeMirror's real
// root always carries — the class ReviewSessionScreen's isInteractiveTarget
// guard checks — so the keyboard-guard test below still exercises real
// component wiring, just not CodeMirror's own rendering.
vi.mock('@/components/code/LazyCodeEditor', () => ({
  LazyCodeEditor: ({
    value,
    onChange,
  }: {
    value: string
    language: string
    onChange: (value: string) => void
  }) => (
    <textarea
      data-testid="code-editor"
      className="cm-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}))
vi.mock('@/components/code/LazyCodeView', () => ({
  LazyCodeView: ({ code }: { code: string; language: string }) => (
    <div data-testid="code-view" className="cm-editor">
      {code}
    </div>
  ),
}))

const comparison = {
  trimOuterWhitespace: true,
  normalizeLineEndings: true,
  ignoreTrailingWhitespace: true,
  caseSensitive: true,
}

function fixture(interaction: WriteCodeInteraction): CardV2 & { interaction: WriteCodeInteraction } {
  return {
    id: 'test-write-code-1',
    schemaVersion: 2,
    deckId: 'deck-1',
    prompt: richText('Return the sum.'),
    interaction,
    tags: [],
    createdAt: 0,
    updatedAt: 0,
  }
}

function renderScreen(interaction: WriteCodeInteraction) {
  return render(
    <ReviewSessionScreen
      card={fixture(interaction)}
      definition={writeCodeDefinition}
      current={1}
      total={1}
      onExit={() => {}}
      schedulingBefore={initialSchedulingState()}
    />,
  )
}

describe('WriteCodeView', () => {
  afterEach(() => cleanup())

  it('submitting an already-correct answer shows Correct with no expected-answer panel', async () => {
    const user = userEvent.setup()
    renderScreen({
      type: 'write_code',
      language: 'cpp',
      starterCode: 'return 0;',
      acceptedAnswers: ['return 0;'],
      comparison,
    })

    await user.click(screen.getByRole('button', { name: 'Submit answer' }))

    expect(await screen.findByText('Correct')).toBeTruthy()
    expect(screen.queryByText('Expected answer')).toBeNull()
  })

  it('submitting an incorrect answer shows Incorrect and the expected answer', async () => {
    const user = userEvent.setup()
    renderScreen({
      type: 'write_code',
      language: 'cpp',
      starterCode: 'return 1;',
      acceptedAnswers: ['return 0;'],
      comparison,
    })

    await user.click(screen.getByRole('button', { name: 'Submit answer' }))

    expect(await screen.findByText('Incorrect')).toBeTruthy()
    expect(screen.getByText('Expected answer')).toBeTruthy()
    expect(screen.getByText('return 0;')).toBeTruthy()
  })

  it("preserves the learner's submitted answer in the feedback state", async () => {
    const user = userEvent.setup()
    renderScreen({
      type: 'write_code',
      language: 'cpp',
      starterCode: 'return 0;',
      acceptedAnswers: ['return 0;'],
      comparison,
    })

    const editor = screen.getByTestId('code-editor')
    await user.clear(editor)
    await user.type(editor, 'return 2;')
    await user.click(screen.getByRole('button', { name: 'Submit answer' }))

    expect(await screen.findByText('Incorrect')).toBeTruthy()
    // The frozen, read-only view shows exactly what the learner submitted,
    // not the original starter code.
    expect(screen.getAllByTestId('code-view')[0].textContent).toBe('return 2;')
  })

  it('rating is unavailable before submission and appears once feedback exists', async () => {
    const user = userEvent.setup()
    renderScreen({
      type: 'write_code',
      language: 'cpp',
      starterCode: 'return 0;',
      acceptedAnswers: ['return 0;'],
      comparison,
    })

    expect(screen.queryByRole('button', { name: /again|hard|good|easy/i })).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Submit answer' }))

    expect(await screen.findByText('Correct')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: /again|hard|good|easy/i })).toHaveLength(4)
  })

  it('digits/Enter while the code editor has focus do not trigger rate/submit; rating works once focus moves away', async () => {
    const user = userEvent.setup()
    renderScreen({
      type: 'write_code',
      language: 'cpp',
      starterCode: 'return 0;',
      acceptedAnswers: ['return 0;'],
      comparison,
    })

    const editor = screen.getByTestId('code-editor')
    editor.focus()
    // Raw keydown (not user.keyboard's higher-level typing simulation, which
    // would actually mutate the textarea's content and change what gets
    // submitted) — this isolates the assertion to the guard itself: does a
    // keydown whose target is inside `.cm-editor` get excluded from the
    // shell's global Enter-to-submit shortcut.
    fireEvent.keyDown(editor, { key: 'Enter' })

    // Still presenting: Enter inside the editor did not submit.
    expect(screen.getByRole('button', { name: 'Submit answer' })).toBeTruthy()
    expect(screen.queryByText(/^(Correct|Incorrect)$/)).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Submit answer' }))
    expect(await screen.findByText('Correct')).toBeTruthy()

    // Now in feedback with focus outside any editor: rating proceeds normally.
    await user.keyboard('3')
    await waitFor(() => {
      const good = screen.getByRole('button', { name: /Good/ })
      expect(good.className).toMatch(/itera-accent/)
    })
  })
})
