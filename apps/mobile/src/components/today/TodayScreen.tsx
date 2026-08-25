import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { iteraColors } from '@itera/core'
import { useRouter } from 'expo-router'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import type { MobileTodayViewModel } from '@/src/types/today'
import { ContinueLearningRow } from './ContinueLearningRow'
import { MobileHeader } from './MobileHeader'
import { TodayHero } from './TodayHero'

export function TodayScreen({ viewModel }: { viewModel: MobileTodayViewModel }) {
  const router = useRouter()

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.decorativeField}>
        <View style={styles.decorativeShapeLarge} />
        <View style={styles.decorativeShapeSmall} />
      </View>

      <ScrollView
        alwaysBounceVertical={false}
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
      >
        <MobileHeader />

        <View style={styles.greeting}>
          <Text style={styles.greetingTitle}>{viewModel.greeting.mainText}</Text>
          <Text style={styles.greetingSubtitle}>{viewModel.greeting.subtext}</Text>
        </View>

        <TodayHero
          dueToday={viewModel.dueToday}
          estimatedMinutes={viewModel.estimatedMinutes}
          onBrowseLibrary={() => router.push('/library')}
          onStartSession={() => router.push('/review/session')}
          retention={viewModel.retention}
          streak={viewModel.streak}
        />

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Continue learning</Text>
          <Pressable
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => router.push('/library')}
            style={({ pressed }) => [styles.seeAll, pressed && styles.pressed]}
          >
            <Text style={styles.seeAllText}>See all</Text>
            <MaterialCommunityIcons color={iteraColors.accent} name="chevron-right" size={17} />
          </Pressable>
        </View>

        <View style={styles.deckList}>
          {viewModel.decks.map((deck) => (
            <ContinueLearningRow
              key={deck.id}
              deck={deck}
              onPress={() =>
                router.push({
                  pathname: '/library/deck/[deckId]',
                  params: { deckId: deck.id },
                })
              }
            />
          ))}
        </View>

        {/* A heading over an empty list reads as a screen that failed to load. */}
        {viewModel.decks.length === 0 ? (
          <Text style={styles.emptyDecks}>
            Nothing in progress right now. Open your library to pick a deck.
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: iteraColors.canvas,
  },
  scroll: {
    zIndex: 1,
    flex: 1,
  },
  scrollContent: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingTop: 8,
    paddingHorizontal: 18,
    paddingBottom: 38,
  },
  decorativeField: {
    position: 'absolute',
    zIndex: 0,
    top: 110,
    right: 0,
    left: 0,
    height: 260,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  decorativeShapeLarge: {
    position: 'absolute',
    top: 26,
    right: -118,
    width: 300,
    height: 170,
    borderRadius: 90,
    backgroundColor: iteraColors.accentSofter,
    transform: [{ rotate: '-12deg' }],
  },
  decorativeShapeSmall: {
    position: 'absolute',
    top: 76,
    right: -92,
    width: 250,
    height: 116,
    borderRadius: 70,
    backgroundColor: iteraColors.accentSoft,
    opacity: 0.68,
    transform: [{ rotate: '-8deg' }],
  },
  greeting: {
    marginTop: 20,
  },
  greetingTitle: {
    maxWidth: 350,
    color: iteraColors.inkBrand,
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.8,
    lineHeight: 36,
  },
  greetingSubtitle: {
    maxWidth: 330,
    marginTop: 7,
    color: iteraColors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  sectionHeading: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    color: iteraColors.inkBrand,
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  seeAll: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    paddingLeft: 12,
  },
  seeAllText: {
    color: iteraColors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  deckList: {
    gap: 10,
  },
  emptyDecks: {
    color: iteraColors.muted,
    fontSize: 14,
    lineHeight: 21,
    paddingHorizontal: 2,
  },
  pressed: {
    opacity: 0.62,
  },
})
