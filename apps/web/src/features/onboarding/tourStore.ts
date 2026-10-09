import { useEffect, useRef, useSyncExternalStore } from 'react'
import { createOnboardingTour, type TourStepId } from '@fliptap/core'

export const onboardingTour = createOnboardingTour()
const examples = new Map<TourStepId, () => void>()
export function useTourState() {
  return useSyncExternalStore(onboardingTour.subscribe, onboardingTour.getSnapshot, () => null)
}
export function useTourField(step: TourStepId, value: string, example: () => void) {
  const state = useTourState()
  const currentExample = useRef(example)
  currentExample.current = example
  useEffect(() => {
    const apply = () => currentExample.current()
    examples.set(step, apply)
    return () => { if (examples.get(step) === apply) examples.delete(step) }
  }, [step])
  useEffect(() => {
    if (state?.step === step) onboardingTour.setReady(step, value.trim().length > 0)
  }, [state?.step, step, value])
}
export function applyTourExample(step: TourStepId) { examples.get(step)?.() }
