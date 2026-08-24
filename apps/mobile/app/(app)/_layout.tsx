import { Stack } from 'expo-router'

// Everything behind the authenticated boundary. A stack rather than a bare Slot,
// so /notifications and the developer probe get real native presentation - a
// push transition and the iOS back-swipe - instead of appearing in place with an
// in-content back button as their only affordance.
//
// Headers stay hidden: every screen in here already draws its own, and this
// layout exists for navigation semantics, not chrome.
export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="diagnostics" />
    </Stack>
  )
}
