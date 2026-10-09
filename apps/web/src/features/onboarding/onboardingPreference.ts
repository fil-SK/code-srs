import { useSyncExternalStore } from 'react'

// This browser preference records guidance dismissal, never authentication.
const KEY = 'fliptap-onboarding-v2'
let dismissed = false
const listeners = new Set<() => void>()

function snapshot() {
  try { return dismissed || window.localStorage.getItem(KEY) === 'dismissed' }
  catch { return dismissed }
}

export function dismissOnboarding() {
  dismissed = true
  try { window.localStorage.setItem(KEY, 'dismissed') } catch { /* In-memory dismissal still works. */ }
  listeners.forEach(listener => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  window.addEventListener('storage', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', listener)
  }
}

export function useOnboardingDismissed() {
  return useSyncExternalStore(subscribe, snapshot, () => false)
}
