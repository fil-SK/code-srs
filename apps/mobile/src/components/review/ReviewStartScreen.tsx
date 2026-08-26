import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { iteraColors, iteraRadii } from '@itera/core'
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { MobileHeader } from '@/src/components/today/MobileHeader'

// The Review tab's landing surface, and deliberately the smallest one that
// works.
//
// The tab used to open a card immediately, which left nowhere to say how much
// is due, what is about to be studied, or that there is nothing to do. This
// answers exactly those four things and nothing else: heading, due count,
// scope, one primary action, and an honest caught-up state.
//
// It is a functional entry surface, not a second design language. The card,
// tokens, header and primary action are the ones Today already uses. No charts,
// no streak tiles, no filters, no session customisation, no illustrations - if
// something here starts to look like a second dashboard, it does not belong.
//
// The persistent tab bar stays visible here. It disappears only once the
// immersive session begins, which is the established product rule.

export function ReviewStartScreen({
  dueCount,
  deckNames,
  onStart,
}: {
  dueCount: number
  deckNames: string[]
  onStart: () => void
}) {
  const caughtUp = dueCount === 0
  const scope =
    deckNames.length === 0
      ? ''
      : deckNames.length <= 3
        ? deckNames.join(' · ')
        : `${deckNames.slice(0, 3).join(' · ')} · +${deckNames.length - 3} more`

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <MobileHeader />
        <View style={styles.intro}>
          <Text style={styles.heading}>Review</Text>
        </View>

        <View style={styles.card}>
          {caughtUp ? (
            <>
              <View style={styles.mark}>
                <MaterialCommunityIcons
                  color={iteraColors.accent}
                  name="coffee-outline"
                  size={34}
                />
              </View>
              <Text style={styles.title}>All caught up</Text>
              <Text style={styles.subtitle}>
                Nothing is due right now. Come back when the next card is ready.
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.count}>{dueCount}</Text>
              <Text style={styles.countLabel}>
                {dueCount === 1 ? 'card due' : 'cards due'}
              </Text>
              {scope !== '' && (
                <Text numberOfLines={2} style={styles.scope}>
                  {scope}
                </Text>
              )}
              <Pressable
                accessibilityLabel={`Start session, ${dueCount} ${dueCount === 1 ? 'card' : 'cards'} due`}
                accessibilityRole="button"
                onPress={onStart}
                style={({ pressed }) => [styles.start, pressed && styles.pressed]}
              >
                <Text style={styles.startText}>Start session</Text>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: iteraColors.canvas },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 142, gap: 16 },
  intro: { marginTop: 10 },
  heading: {
    color: iteraColors.inkBrand,
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -1,
  },
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
  count: {
    color: iteraColors.inkBrand,
    fontSize: 56,
    fontWeight: '700',
    letterSpacing: -1.5,
  },
  countLabel: { marginTop: 2, color: iteraColors.muted, fontSize: 15, fontWeight: '600' },
  scope: {
    marginTop: 14,
    color: iteraColors.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  start: {
    alignSelf: 'stretch',
    minHeight: 54,
    marginTop: 26,
    borderRadius: iteraRadii.control,
    backgroundColor: iteraColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startText: { color: iteraColors.surface, fontSize: 17, fontWeight: '700' },
  mark: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: iteraColors.accentSofter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 16,
    color: iteraColors.inkBrand,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  subtitle: {
    marginTop: 8,
    color: iteraColors.muted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  pressed: { opacity: 0.72 },
})
