import { iteraColors } from '@itera/core'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

// The two pre-product states the composition root can be in: still deciding, or
// unable to run at all. Deliberately plain - this is infrastructure, not a
// designed surface, and it exists so neither state can be mistaken for the app.
export function StatusScreen({
  title,
  detail,
  busy = false,
}: {
  title: string
  detail?: string
  busy?: boolean
}) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        {busy ? <ActivityIndicator color={iteraColors.accent} size="large" /> : null}
        <Text style={styles.title}>{title}</Text>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: iteraColors.canvas },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 32,
  },
  title: {
    color: iteraColors.inkBrand,
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  detail: {
    maxWidth: 320,
    color: iteraColors.muted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
})
