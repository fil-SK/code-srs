import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { iteraColors, iteraRadii, type Rating } from '@itera/core'
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import type { GradedCardRecord } from './DemoReviewSession'

// The end of a session, plus one level of Undo.
//
// Undo restores the recorded pre-grade SchedulingState and removes exactly the
// ReviewLog that grade produced. It never runs the scheduler backwards: FSRS is
// not invertible, so re-deriving the previous state would be a second, wrong
// implementation of scheduling.
//
// It is deliberately one level, matching web: the completion screen is the only
// place either platform offers it, and mid-session undo remains a recorded
// deferred capability rather than something invented here.

const RATING_LABELS: Record<Rating, string> = {
  1: 'Again',
  2: 'Hard',
  3: 'Good',
  4: 'Easy',
}

export function SessionCompleteScreen({
  graded,
  total,
  onExit,
  onUndo,
}: {
  graded: GradedCardRecord[]
  total: number
  onExit: () => void
  onUndo?: () => void
}) {
  const caughtUp = total === 0

  const breakdown = ([1, 2, 3, 4] as Rating[])
    .map((rating) => ({
      rating,
      label: RATING_LABELS[rating],
      count: graded.filter((record) => record.rating === rating).length,
    }))
    .filter((entry) => entry.count > 0)

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.mark}>
            <MaterialCommunityIcons
              color={iteraColors.accent}
              name={caughtUp ? 'coffee-outline' : 'check-decagram-outline'}
              size={40}
            />
          </View>

          <Text style={styles.title}>{caughtUp ? 'All caught up' : 'Session complete'}</Text>
          <Text style={styles.subtitle}>
            {caughtUp
              ? 'Nothing is due right now. Come back when the next card is ready.'
              : `You reviewed ${graded.length} of ${total} ${total === 1 ? 'card' : 'cards'}.`}
          </Text>

          {breakdown.length > 0 && (
            <View style={styles.breakdown}>
              {breakdown.map((entry) => (
                <View key={entry.rating} style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>{entry.label}</Text>
                  <Text style={styles.breakdownCount}>{entry.count}</Text>
                </View>
              ))}
            </View>
          )}

          <Pressable
            accessibilityRole="button"
            onPress={onExit}
            style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
          >
            <Text style={styles.primaryText}>Done</Text>
          </Pressable>

          {onUndo && (
            <Pressable
              accessibilityHint="Restores that card's previous schedule and removes its review"
              accessibilityLabel="Undo last card"
              accessibilityRole="button"
              onPress={onUndo}
              style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
            >
              <MaterialCommunityIcons
                color={iteraColors.inkBrand}
                name="undo-variant"
                size={18}
              />
              <Text style={styles.secondaryText}>Undo last card</Text>
            </Pressable>
          )}
        </View>

        <Text style={styles.note}>
          Demo mode. This session is held in memory and resets when the app restarts.
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: iteraColors.canvas },
  content: { paddingHorizontal: 20, paddingTop: 40, paddingBottom: 32, gap: 16 },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: iteraColors.border,
    backgroundColor: iteraColors.surface,
    paddingHorizontal: 22,
    paddingVertical: 30,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: iteraColors.navy,
        shadowOffset: { width: 0, height: 7 },
        shadowOpacity: 0.08,
        shadowRadius: 18,
      },
      android: { elevation: 4 },
      web: { boxShadow: '0 7px 18px rgba(30,41,59,0.08)' },
    }),
  },
  mark: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: iteraColors.accentSofter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 18,
    color: iteraColors.inkBrand,
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    color: iteraColors.muted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  breakdown: {
    alignSelf: 'stretch',
    marginTop: 22,
    borderRadius: iteraRadii.card,
    borderWidth: 1,
    borderColor: iteraColors.border,
    backgroundColor: iteraColors.surfaceSubtle,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  breakdownRow: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  breakdownLabel: { color: iteraColors.muted, fontSize: 14, fontWeight: '600' },
  breakdownCount: { color: iteraColors.inkBrand, fontSize: 15, fontWeight: '800' },
  primary: {
    alignSelf: 'stretch',
    minHeight: 54,
    marginTop: 24,
    borderRadius: iteraRadii.control,
    backgroundColor: iteraColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: iteraColors.surface, fontSize: 17, fontWeight: '700' },
  secondary: {
    alignSelf: 'stretch',
    minHeight: 50,
    marginTop: 10,
    borderRadius: iteraRadii.control,
    borderWidth: 1,
    borderColor: iteraColors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryText: { color: iteraColors.inkBrand, fontSize: 15, fontWeight: '700' },
  note: { color: iteraColors.mutedLight, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  pressed: { opacity: 0.72 },
})
