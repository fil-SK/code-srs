export type TourStepId =
  | 'today' | 'library' | 'new-deck' | 'deck-name' | 'deck-save' | 'open-deck' | 'add-card'
  | 'card-type' | 'prompt' | 'answer' | 'card-save' | 'study' | 'reveal'
  | 'rate' | 'finish-review' | 'return-navigation' | 'open-progress' | 'progress' | 'complete'

export const tourExample = {
  deckName: 'Algorithms',
  prompt: 'Why does binary search need sorted data?',
  answer: 'Sorting lets each comparison rule out half of the remaining elements.',
}

export interface TourStep {
  id: TourStepId
  title: string
  text: string
  action: 'next' | 'input' | 'control' | 'finish'
}
export const tourSteps: readonly TourStep[] = [
  { id: 'today', title: 'Let’s learn by doing', text: 'Create a binary-search card, review it, and see your progress. Anything you save is yours to keep.', action: 'next' },
  { id: 'library', title: 'Find your library', text: 'Choose Library. This is where you organize your decks and cards.', action: 'control' },
  { id: 'new-deck', title: 'Give your learning a home', text: 'Open New Deck. A deck groups cards about one topic.', action: 'control' },
  { id: 'deck-name', title: 'Name your deck', text: 'Try “Algorithms”, or choose a topic of your own.', action: 'input' },
  { id: 'deck-save', title: 'Create it', text: 'Choose Create deck to save your new topic.', action: 'control' },
  { id: 'open-deck', title: 'Open your new deck', text: 'Select the deck you just created to see its cards and actions.', action: 'control' },
  { id: 'add-card', title: 'Make your first card', text: 'Choose Add Card in your new deck.', action: 'control' },
  { id: 'card-type', title: 'Start with Recall', text: 'Choose Recall: a question on the front, an answer on the back.', action: 'control' },
  { id: 'prompt', title: 'Ask one focused question', text: 'Try: “Why does binary search need sorted data?”', action: 'input' },
  { id: 'answer', title: 'Add the answer', text: 'Try: “Sorting lets each comparison rule out half of the remaining elements.”', action: 'input' },
  { id: 'card-save', title: 'Save your card', text: 'Save it to your deck. It will be ready for its first review.', action: 'control' },
  { id: 'study', title: 'Put it into practice', text: 'Choose Study Now to review the card you just made.', action: 'control' },
  { id: 'reveal', title: 'Think before you flip', text: 'Try to remember the answer, then tap the card to reveal it.', action: 'control' },
  { id: 'rate', title: 'How well did you remember?', text: 'Again: forgot. Hard: with effort. Good: remembered. Easy: effortless. Choose your rating to schedule the next review.', action: 'control' },
  { id: 'finish-review', title: 'Finish your session', text: 'Your review is saved. Use the session’s return button to leave Review.', action: 'control' },
  { id: 'return-navigation', title: 'Return to your navigation', text: 'Choose Back to return to the main app tabs.', action: 'control' },
  { id: 'open-progress', title: 'See your progress', text: 'Choose Progress to see how your practice adds up.', action: 'control' },
  { id: 'progress', title: 'Your practice adds up', text: 'That review now appears in Progress. Today will bring the card back when it is due.', action: 'next' },
  { id: 'complete', title: 'You’re ready', text: 'Keep adding small pieces of what you learn, and come back for your due cards.', action: 'finish' },
]

export interface TourState {
  step: TourStepId
  ready: boolean
  deckId?: string
  cardId?: string
}
export type TourEvent =
  | { type: 'library-opened' }
  | { type: 'deck-opened'; deckId: string }
  | { type: 'session-exited' }
  | { type: 'navigation-ready' }
  | { type: 'progress-opened' }
  | { type: 'deck-form-opened' }
  | { type: 'deck-created'; deckId: string }
  | { type: 'card-chooser-opened'; deckId: string }
  | { type: 'card-type-selected' }
  | { type: 'card-created'; deckId: string; cardId: string }
  | { type: 'review-opened'; deckId: string }
  | { type: 'answer-revealed'; cardId: string }
  | { type: 'review-saved'; cardId: string }

// Only confirmed actions advance the scenario. No entity or backend lives here.
export function createOnboardingTour() {
  let state: TourState | null = null
  const listeners = new Set<() => void>()
  const publish = (next: TourState | null) => {
    state = next
    listeners.forEach(listener => listener())
  }
  function advance() {
    if (!state) return
    const index = tourSteps.findIndex(step => step.id === state?.step)
    const next = tourSteps[index + 1]
    publish(next ? { ...state, step: next.id, ready: false } : null)
  }
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    start() { publish({ step: 'today', ready: false }) },
    stop() { publish(null) },
    setReady(step: TourStepId, ready: boolean) {
      if (state?.step === step && state.ready !== ready) publish({ ...state, ready })
    },
    next() {
      if (!state) return
      const step = tourSteps.find(item => item.id === state?.step)
      if (step?.action === 'next' || (step?.action === 'input' && state.ready)) advance()
    },
    event(event: TourEvent) {
      if (!state) return
      if (state.step === 'library' && event.type === 'library-opened') advance()
      else if (state.step === 'open-deck' && event.type === 'deck-opened' && event.deckId === state.deckId) advance()
      else if (state.step === 'finish-review' && event.type === 'session-exited') advance()
      else if (state.step === 'return-navigation' && event.type === 'navigation-ready') advance()
      else if (state.step === 'open-progress' && event.type === 'progress-opened') advance()
      else if (state.step === 'new-deck' && event.type === 'deck-form-opened') advance()
      else if (state.step === 'deck-save' && event.type === 'deck-created') {
        state = { ...state, deckId: event.deckId }
        advance()
      } else if (state.step === 'add-card' && event.type === 'card-chooser-opened' && event.deckId === state.deckId) advance()
      else if (state.step === 'card-type' && event.type === 'card-type-selected') advance()
      else if (state.step === 'card-save' && event.type === 'card-created' && event.deckId === state.deckId) {
        state = { ...state, cardId: event.cardId }
        advance()
      } else if (state.step === 'study' && event.type === 'review-opened' && event.deckId === state.deckId) advance()
      else if (state.step === 'reveal' && event.type === 'answer-revealed' && event.cardId === state.cardId) advance()
      else if (state.step === 'rate' && event.type === 'review-saved' && event.cardId === state.cardId) advance()
    },
  }
}
