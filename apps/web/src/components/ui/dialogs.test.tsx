// @vitest-environment happy-dom
//
// Keyboard/AT correctness for every confirm/prompt/alert in the app, which all
// go through one DialogHost. Before the 2026-08-22 audit pass it took focus on
// open but never contained Tab and never gave focus back, so a keyboard user
// tabbed straight out of a modal into the page behind it.
//
// happy-dom has no visibility semantics (docs/itera-decisions.md D132), so
// these prove the wiring only; the real proof is the browser pass recorded in
// itera-decisions.md. Nothing here is hidden, so focus() behaves.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DialogProvider, useDialogs } from './dialogs'

afterEach(() => cleanup())

const settled = vi.fn()

function Harness() {
  const dialogs = useDialogs()
  return (
    <>
      {/* Deliberately outside the dialog: nothing keyboard-driven may reach it
          while a modal is open. */}
      <button type="button">background</button>
      <button
        type="button"
        onClick={() => void dialogs.confirm({ title: 'Delete deck?', danger: true }).then(settled)}
      >
        open danger
      </button>
      <button type="button" onClick={() => void dialogs.confirm({ title: 'Publish?' }).then(settled)}>
        open confirm
      </button>
      <button
        type="button"
        onClick={() =>
          void dialogs.prompt({ title: 'New deck', initialValue: 'Compilers' }).then(settled)
        }
      >
        open prompt
      </button>
      <button type="button" onClick={() => void dialogs.alert({ title: 'Deck not empty' }).then(settled)}>
        open alert
      </button>
    </>
  )
}

function renderHarness() {
  return render(
    <DialogProvider>
      <Harness />
    </DialogProvider>,
  )
}

function dialogControls(): HTMLElement[] {
  return Array.from(screen.getByRole('dialog').querySelectorAll('button, input'))
}

describe('dialog focus containment', () => {
  it('moves focus into the dialog when it opens', async () => {
    const user = userEvent.setup()
    renderHarness()

    await user.click(screen.getByRole('button', { name: 'open confirm' }))

    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true)
  })

  it('opens a prompt on its input', async () => {
    const user = userEvent.setup()
    renderHarness()

    await user.click(screen.getByRole('button', { name: 'open prompt' }))

    expect(document.activeElement).toBe(screen.getByDisplayValue('Compilers'))
  })

  it('opens a destructive confirm on Cancel, not on Delete', async () => {
    const user = userEvent.setup()
    renderHarness()

    await user.click(screen.getByRole('button', { name: 'open danger' }))

    // So Enter on a dialog the user did not expect dismisses rather than deletes.
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' }))
    expect(document.activeElement).not.toBe(screen.getByRole('button', { name: 'Delete' }))
  })

  it('opens a non-destructive confirm on its confirm button, as it always did', async () => {
    const user = userEvent.setup()
    renderHarness()

    await user.click(screen.getByRole('button', { name: 'open confirm' }))

    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Confirm' }))
  })

  it('wraps Tab from the last control back to the first', async () => {
    const user = userEvent.setup()
    renderHarness()
    await user.click(screen.getByRole('button', { name: 'open confirm' }))

    const controls = dialogControls()
    controls[controls.length - 1].focus()
    await user.tab()

    expect(document.activeElement).toBe(controls[0])
  })

  it('wraps Shift+Tab from the first control back to the last', async () => {
    const user = userEvent.setup()
    renderHarness()
    await user.click(screen.getByRole('button', { name: 'open confirm' }))

    const controls = dialogControls()
    controls[0].focus()
    await user.tab({ shift: true })

    expect(document.activeElement).toBe(controls[controls.length - 1])
  })

  it('never lets keyboard cycling reach the page behind the modal', async () => {
    const user = userEvent.setup()
    renderHarness()
    await user.click(screen.getByRole('button', { name: 'open prompt' }))

    const dialog = screen.getByRole('dialog')
    const background = screen.getByRole('button', { name: 'background' })

    for (let i = 0; i < 8; i++) {
      await user.tab()
      expect(document.activeElement).not.toBe(background)
      expect(dialog.contains(document.activeElement)).toBe(true)
    }
    for (let i = 0; i < 8; i++) {
      await user.tab({ shift: true })
      expect(document.activeElement).not.toBe(background)
      expect(dialog.contains(document.activeElement)).toBe(true)
    }
  })

  it('pulls focus back inside when Tab is pressed from outside the dialog', async () => {
    const user = userEvent.setup()
    renderHarness()
    await user.click(screen.getByRole('button', { name: 'open confirm' }))

    screen.getByRole('button', { name: 'background' }).focus()
    fireEvent.keyDown(document, { key: 'Tab' })

    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true)
  })
})

describe('dialog focus restoration', () => {
  it('returns focus to the opener when cancelled', async () => {
    const user = userEvent.setup()
    renderHarness()
    const opener = screen.getByRole('button', { name: 'open confirm' })

    await user.click(opener)
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(document.activeElement).toBe(opener))
  })

  it('returns focus to the opener when dismissed with Escape', async () => {
    const user = userEvent.setup()
    renderHarness()
    const opener = screen.getByRole('button', { name: 'open danger' })

    await user.click(opener)
    await user.keyboard('{Escape}')

    await waitFor(() => expect(document.activeElement).toBe(opener))
  })

  it('returns focus to the opener when confirmed', async () => {
    const user = userEvent.setup()
    renderHarness()
    const opener = screen.getByRole('button', { name: 'open confirm' })

    await user.click(opener)
    await user.click(screen.getByRole('button', { name: 'Confirm' }))

    await waitFor(() => expect(document.activeElement).toBe(opener))
  })

  it('returns focus to the opener when an alert is acknowledged', async () => {
    const user = userEvent.setup()
    renderHarness()
    const opener = screen.getByRole('button', { name: 'open alert' })

    await user.click(opener)
    await user.click(screen.getByRole('button', { name: 'OK' }))

    await waitFor(() => expect(document.activeElement).toBe(opener))
  })
})

describe('dialog result semantics are unchanged', () => {
  it('still resolves confirm/cancel/prompt exactly as before', async () => {
    const user = userEvent.setup()
    const results: unknown[] = []

    function ResultHarness() {
      const dialogs = useDialogs()
      return (
        <>
          <button
            type="button"
            onClick={() => void dialogs.confirm({ title: 'Publish?' }).then((v) => results.push(v))}
          >
            confirm
          </button>
          <button
            type="button"
            onClick={() =>
              void dialogs
                .confirm({ title: 'Delete deck?', danger: true })
                .then((v) => results.push(v))
            }
          >
            danger
          </button>
          <button
            type="button"
            onClick={() =>
              void dialogs
                .prompt({ title: 'New deck', initialValue: 'Compilers' })
                .then((v) => results.push(v))
            }
          >
            prompt
          </button>
        </>
      )
    }

    render(
      <DialogProvider>
        <ResultHarness />
      </DialogProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'confirm' }))
    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    await user.click(screen.getByRole('button', { name: 'danger' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await user.click(screen.getByRole('button', { name: 'prompt' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(results).toEqual([true, false, 'Compilers'])
  })

  it('settles without throwing when the opener is gone before the dialog closes', async () => {
    const user = userEvent.setup()
    const results: unknown[] = []

    // Reproduces deleting a deck from its row menu: the row that opened the
    // dialog is unmounted while the dialog is still on screen.
    function VanishingOpener() {
      const dialogs = useDialogs()
      const [gone, setGone] = useState(false)
      if (gone) return <div>row gone</div>
      return (
        <button
          type="button"
          onClick={() => {
            void dialogs
              .confirm({ title: 'Delete deck?', danger: true })
              .then((v) => results.push(v))
            setGone(true)
          }}
        >
          delete row
        </button>
      )
    }

    render(
      <DialogProvider>
        <VanishingOpener />
      </DialogProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'delete row' }))
    expect(screen.getByText('row gone')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(results).toEqual([true])
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
