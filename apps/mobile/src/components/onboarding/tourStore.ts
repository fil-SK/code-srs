import { createOnboardingTour } from '@fliptap/core'
import { useSyncExternalStore } from 'react'
export const onboardingTour = createOnboardingTour()
export function useTourState() {
  return useSyncExternalStore(onboardingTour.subscribe, onboardingTour.getSnapshot, () => null)
}
