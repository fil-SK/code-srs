import { iteraColors } from '@itera/core'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export function PlaceholderScreen({ title }: { title: string }) {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>
          This mobile section is intentionally awaiting its own design review.
        </Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: iteraColors.canvas,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  title: {
    color: iteraColors.inkBrand,
    fontSize: 28,
    fontWeight: '700',
  },
  description: {
    marginTop: 10,
    maxWidth: 280,
    color: iteraColors.muted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
})
