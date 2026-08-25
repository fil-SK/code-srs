import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { iteraColors, iteraRadii, markLabelFor } from '@itera/core'
import { useRouter } from 'expo-router'
import type { ComponentProps } from 'react'
import { useMemo, useState } from 'react'
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import type {
  MobileCardStatus,
  MobileDeckCardViewModel,
  MobileDeckViewModel,
} from '@/src/types/library'
import { cardStatusMatches, type CardStatusFilter } from './cardFiltering'
import { CardStatusSheet } from './CardStatusSheet'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']
type DeckTab = 'cards' | 'insights'

// A card's lifecycle state, as a colour. Uses the existing palette rather than
// introducing one: New is neutral, Learning is the accent already used for
// "due", and Review is the success green the progress bars use.
const statusColors: Record<MobileCardStatus, string> = {
  New: iteraColors.mutedLight,
  Learning: iteraColors.accent,
  Review: iteraColors.success,
}

const interactionVisuals: Record<
  MobileDeckCardViewModel['interactionType'],
  { icon: IconName; backgroundColor: string }
> = {
  recall: { icon: 'code-braces', backgroundColor: iteraColors.navy },
  walkthrough: { icon: 'source-branch', backgroundColor: '#0d9488' },
  multiple_choice: { icon: 'format-list-checks', backgroundColor: '#f59e0b' },
  write_code: { icon: 'code-tags', backgroundColor: '#2563eb' },
  ordering: { icon: 'format-list-numbered', backgroundColor: '#059669' },
  matching: { icon: 'vector-link', backgroundColor: '#7c3aed' },
}

function DeckMetric({
  icon,
  value,
  label,
}: {
  icon: IconName
  value: string
  label: string
}) {
  return (
    <View style={styles.metric}>
      <View style={styles.metricTop}>
        <MaterialCommunityIcons color={iteraColors.inkBrand} name={icon} size={21} />
        <Text style={styles.metricValue}>{value}</Text>
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  )
}

// The row opens the card it names, by its own canonical id.
//
// It used to be a disabled Pressable with a decorative kebab glyph at its right
// edge. The glyph is gone rather than disabled: inside a dead row it was merely
// inert, but inside a live row it reads as an overflow menu and would open the
// card instead - a worse lie than the one it replaced. Card management actions
// do not exist on this platform yet, so nothing takes its place.
function CardRow({ card, onOpen }: { card: MobileDeckCardViewModel; onOpen: () => void }) {
  const visual = interactionVisuals[card.interactionType]
  return (
    <Pressable
      accessibilityHint="Opens a preview of this card"
      accessibilityLabel={`${card.prompt}, ${card.interactionLabel}, ${card.status}`}
      accessibilityRole="button"
      onPress={onOpen}
      style={({ pressed }) => [styles.cardRow, pressed && styles.pressed]}
    >
      <View style={[styles.interactionMark, { backgroundColor: visual.backgroundColor }]}>
        <MaterialCommunityIcons color={iteraColors.surface} name={visual.icon} size={25} />
      </View>
      <View style={styles.cardCopy}>
        <Text numberOfLines={1} style={styles.cardPrompt}>
          {card.prompt}
        </Text>
        <Text numberOfLines={1} style={styles.cardMeta}>
          {card.interactionLabel} · {card.tag}
        </Text>
      </View>
      <View style={styles.cardStatus}>
        <View style={[styles.statusDot, { backgroundColor: statusColors[card.status] }]} />
        <Text style={styles.statusText}>{card.status}</Text>
      </View>
      <MaterialCommunityIcons color={iteraColors.mutedLight} name="chevron-right" size={22} />
    </Pressable>
  )
}

export function LibraryDeckScreen({ viewModel }: { viewModel: MobileDeckViewModel }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<DeckTab>('cards')
  const [query, setQuery] = useState('')
  // Defaults to showing everything. It used to default to New-only, which hid
  // cards behind a filter nobody had chosen.
  const [statusFilter, setStatusFilter] = useState<CardStatusFilter>('all')
  const [filterOpen, setFilterOpen] = useState(false)

  const caughtUpText =
    viewModel.cardCount === 0 ? 'No cards to study yet.' : "You're caught up in this deck."

  const visibleCards = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    return viewModel.cards.filter((card) => {
      if (!cardStatusMatches(card.status, statusFilter)) return false
      if (!normalizedQuery) return true
      return `${card.prompt} ${card.interactionLabel} ${card.tag}`
        .toLocaleLowerCase()
        .includes(normalizedQuery)
    })
  }, [query, statusFilter, viewModel.cards])

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
          accessibilityLabel={`Back to ${viewModel.collectionName}`}
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <MaterialCommunityIcons color="#49658e" name="chevron-left" size={27} />
          <Text style={styles.backText}>{viewModel.collectionName}</Text>
        </Pressable>

        <View style={styles.identityRow}>
          <View style={styles.deckMark}>
            <Text style={styles.deckMarkText}>{markLabelFor(viewModel.name, 2)}</Text>
            <View style={styles.deckMarkRibbonMuted} />
            <View style={styles.deckMarkRibbonAccent} />
          </View>

          <View style={styles.identityContent}>
            <View style={styles.titleRow}>
              <Text adjustsFontSizeToFit minimumFontScale={0.82} numberOfLines={2} style={styles.title}>
                {viewModel.name}
              </Text>
              {/*
                A favorite toggle used to sit here. It was mobile-only, held its
                state in this component alone, and had no product equivalent on
                web - no Deck field, hook, filter or sort key exists for it, and
                no decision approved one. It was removed rather than kept as an
                invented feature; see itera-decisions.md.
              */}
              <Pressable
                accessibilityLabel="Deck actions unavailable"
                accessibilityRole="button"
                accessibilityState={{ disabled: true }}
                disabled
                style={styles.moreButton}
              >
                <MaterialCommunityIcons
                  color={iteraColors.inkBrand}
                  name="dots-horizontal"
                  size={22}
                />
              </Pressable>
            </View>

            <Text style={styles.description}>{viewModel.description}</Text>

            <View style={styles.metricsRow}>
              <DeckMetric icon="cards-outline" label="cards" value={String(viewModel.cardCount)} />
              <DeckMetric
                icon="calendar-blank-outline"
                label="due"
                value={String(viewModel.dueCount)}
              />
              <DeckMetric
                icon="chart-donut"
                label="mastery"
                value={`${viewModel.masteryPercent}%`}
              />
            </View>

            <View style={styles.lastStudiedRow}>
              <MaterialCommunityIcons color={iteraColors.inkBrand} name="clock-outline" size={18} />
              <Text style={styles.lastStudiedText}>
                Last studied: {viewModel.lastStudiedLabel}
              </Text>
            </View>
          </View>
        </View>

        {viewModel.dueCount > 0 ? (
          <Pressable
            accessibilityLabel={`Study now, ${viewModel.dueCount} ${
              viewModel.dueCount === 1 ? 'card' : 'cards'
            } due`}
            accessibilityRole="button"
            onPress={() =>
              router.push({ pathname: '/review/session', params: { deckId: viewModel.id } })
            }
            style={({ pressed }) => [styles.studyButton, pressed && styles.pressed]}
          >
            <MaterialCommunityIcons color={iteraColors.surface} name="play-outline" size={25} />
            <Text style={styles.studyButtonText}>Study Now</Text>
          </Pressable>
        ) : (
          /*
            Nothing due is a real state of the product, so it is stated here
            rather than by starting a session that immediately says it is over.
            No due date is moved to keep this slot interesting - a deck that is
            genuinely caught up should look caught up.
          */
          <View accessible accessibilityLabel={caughtUpText} style={styles.caughtUp}>
            <MaterialCommunityIcons
              color={iteraColors.accent}
              name={viewModel.cardCount === 0 ? 'cards-outline' : 'coffee-outline'}
              size={22}
            />
            <Text style={styles.caughtUpText}>{caughtUpText}</Text>
          </View>
        )}

        <View style={styles.tabsRow}>
          <View accessibilityRole="tablist" style={styles.tabs}>
            {(['cards', 'insights'] as const).map((tab) => {
              const selected = activeTab === tab
              return (
                <Pressable
                  key={tab}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  onPress={() => setActiveTab(tab)}
                  style={({ pressed }) => [
                    styles.tab,
                    selected && styles.tabSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.tabText, selected && styles.tabTextSelected]}>
                    {tab === 'cards' ? 'Cards' : 'Insights'}
                  </Text>
                </Pressable>
              )
            })}
          </View>
          <Pressable
            accessibilityLabel="Add card unavailable"
            accessibilityRole="button"
            accessibilityState={{ disabled: true }}
            disabled
            style={styles.addCardButton}
          >
            <MaterialCommunityIcons color={iteraColors.inkBrand} name="plus" size={26} />
          </Pressable>
        </View>

        {activeTab === 'cards' ? (
          <>
            <View style={styles.searchRow}>
              <View style={styles.searchWrap}>
                <MaterialCommunityIcons color={iteraColors.mutedLight} name="magnify" size={23} />
                <TextInput
                  accessibilityLabel="Search cards"
                  autoCapitalize="none"
                  autoCorrect={false}
                  clearButtonMode="while-editing"
                  onChangeText={setQuery}
                  placeholder="Search cards..."
                  placeholderTextColor={iteraColors.mutedLight}
                  returnKeyType="search"
                  style={styles.searchInput}
                  value={query}
                />
              </View>
              <Pressable
                accessibilityHint="Filter cards by status"
                accessibilityLabel="Filter cards"
                accessibilityRole="button"
                onPress={() => setFilterOpen(true)}
                style={({ pressed }) => [styles.filterButton, pressed && styles.pressed]}
              >
                <MaterialCommunityIcons color={iteraColors.inkBrand} name="tune-variant" size={23} />
              </Pressable>
            </View>

            {statusFilter !== 'all' ? (
              <View style={styles.filterChip}>
                <View style={[styles.filterDot, { backgroundColor: statusColors[statusFilter] }]} />
                <Text style={styles.filterChipText}>Status: {statusFilter}</Text>
                <Pressable
                  accessibilityLabel="Remove status filter"
                  accessibilityRole="button"
                  hitSlop={7}
                  onPress={() => setStatusFilter('all')}
                  style={({ pressed }) => pressed && styles.pressed}
                >
                  <MaterialCommunityIcons color={iteraColors.muted} name="close" size={18} />
                </Pressable>
              </View>
            ) : null}

            <View style={styles.cardList}>
              {visibleCards.map((card) => (
                <CardRow
                  key={card.id}
                  card={card}
                  onOpen={() =>
                    router.push({
                      pathname: '/card/[cardId]/study',
                      params: { cardId: card.id },
                    })
                  }
                />
              ))}
            </View>

            {visibleCards.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>
                  {viewModel.cards.length === 0 ? 'No cards yet' : 'No matching cards'}
                </Text>
                <Text style={styles.emptyText}>
                  {viewModel.cards.length === 0
                    ? 'This deck has no cards in the demo workspace.'
                    : 'Try another search or clear the status filter.'}
                </Text>
              </View>
            ) : null}
          </>
        ) : (
          <View style={styles.insightsCard}>
            <MaterialCommunityIcons color={iteraColors.mutedLight} name="chart-box-outline" size={30} />
            <Text style={styles.insightsTitle}>Deck insights are not built yet</Text>
            <Text style={styles.insightsText}>
              The numbers above this tab are real. A per-deck breakdown of them is a separate
              surface that does not exist on either platform yet.
            </Text>
          </View>
        )}
      </ScrollView>

      <CardStatusSheet
        filter={statusFilter}
        onChange={setStatusFilter}
        onClose={() => setFilterOpen(false)}
        visible={filterOpen}
      />
    </SafeAreaView>
  )
}

const cardShadow = Platform.select({
  ios: {
    shadowColor: iteraColors.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  android: { elevation: 2 },
  web: { boxShadow: '0 4px 10px rgba(30,41,59,0.05)' },
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
    height: 235,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  decorativeShapeLarge: {
    position: 'absolute',
    top: -22,
    right: -98,
    width: 280,
    height: 155,
    borderRadius: 84,
    backgroundColor: iteraColors.accentSofter,
    transform: [{ rotate: '-13deg' }],
  },
  decorativeShapeSmall: {
    position: 'absolute',
    top: 38,
    right: -76,
    width: 230,
    height: 102,
    borderRadius: 62,
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
    alignItems: 'flex-start',
    gap: 15,
    marginTop: 7,
  },
  deckMark: {
    position: 'relative',
    width: 84,
    height: 102,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: iteraRadii.card,
    backgroundColor: iteraColors.navy,
  },
  deckMarkText: {
    zIndex: 2,
    color: iteraColors.surface,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: 28,
    fontWeight: '700',
  },
  deckMarkRibbonMuted: {
    position: 'absolute',
    right: -22,
    bottom: -2,
    width: 92,
    height: 17,
    backgroundColor: 'rgba(148,163,184,0.45)',
    transform: [{ rotate: '-34deg' }],
  },
  deckMarkRibbonAccent: {
    position: 'absolute',
    right: -20,
    bottom: 7,
    width: 86,
    height: 7,
    backgroundColor: iteraColors.accent,
    transform: [{ rotate: '-34deg' }],
  },
  identityContent: {
    minWidth: 0,
    flex: 1,
  },
  titleRow: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
  },
  title: {
    minWidth: 0,
    flex: 1,
    color: iteraColors.inkBrand,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.7,
    lineHeight: 29,
  },
  moreButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -4,
    borderColor: iteraColors.borderStrong,
    borderRadius: iteraRadii.control,
    borderWidth: 1,
    backgroundColor: iteraColors.surface,
    opacity: 0.72,
  },
  description: {
    marginTop: 5,
    color: iteraColors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  metricsRow: {
    flexDirection: 'row',
    marginTop: 14,
  },
  metric: {
    minWidth: 0,
    flex: 1,
    alignItems: 'center',
  },
  metricTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricValue: {
    color: iteraColors.inkBrand,
    fontSize: 18,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  metricLabel: {
    marginTop: 3,
    color: iteraColors.muted,
    fontSize: 11,
  },
  lastStudiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 12,
  },
  lastStudiedText: {
    color: '#445b7e',
    fontSize: 12,
  },
  studyButton: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    marginTop: 20,
    borderRadius: iteraRadii.control,
    backgroundColor: iteraColors.accent,
  },
  studyButtonText: {
    color: iteraColors.surface,
    fontSize: 17,
    fontWeight: '700',
  },
  caughtUp: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    marginTop: 20,
    borderColor: iteraColors.border,
    borderRadius: iteraRadii.control,
    borderWidth: 1,
    backgroundColor: iteraColors.accentSofter,
    paddingHorizontal: 16,
  },
  caughtUpText: {
    color: iteraColors.inkBrand,
    fontSize: 15,
    fontWeight: '600',
  },
  tabsRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 13,
    borderBottomColor: iteraColors.border,
    borderBottomWidth: 1,
  },
  tabs: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: 20,
  },
  tab: {
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomColor: 'transparent',
    borderBottomWidth: 2,
    paddingHorizontal: 4,
  },
  tabSelected: {
    borderBottomColor: iteraColors.accent,
  },
  tabText: {
    color: iteraColors.muted,
    fontSize: 15,
    fontWeight: '600',
  },
  tabTextSelected: {
    color: iteraColors.inkBrand,
    fontWeight: '700',
  },
  addCardButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: iteraColors.borderStrong,
    borderRadius: iteraRadii.control,
    borderWidth: 1,
    backgroundColor: iteraColors.surface,
    opacity: 0.72,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 14,
  },
  searchWrap: {
    minHeight: 50,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderColor: iteraColors.borderStrong,
    borderRadius: iteraRadii.control,
    borderWidth: 1,
    backgroundColor: iteraColors.surface,
    paddingHorizontal: 13,
  },
  searchInput: {
    minWidth: 0,
    flex: 1,
    color: iteraColors.inkBrand,
    fontSize: 15,
    paddingVertical: 0,
  },
  filterButton: {
    width: 50,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: iteraColors.borderStrong,
    borderRadius: iteraRadii.control,
    borderWidth: 1,
    backgroundColor: iteraColors.surface,
  },
  filterChip: {
    minHeight: 36,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 9,
    borderColor: iteraColors.border,
    borderRadius: iteraRadii.pill,
    borderWidth: 1,
    backgroundColor: iteraColors.surface,
    paddingLeft: 10,
    paddingRight: 8,
  },
  filterDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  filterChipText: {
    color: iteraColors.muted,
    fontSize: 12,
  },
  cardList: {
    gap: 9,
    marginTop: 12,
  },
  cardRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderColor: iteraColors.border,
    borderRadius: iteraRadii.card,
    borderWidth: 1,
    backgroundColor: iteraColors.surface,
    paddingVertical: 9,
    paddingHorizontal: 10,
    ...cardShadow,
  },
  interactionMark: {
    width: 46,
    height: 46,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: iteraRadii.control,
  },
  cardCopy: {
    minWidth: 0,
    flex: 1,
  },
  cardPrompt: {
    color: iteraColors.inkBrand,
    fontSize: 13,
    fontWeight: '700',
  },
  cardMeta: {
    marginTop: 4,
    color: iteraColors.muted,
    fontSize: 11,
  },
  cardStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    color: iteraColors.muted,
    fontSize: 11,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 14,
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
  insightsCard: {
    alignItems: 'center',
    marginTop: 16,
    borderColor: iteraColors.border,
    borderRadius: iteraRadii.card,
    borderWidth: 1,
    backgroundColor: iteraColors.surface,
    padding: 28,
  },
  insightsTitle: {
    marginTop: 10,
    color: iteraColors.inkBrand,
    fontSize: 16,
    fontWeight: '700',
  },
  insightsText: {
    maxWidth: 320,
    marginTop: 6,
    color: iteraColors.muted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.65,
  },
})
