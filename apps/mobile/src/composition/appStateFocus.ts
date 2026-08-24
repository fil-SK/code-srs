import { focusManager } from '@tanstack/react-query'
import { AppState, type AppStateStatus } from 'react-native'

// TanStack Query decides "is the app focused?" from browser window events,
// which do not exist here. React Native's equivalent signal is AppState, so the
// binding is installed explicitly.
//
// `setEventListener` rather than calling `setFocused` from a component effect:
// it hands the manager a subscribe/unsubscribe pair, so the manager owns the
// lifetime and a remount cannot leave two listeners racing to set focus.
//
// Only focus is bound. `onlineManager` deliberately is not: without a
// connectivity module React Native reports permanently online, which for a
// cloud-only client with no offline layer is the honest behaviour - a request
// made with no signal fails and surfaces as an error, rather than being queued
// against a cache that does not exist. Wiring real connectivity belongs with the
// offline milestone that would give a paused query somewhere to wait.
export function bindAppStateFocus(): void {
  focusManager.setEventListener((handleFocus) => {
    const subscription = AppState.addEventListener('change', (status: AppStateStatus) => {
      handleFocus(status === 'active')
    })
    return () => subscription.remove()
  })
}
