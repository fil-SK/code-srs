import type { TourStepId } from '@fliptap/core'
import type { RefObject } from 'react'
import type { View } from 'react-native'

export interface NativeTourTarget {
  ref: RefObject<View | null>
  inModal: boolean
  reveal: () => void
  example: () => void
}
export const targets = new Map<TourStepId, NativeTourTarget>()
let revision = 0
const listeners = new Set<() => void>()
export function refreshTourTargets() { revision += 1; listeners.forEach(listener => listener()) }
export const targetRegistry = {
  get: (step: TourStepId) => targets.get(step),
  getSnapshot: () => revision,
  subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } },
}
