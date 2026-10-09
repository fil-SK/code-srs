import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react-native'
import { OnboardingScreen } from './OnboardingScreen'
import { OnboardingPrompt } from './OnboardingPrompt'
import { onboardingTour } from './tourStore'
import { resetOnboardingPrompt } from './onboardingPromptState'
import { DeckFormScreen } from '@/src/components/cards/DeckFormScreen'
import { RecallEditorScreen } from '@/src/components/cards/RecallEditorScreen'
import { renderInDemo, settleQueries, storedEntities } from '@/src/test/demoHarness'
import { resetRouterCalls, routerCalls } from '@/src/test/routerDouble'

let mockNavigationReady = true
const mockNavigation = { isReady: () => mockNavigationReady }

jest.mock('expo-router', () => ({
  useNavigationContainerRef: () => mockNavigation,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  useRouter: () => require('@/src/test/routerDouble').routerDouble,
}))
beforeEach(() => { mockNavigationReady = true; resetOnboardingPrompt(); resetRouterCalls(); onboardingTour.stop() })
afterEach(() => { cleanup(); onboardingTour.stop() })
it('starts on the actual Today screen without altering demo learning data', async () => {
  renderInDemo(<OnboardingScreen />)
  await settleQueries()
  await waitFor(() => expect(routerCalls.replace).toContain('/today'))
  expect(onboardingTour.getSnapshot()?.step).toBe('today')
  const before = await storedEntities()
  act(() => onboardingTour.stop())
  expect(await storedEntities()).toEqual(before)
})
it('hides the invitation during the tour and allows replay after stopping', () => {
  act(() => onboardingTour.start())
  renderInDemo(<OnboardingPrompt />)
  expect(screen.queryByText('Get started')).toBeNull()
  act(() => onboardingTour.stop())
  fireEvent.press(screen.getByText('Get started'))
  expect(routerCalls.push).toContain('/onboarding')
})
it('advances deck creation only after the real repository saves it', async () => {
  const onSaved = jest.fn()
  onboardingTour.start(); onboardingTour.next(); onboardingTour.event({ type: 'library-opened' }); onboardingTour.event({ type: 'deck-form-opened' })
  renderInDemo(<DeckFormScreen target={{ kind: 'create' }} onCancel={jest.fn()} onSaved={onSaved} />)
  await settleQueries()
  fireEvent.changeText(screen.getByTestId('deck-name-input'), 'Tour test')
  act(() => onboardingTour.next())
  expect(onboardingTour.getSnapshot()?.step).toBe('deck-save')
  expect(onSaved).not.toHaveBeenCalled()
  fireEvent.press(screen.getByLabelText('Create deck'))
  await settleQueries()
  const deck = (await storedEntities()).decks.find(item => item.name === 'Tour test')!
  expect(deck).toBeTruthy()
  expect(onboardingTour.getSnapshot()).toMatchObject({ step: 'open-deck', deckId: deck.id })
})
it('uses normal Recall validation and saves one actual card before Study', async () => {
  const onSaved = jest.fn()
  const view = renderInDemo(<OnboardingPrompt />)
  await settleQueries()
  const deck = (await storedEntities()).decks[0]
  view.unmount()
  renderInDemo(<RecallEditorScreen deckId={deck.id} deckName={deck.name} onCancel={jest.fn()} onSaved={onSaved} />)
  act(() => {
    onboardingTour.start(); onboardingTour.next(); onboardingTour.event({ type: 'library-opened' }); onboardingTour.event({ type: 'deck-form-opened' })
    onboardingTour.setReady('deck-name', true); onboardingTour.next(); onboardingTour.event({ type: 'deck-created', deckId: deck.id }); onboardingTour.event({ type: 'deck-opened', deckId: deck.id })
    onboardingTour.event({ type: 'card-chooser-opened', deckId: deck.id }); onboardingTour.event({ type: 'card-type-selected' })
  })
  fireEvent.changeText(screen.getByTestId('recall-prompt-input'), 'A short question')
  act(() => onboardingTour.next())
  fireEvent.changeText(screen.getByTestId('recall-answer-input'), 'A short answer')
  act(() => onboardingTour.next())
  expect(onSaved).not.toHaveBeenCalled()
  fireEvent.press(screen.getByLabelText('Create card'))
  await settleQueries()
  expect(onSaved).toHaveBeenCalledTimes(1)
  const record = onSaved.mock.calls[0][0]
  expect((await storedEntities()).cards.some(card => card.id === record.id)).toBe(true)
  expect(onboardingTour.getSnapshot()).toMatchObject({ step: 'study', cardId: record.id })
})

it('waits for the root navigator before starting a cold deep link', async () => {
  mockNavigationReady = false
  renderInDemo(<OnboardingScreen />)
  await settleQueries()
  expect(routerCalls.replace).toEqual([])
  expect(onboardingTour.getSnapshot()).toBeNull()
  mockNavigationReady = true
  await waitFor(() => expect(onboardingTour.getSnapshot()?.step).toBe('today'))
  expect(routerCalls.replace).toContain('/today')
})
