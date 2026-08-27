import { Stack } from 'expo-router'

// Everything behind the authenticated boundary. A stack rather than a bare Slot,
// so /notifications, the card study preview and the developer probe get real
// native presentation - a push transition and the iOS back-swipe - instead of
// appearing in place with an in-content back button as their only affordance.
//
// The card preview sits here rather than inside the Library tab so that the deck
// it was opened from stays mounted underneath, keeping its search text and
// status filter, and so that an immersive card surface is not drawn behind the
// tab bar.
//
// A deck sits here for a different reason: it is opened from Today, Progress and
// Library alike, and only a screen above the tabs can return the visitor to the
// one they actually came from. Inside the Library tab's stack, Back always meant
// "pop to All Decks".
//
// Headers stay hidden: every screen in here already draws its own, and this
// layout exists for navigation semantics, not chrome.
export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="deck/[deckId]/index" />
      <Stack.Screen name="card/[cardId]/study" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="diagnostics" />
    </Stack>
  )
}
