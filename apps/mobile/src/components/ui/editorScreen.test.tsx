import { cleanup, fireEvent, render, screen, within } from '@testing-library/react-native'
import { ScrollView, Text } from 'react-native'

import { EditorScreen } from './EditorScreen'

// The authoring shell's one structural promise: Save is pinned, not parked at
// the end of the form.
//
// The longest form on this platform is a Multiple Choice card with six options,
// a tip, an explanation and tags. A Save button below all of that is several
// screens away with the keyboard raised, which is why the header owns it - and
// why "is it inside the ScrollView" is worth asserting rather than trusting.

afterEach(cleanup)

function renderShell(props: Partial<Parameters<typeof EditorScreen>[0]> = {}) {
  return render(
    <EditorScreen
      canSave
      errors={[]}
      isSaving={false}
      onCancel={() => {}}
      onSave={() => {}}
      saveLabel="Create card"
      title="New Recall card"
      {...props}
    >
      <Text>form field</Text>
    </EditorScreen>,
  )
}

describe('the authoring shell', () => {
  it('keeps Save out of the scrolling form, so a long form cannot bury it', () => {
    renderShell()

    expect(screen.getByTestId('editor-save')).toBeTruthy()
    const scroll = screen.UNSAFE_getByType(ScrollView)
    expect(within(scroll).queryByTestId('editor-save')).toBeNull()
    // The form itself is in the scroll view, which is what makes the assertion
    // above about position rather than about the control being absent.
    expect(within(scroll).getByText('form field')).toBeTruthy()
  })

  it('reflects the shared validator on the pinned control, and refuses the press', () => {
    let saves = 0
    renderShell({ canSave: false, onSave: () => (saves += 1) })

    expect(screen.getByLabelText('Create card').props.accessibilityState.disabled).toBe(true)
    fireEvent.press(screen.getByLabelText('Create card'))
    expect(saves).toBe(0)
  })

  it('saves when the form is valid', () => {
    let saves = 0
    renderShell({ onSave: () => (saves += 1) })

    expect(screen.getByLabelText('Create card').props.accessibilityState.disabled).toBe(false)
    fireEvent.press(screen.getByLabelText('Create card'))
    expect(saves).toBe(1)
  })

  it('says it is saving without renaming the control under a screen reader', () => {
    renderShell({ isSaving: true })

    expect(screen.getByText('Saving…')).toBeTruthy()
    // The accessible name is the action, not the transient state.
    expect(screen.getByLabelText('Create card').props.accessibilityState.disabled).toBe(true)
  })

  it('keeps Cancel reachable beside it', () => {
    let cancels = 0
    renderShell({ onCancel: () => (cancels += 1) })

    fireEvent.press(screen.getByLabelText('Cancel'))
    expect(cancels).toBe(1)
  })

  it('renders validation errors from the shared validator, in the form', () => {
    renderShell({ canSave: false, errors: ['A prompt is required.'] })

    const scroll = screen.UNSAFE_getByType(ScrollView)
    expect(within(scroll).getByText('A prompt is required.')).toBeTruthy()
  })
})
