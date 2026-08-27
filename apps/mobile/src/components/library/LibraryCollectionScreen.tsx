import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { iteraColors, iteraRadii, markLabelFor, type DeckSortKey } from '@itera/core'
import { useRouter } from 'expo-router'
import type { ComponentProps } from 'react'
import { useMemo, useState } from 'react'
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { IteraButton } from '@/src/components/ui/IteraButton'
import { SearchField } from '@/src/components/ui/SearchField'
import type {
  MobileCollectionViewModel,
  MobileDeckCardViewModel,
  MobileLibraryDeckViewModel,
} from '@/src/types/library'
import { CardActions } from './CardActions'
import { CardRow } from './CardRow'
import { deckSortLabel, filterAndSortDeckViewModels } from './deckSorting'
import { SortSheet } from './SortSheet'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

function CollectionMetric({
  icon,
  value,
  label,
  accented = false,
  bordered = false,
}: {
  icon: IconName
  value: number
  label: string
  accented?: boolean
  bordered?: boolean
}) {
  const color = accented ? iteraColors.accent : iteraColors.inkBrand
  return (
    <View style={[styles.collectionMetric, bordered && styles.collectionMetricBorder]}>
      <View style={styles.collectionMetricTop}>
        <MaterialCommunityIcons color={color} name={icon} size={24} />
        <Text style={[styles.collectionMetricValue, accented && styles.accentText]}>{value}</Text>
      </View>
      <Text style={styles.collectionMetricLabel}>{label}</Text>
    </View>
  )
}

function CollectionDeckRow({
  deck,
  onPress,
}: {
  deck: MobileLibraryDeckViewModel
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityHint="Opens this deck"
      accessibilityLabel={`${deck.name}, ${deck.cardCount} cards, ${deck.dueCount} due, ${deck.progressPercent}% progress`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.deckRow, pressed && styles.pressed]}
    >
      <View style={styles.deckTopRow}>
        <View style={styles.deckMark}>
          <Text style={styles.deckMarkLabel}>{markLabelFor(deck.name, 3)}</Text>
          <View style={styles.deckMarkRibbonMuted} />
          <View style={styles.deckMarkRibbonAccent} />
        </View>

        <View style={styles.deckIdentity}>
          <Text numberOfLines={1} style={styles.deckName}>
            {deck.name}
          </Text>
          <Text numberOfLines={1} style={styles.deckDescription}>
            {deck.description}
          </Text>

          <View style={styles.deckMetaRow}>
            <View style={styles.deckMeta}>
              <MaterialCommunityIcons color={iteraColors.muted} name="cards-outline" size={15} />
              <Text style={styles.deckMetaText}>{deck.cardCount} cards</Text>
            </View>
            <View style={styles.deckMeta}>
              <MaterialCommunityIcons color={iteraColors.accent} name="bell-outline" size={15} />
              <Text style={styles.deckDueText}>{deck.dueCount} due</Text>
            </View>
            <View style={styles.deckMeta}>
              <MaterialCommunityIcons
                color={iteraColors.muted}
                name="calendar-blank-outline"
                size={15}
              />
              <Text style={styles.deckMetaText}>{deck.lastStudiedLabel}</Text>
            </View>
          </View>
        </View>

        {/*
          The overflow glyph that used to sit above this chevron was a bare icon
          in a View - not a control at all, but indistinguishable from one now
          that the row itself navigates. Deck actions are not implemented, so it
          is removed rather than left to read as an enabled no-op.
        */}
        <View style={styles.deckTrailing}>
          <MaterialCommunityIcons color={iteraColors.muted} name="chevron-right" size={23} />
        </View>
      </View>

      <View style={styles.deckProgressRow}>
        <View
          accessibilityLabel={`${deck.name} progress`}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: deck.progressPercent }}
          style={styles.progressTrack}
        >
          <View style={[styles.progressFill, { width: `${deck.progressPercent}%` }]} />
        </View>
        <Text style={styles.progressText}>{deck.progressPercent}%</Text>
      </View>
    </Pressable>
  )
}

export function LibraryCollectionScreen({ viewModel }: { viewModel: MobileCollectionViewModel }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [dueOnly, setDueOnly] = useState(false)
  // Web defaults a Collection to name order, and All Decks to last studied.
  const [sort, setSort] = useState<DeckSortKey>('name')
  const [sortOpen, setSortOpen] = useState(false)
  const [actionCard, setActionCard] = useState<MobileDeckCardViewModel | null>(null)

  const visibleDecks = useMemo(
    () => filterAndSortDeckViewModels(viewModel.decks, { query, dueOnly, sort }),
    [dueOnly, query, sort, viewModel.decks],
  )

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
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
      >
        <Pressable
          accessibilityLabel="Back to Library"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <MaterialCommunityIcons color="#49658e" name="chevron-left" size={27} />
          <Text style={styles.backText}>Library</Text>
        </Pressable>

        <View style={styles.identityRow}>
          <View style={styles.collectionMark}>
            <Text style={styles.collectionMarkText}>{markLabelFor(viewModel.name, 2)}</Text>
            <View style={styles.collectionMarkRibbonMuted} />
            <View style={styles.collectionMarkRibbonAccent} />
          </View>
          <View style={styles.identityCopy}>
            <Text style={styles.title}>{viewModel.name}</Text>
            <Text style={styles.description}>{viewModel.description}</Text>
          </View>
        </View>

        <View style={styles.metricsCard}>
          <CollectionMetric icon="folder-outline" label="decks" value={viewModel.deckCount} />
          {/*
            The cards metric carries the same glyph a deck's cards metric does.
            It used to carry the Library tab's own icon, which made a count of
            cards read as a count of libraries.
          */}
          <CollectionMetric bordered icon="cards-outline" label="cards" value={viewModel.cardCount} />
          <CollectionMetric
            accented
            bordered
            icon="calendar-clock-outline"
            label="due today"
            value={viewModel.dueToday}
          />
        </View>

        {/*
          Creating here files the new deck inside this collection, which is
          nothing more than giving it this collection's id as its parentId - a
          collection IS a deck, and there is no second membership field to set.
          The rail, All Decks, this list and the deck caption all derive from
          that one relationship, so the deck appears everywhere it belongs with
          no further wiring.
        */}
        <IteraButton
          accessibilityHint={`Creates a new deck inside ${viewModel.name}`}
          label="New Deck"
          onPress={() =>
            router.push({ pathname: '/deck/new', params: { parentId: viewModel.id } })
          }
          style={styles.newDeck}
        />

        <Text style={styles.sectionTitle}>Decks</Text>

        <SearchField
          accessibilityLabel="Search collection decks"
          clearAccessibilityLabel="Clear deck search"
          onChangeText={setQuery}
          placeholder="Search decks..."
          style={styles.searchWrap}
          value={query}
        />

        <View style={styles.controlsRow}>
          <Pressable
            accessibilityHint="Choose how decks are ordered"
            accessibilityLabel={'Sort: ' + deckSortLabel(sort)}
            accessibilityRole="button"
            onPress={() => setSortOpen(true)}
            style={({ pressed }) => [styles.sortControl, pressed && styles.pressed]}
          >
            <Text numberOfLines={1} style={styles.controlText}>
              Sort: {deckSortLabel(sort)}
            </Text>
            <MaterialCommunityIcons color={iteraColors.inkBrand} name="chevron-down" size={19} />
          </Pressable>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: dueOnly }}
            onPress={() => setDueOnly((value) => !value)}
            style={({ pressed }) => [styles.dueControl, pressed && styles.pressed]}
          >
            <View style={[styles.checkbox, dueOnly && styles.checkboxChecked]}>
              {dueOnly ? (
                <MaterialCommunityIcons color={iteraColors.surface} name="check" size={15} />
              ) : null}
            </View>
            <Text style={styles.controlText}>Due only</Text>
          </Pressable>
        </View>

        <View style={styles.deckList}>
          {visibleDecks.map((deck) => (
            <CollectionDeckRow
              key={deck.id}
              deck={deck}
              onPress={() =>
                router.push({
                  pathname: '/deck/[deckId]',
                  params: { deckId: deck.id },
                })
              }
            />
          ))}
        </View>

        {visibleDecks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No matching decks</Text>
            <Text style={styles.emptyText}>Try another search or turn off Due only.</Text>
          </View>
        ) : null}

        {/*
          A collection IS a deck, so it can hold cards of its own, and it does
          from the moment a deck that already had cards is given a child. They
          are listed here rather than dropped out of the Library the way the
          promotion used to drop them: they were still scheduled, still counted
          on Today and Progress, and no longer reachable from any screen. Web
          surfaces the same case in its own section for the same reason.
        */}
        {viewModel.ownCards.length > 0 ? (
          <View style={styles.ownCardsSection}>
            <Text style={styles.sectionTitle}>Cards in {viewModel.name}</Text>
            <Text style={styles.ownCardsCaption}>
              Filed on this collection itself rather than on one of its decks.
            </Text>
            <View style={styles.ownCardsList}>
              {viewModel.ownCards.map((card) => (
                <CardRow
                  key={card.id}
                  card={card}
                  onActions={() => setActionCard(card)}
                  onOpen={() =>
                    router.push({ pathname: '/card/[cardId]/study', params: { cardId: card.id } })
                  }
                />
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* No cards of its own, no card actions - and no delete mutation held. */}
      {viewModel.ownCards.length > 0 ? (
        <CardActions card={actionCard} onClose={() => setActionCard(null)} />
      ) : null}

      <SortSheet
        onChange={setSort}
        onClose={() => setSortOpen(false)}
        sort={sort}
        visible={sortOpen}
      />
    </SafeAreaView>
  )
}

const cardShadow = Platform.select({
  ios: {
    shadowColor: iteraColors.navy,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.06,
    shadowRadius: 13,
  },
  android: { elevation: 3 },
  web: { boxShadow: '0 5px 13px rgba(30,41,59,0.06)' },
})

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
    paddingTop: 10,
    paddingHorizontal: 18,
    paddingBottom: 44,
  },
  decorativeField: {
    position: 'absolute',
    zIndex: 0,
    top: 0,
    right: 0,
    left: 0,
    height: 260,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  decorativeShapeLarge: {
    position: 'absolute',
    top: -20,
    right: -100,
    width: 285,
    height: 165,
    borderRadius: 88,
    backgroundColor: iteraColors.accentSofter,
    transform: [{ rotate: '-13deg' }],
  },
  decorativeShapeSmall: {
    position: 'absolute',
    top: 42,
    right: -78,
    width: 235,
    height: 108,
    borderRadius: 65,
    backgroundColor: iteraColors.accentSoft,
    opacity: 0.7,
    transform: [{ rotate: '-8deg' }],
  },
  backButton: {
    minHeight: 44,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: -8,
    paddingRight: 12,
  },
  backText: {
    color: '#445b7e',
    fontSize: 16,
    fontWeight: '500',
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 17,
    marginTop: 8,
  },
  collectionMark: {
    position: 'relative',
    width: 82,
    height: 82,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: iteraRadii.card,
    backgroundColor: iteraColors.navy,
  },
  collectionMarkText: {
    zIndex: 2,
    color: iteraColors.surface,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: 26,
    fontWeight: '700',
  },
  collectionMarkRibbonMuted: {
    position: 'absolute',
    right: -24,
    bottom: -4,
    width: 88,
    height: 17,
    backgroundColor: 'rgba(148,163,184,0.45)',
    transform: [{ rotate: '-34deg' }],
  },
  collectionMarkRibbonAccent: {
    position: 'absolute',
    right: -22,
    bottom: 5,
    width: 82,
    height: 7,
    backgroundColor: iteraColors.accent,
    transform: [{ rotate: '-34deg' }],
  },
  identityCopy: {
    minWidth: 0,
    flex: 1,
  },
  title: {
    color: iteraColors.inkBrand,
    fontSize: 29,
    fontWeight: '700',
    letterSpacing: -0.8,
    lineHeight: 34,
  },
  description: {
    marginTop: 6,
    color: iteraColors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  metricsCard: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: 22,
    borderColor: iteraColors.borderStrong,
    borderRadius: iteraRadii.card,
    borderWidth: 1,
    backgroundColor: iteraColors.surface,
    paddingVertical: 12,
    ...cardShadow,
  },
  collectionMetric: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collectionMetricBorder: {
    borderLeftColor: iteraColors.border,
    borderLeftWidth: 1,
  },
  collectionMetricTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  collectionMetricValue: {
    color: iteraColors.inkBrand,
    fontSize: 21,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  collectionMetricLabel: {
    marginTop: 5,
    color: iteraColors.muted,
    fontSize: 12,
  },
  accentText: {
    color: iteraColors.accent,
  },
  newDeck: {
    marginTop: 18,
  },
  sectionTitle: {
    marginTop: 26,
    color: iteraColors.inkBrand,
    fontSize: 20,
    fontWeight: '700',
  },
  // Only what this screen adds; the field itself is SearchField's.
  searchWrap: {
    marginTop: 12,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 10,
  },
  sortControl: {
    minHeight: 48,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderColor: iteraColors.borderStrong,
    borderRadius: iteraRadii.control,
    borderWidth: 1,
    backgroundColor: iteraColors.surface,
    paddingHorizontal: 13,
  },
  dueControl: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderColor: iteraColors.borderStrong,
    borderRadius: iteraRadii.control,
    borderWidth: 1,
    backgroundColor: iteraColors.surface,
    paddingHorizontal: 14,
  },
  controlText: {
    color: iteraColors.inkBrand,
    fontSize: 13,
    fontWeight: '500',
  },
  checkbox: {
    width: 19,
    height: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: iteraColors.muted,
    borderRadius: 4,
    borderWidth: 1.4,
    backgroundColor: iteraColors.surface,
  },
  checkboxChecked: {
    borderColor: iteraColors.accent,
    backgroundColor: iteraColors.accent,
  },
  deckList: {
    gap: 10,
    marginTop: 16,
  },
  deckRow: {
    borderColor: iteraColors.border,
    borderRadius: iteraRadii.card,
    borderWidth: 1,
    backgroundColor: iteraColors.surface,
    padding: 12,
    ...cardShadow,
  },
  deckTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  deckMark: {
    position: 'relative',
    width: 52,
    height: 52,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: iteraRadii.control,
    backgroundColor: iteraColors.navy,
  },
  deckMarkLabel: {
    zIndex: 2,
    color: iteraColors.surface,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: 14,
    fontWeight: '700',
  },
  deckMarkRibbonMuted: {
    position: 'absolute',
    right: -20,
    bottom: -8,
    width: 62,
    height: 13,
    backgroundColor: 'rgba(148,163,184,0.5)',
    transform: [{ rotate: '-34deg' }],
  },
  deckMarkRibbonAccent: {
    position: 'absolute',
    right: -18,
    bottom: -1,
    width: 58,
    height: 5,
    backgroundColor: iteraColors.accent,
    transform: [{ rotate: '-34deg' }],
  },
  deckIdentity: {
    minWidth: 0,
    flex: 1,
    marginLeft: 12,
  },
  deckName: {
    color: iteraColors.inkBrand,
    fontSize: 15,
    fontWeight: '700',
  },
  deckDescription: {
    marginTop: 3,
    color: iteraColors.muted,
    fontSize: 11,
  },
  deckMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    marginTop: 10,
  },
  deckMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deckMetaText: {
    color: iteraColors.muted,
    fontSize: 10,
  },
  deckDueText: {
    color: iteraColors.accent,
    fontSize: 10,
    fontWeight: '700',
  },
  deckTrailing: {
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -5,
  },
  deckProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 12,
    marginLeft: 64,
  },
  progressTrack: {
    height: 5,
    flex: 1,
    overflow: 'hidden',
    borderRadius: iteraRadii.pill,
    backgroundColor: iteraColors.border,
  },
  progressFill: {
    height: '100%',
    borderRadius: iteraRadii.pill,
    backgroundColor: iteraColors.success,
  },
  progressText: {
    width: 30,
    color: iteraColors.inkBrand,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    textAlign: 'right',
  },
  ownCardsSection: {
    marginTop: 26,
    borderTopColor: iteraColors.border,
    borderTopWidth: 1,
    paddingTop: 18,
  },
  ownCardsCaption: {
    marginTop: 4,
    color: iteraColors.muted,
    fontSize: 12,
  },
  ownCardsList: {
    gap: 9,
    marginTop: 12,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 16,
    borderColor: iteraColors.border,
    borderRadius: iteraRadii.card,
    borderWidth: 1,
    backgroundColor: iteraColors.surface,
    padding: 24,
  },
  emptyTitle: {
    color: iteraColors.inkBrand,
    fontSize: 16,
    fontWeight: '700',
  },
  emptyText: {
    marginTop: 4,
    color: iteraColors.muted,
    fontSize: 13,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.65,
  },
})
