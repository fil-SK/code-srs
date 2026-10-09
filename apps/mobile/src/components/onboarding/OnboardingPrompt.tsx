import { useTourState } from './tourStore'
import { fliptapColors, fliptapRadii } from '@fliptap/core'
import { useRouter } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'
import { FlipTapButton } from '@/src/components/ui/FlipTapButton'
import { dismissOnboardingPrompt, useOnboardingDismissed } from './onboardingPromptState'

export function OnboardingPrompt() {
  const router = useRouter()
  const dismissed = useOnboardingDismissed()
  const tour = useTourState()
  if (dismissed || tour) return null
  return <View style={styles.card}>
    <Text accessibilityRole="header" style={styles.title}>New here? Make your first flip.</Text>
    <Text style={styles.copy}>Follow the highlights to create a card and review it.</Text>
    <FlipTapButton label="Get started" onPress={() => router.push('/onboarding')} />
    <FlipTapButton label="Maybe later" variant="secondary" onPress={dismissOnboardingPrompt} />
  </View>
}
const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: fliptapColors.border, borderRadius: fliptapRadii.card, backgroundColor: fliptapColors.surface, padding: 18, gap: 12, marginBottom: 20 },
  title: { color: fliptapColors.inkBrand, fontSize: 18, fontWeight: '700' },
  copy: { color: fliptapColors.muted, fontSize: 14, lineHeight: 21 },
})
