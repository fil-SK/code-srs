import { useSyncExternalStore } from 'react'

// Guidance follows Demo's process lifetime; this is not learning-data storage.
let dismissed = false
const listeners = new Set<() => void>()
function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
export function dismissOnboardingPrompt() {
  dismissed = true
  listeners.forEach(listener => listener())
}
export function resetOnboardingPrompt() {
  dismissed = false
  listeners.forEach(listener => listener())
}
export function useOnboardingDismissed() {
  return useSyncExternalStore(subscribe, () => dismissed, () => false)
}
