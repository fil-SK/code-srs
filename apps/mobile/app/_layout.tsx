import { Slot } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { iteraColors } from '@itera/core'

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" backgroundColor={iteraColors.canvas} />
      <Slot />
    </SafeAreaProvider>
  )
}
