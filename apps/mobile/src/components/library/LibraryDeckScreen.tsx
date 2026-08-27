import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import {
  checkDeckDeletion,
  iteraColors,
  iteraRadii,
  markLabelFor,
  useDeleteCard,
  useDeleteDeck,
} from '@itera/core'
import { useRouter } from 'expo-router'
import type { ComponentProps } from 'react'
import { useMemo, useState } from 'react'
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import {
  AUTHORABLE_INTERACTION_DESCRIPTIONS,
  AUTHORABLE_INTERACTION_LABELS,
  AUTHORABLE_INTERACTION_TYPES,
  isAuthorableInteraction,
} from '@/src/components/cards/authoringTypes'
import { ActionSheet, type ActionSheetItem } from '@/src/components/ui/ActionSheet'
import { ConfirmSheet } from '@/src/components/ui/ConfirmSheet'
import { IteraButton } from '@/src/components/ui/IteraButton'
import type {
  MobileCardStatus,
  MobileDeckCardViewModel,
  MobileDeckViewModel,
} from '@/src/types/library'
import { cardStatusMatches, type CardStatusFilter } from './cardFiltering'
import { CardStatusSheet } from './CardStatusSheet'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

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

// The row opens the card it names, by its own canonical id, and its trailing
// control opens that card's actions.
//
// The two are deliberately separate targets and the row's tap is never
// ambiguous: tapping the row is always Study, and management is always the
// explicit control. An earlier decorative kebab glyph sat here and did nothing;
// this replaces it with a real 44-point button whose every listed item works.
function CardRow({
  card,
  onOpen,
  onActions,
}: {
  card: MobileDeckCardViewModel
  onOpen: () => void
  onActions: () => void
}) {
  const visual = interactionVisuals[card.interactionType]
  return (
    <View style={styles.cardRowWrap}>
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
      </Pressable>

      <Pressable
        accessibilityHint="Edit or delete this card"
        accessibilityLabel={`Actions for ${card.prompt}`}
        accessibilityRole="button"
        hitSlop={4}
        onPress={onActions}
        style={({ pressed }) => [styles.cardActions, pressed && styles.pressed]}
      >
        <MaterialCommunityIcons color={iteraColors.muted} name="dots-vertical" size={22} />
      </Pressable>
    </View>
  )
}

// What a refused deletion says. The rule is core's; only the wording is here,
// and it names what is actually in the way so "move or delete them first" is
// actionable rather than a scold.
function blockedDeletionMessage(viewModel: MobileDeckViewModel): string {
  const parts: string[] = []
  if (viewModel.childDeckCount > 0) {
    parts.push(`${viewModel.childDeckCount} deck${viewModel.childDeckCount === 1 ? '' : 's'}`)
  }
  if (viewModel.cardCount > 0) {
    parts.push(`${viewModel.cardCount} card${viewModel.cardCount === 1 ? '' : 's'}`)
  }
  return `It still contains ${parts.join(' and ')}. Move or delete them first.`
}

export function LibraryDeckScreen({ viewModel }: { viewModel: MobileDeckViewModel }) {
  const router = useRouter()
  const deleteDeck = useDeleteDeck()
  const deleteCard = useDeleteCard()
  const [query, setQuery] = useState('')
  // Defaults to showing everything. It used to default to New-only, which hid
  // cards behind a filter nobody had chosen.
  const [statusFilter, setStatusFilter] = useState<CardStatusFilter>('all')
  const [filterOpen, setFilterOpen] = useState(false)
  const [deckActionsOpen, setDeckActionsOpen] = useState(false)
  const [typeChooserOpen, setTypeChooserOpen] = useState(false)
  const [deckDeleteOpen, setDeckDeleteOpen] = useState(false)
  const [deckDeleteBlocked, setDeckDeleteBlocked] = useState(false)
  const [actionCard, setActionCard] = useState<MobileDeckCardViewModel | null>(null)
  const [cardPendingDelete, setCardPendingDelete] = useState<MobileDeckCardViewModel | null>(null)

  // The shared rule, called not restated: a deck may not be deleted while its
  // own cards or its child decks would be stranded by the removal. Web asks the
  // same function with the same two counts, and neither platform decides it.
  const deletion = checkDeckDeletion({
    directCardCount: viewModel.cardCount,
    childDeckCount: viewModel.childDeckCount,
  })

  function requestDeckDelete() {
    if (deletion.allowed) setDeckDeleteOpen(true)
    else setDeckDeleteBlocked(true)
  }

  async function confirmDeckDelete() {
    await deleteDeck.mutateAsync(viewModel.id)
    // Never leave the user on the route of a deck that no longer exists.
    if (router.canGoBack()) router.back()
    else router.replace('/library')
  }

  const deckActions: ActionSheetItem[] = [
    {
      label: 'Edit deck',
      icon: 'pencil-outline',
      hint: 'Change the name or description',
      onPress: () =>
        router.push({ pathname: '/deck/[deckId]/edit', params: { deckId: viewModel.id } }),
    },
    {
      label: 'Delete deck',
      icon: 'trash-can-outline',
      danger: true,
      onPress: requestDeckDelete,
    },
  ]

  // Edit is offered only for the interaction types this platform can currently
  // author. The other four are fully studyable and reviewable and nothing here
  // calls them broken - they simply have no editor yet, so no control claims
  // one (see authoringTypes.ts).
  const cardActions: ActionSheetItem[] = actionCard
    ? [
        ...(isAuthorableInteraction(actionCard.interactionType)
          ? [
              {
                label: 'Edit card',
                icon: 'pencil-outline' as const,
                onPress: () =>
                  router.push({
                    pathname: '/card/[cardId]/edit',
                    params: { cardId: actionCard.id },
                  }),
              },
            ]
          : []),
        {
          label: 'Delete card',
          icon: 'trash-can-outline',
          danger: true,
          onPress: () => setCardPendingDelete(actionCard),
        },
      ]
    : []

  const cardTypeActions: ActionSheetItem[] = AUTHORABLE_INTERACTION_TYPES.map((type) => ({
    label: AUTHORABLE_INTERACTION_LABELS[type],
    icon: interactionVisuals[type].icon,
    hint: AUTHORABLE_INTERACTION_DESCRIPTIONS[type],
    onPress: () =>
      router.push({
        pathname: '/deck/[deckId]/card-new',
        params: { deckId: viewModel.id, type },
      }),
  }))

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
          accessibilityLabel="Back"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <MaterialCommunityIcons color="#49658e" name="chevron-left" size={27} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <View style={styles.identityRow}>
          <View style={styles.deckMark}>
            <Text style={styles.deckMarkText}>{markLabelFor(viewModel.name, 2)}</Text>
            <View style={styles.deckMarkRibbonMuted} />
            <View style={styles.deckMarkRibbonAccent} />
          </View>

          <View style={styles.identityContent}>
            <Text numberOfLines={1} style={styles.collectionCaption}>
              {viewModel.collectionName}
            </Text>
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

                What sits here now is a real control: every item behind it
                works.
              */}
              <Pressable
                accessibilityHint="Edit or delete this deck"
                accessibilityLabel="Deck actions"
                accessibilityRole="button"
                hitSlop={6}
                onPress={() => setDeckActionsOpen(true)}
                style={({ pressed }) => [styles.deckActions, pressed && styles.pressed]}
              >
                <MaterialCommunityIcons
                  color={iteraColors.muted}
                  name="dots-vertical"
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

        {/*
          Add Card opens the type chooser rather than one hard-wired editor,
          because the deck holds cards of every interaction type and picking one
          is the first authoring decision. The chooser lists only what this
          platform can author today.
        */}
        <IteraButton
          accessibilityHint="Choose a card type to author"
          label="Add Card"
          onPress={() => setTypeChooserOpen(true)}
          style={styles.addCard}
          variant="secondary"
        />

        <View style={styles.cardsSection}>
          <Text style={styles.cardsHeading}>Cards</Text>

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
                hitSlop={13}
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
                onActions={() => setActionCard(card)}
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
                  ? "This deck doesn't have any cards yet."
                  : 'Try another search or clear the status filter.'}
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <CardStatusSheet
        filter={statusFilter}
        onChange={setStatusFilter}
        onClose={() => setFilterOpen(false)}
        visible={filterOpen}
      />

      <ActionSheet
        items={deckActions}
        onClose={() => setDeckActionsOpen(false)}
        subtitle={viewModel.name}
        title="Deck actions"
        visible={deckActionsOpen}
      />

      <ActionSheet
        items={cardTypeActions}
        onClose={() => setTypeChooserOpen(false)}
        subtitle="More card types can be authored on the web app."
        title="Add a card"
        visible={typeChooserOpen}
      />

      <ActionSheet
        items={cardActions}
        onClose={() => setActionCard(null)}
        subtitle={actionCard?.prompt}
        title="Card actions"
        visible={actionCard !== null}
      />

      <ConfirmSheet
        confirmLabel={`Delete ${viewModel.name}`}
        description="This deck will be removed permanently. This cannot be undone."
        onClose={() => setDeckDeleteOpen(false)}
        onConfirm={confirmDeckDelete}
        title={`Delete “${viewModel.name}”?`}
        visible={deckDeleteOpen}
      />

      <ConfirmSheet
        description={blockedDeletionMessage(viewModel)}
        kind="alert"
        onClose={() => setDeckDeleteBlocked(false)}
        title={`“${viewModel.name}” isn’t empty`}
        visible={deckDeleteBlocked}
      />

      <ConfirmSheet
        confirmLabel="Delete card"
        description={
          cardPendingDelete
            ? `“${cardPendingDelete.prompt}” will be removed permanently. This cannot be undone.`
            : ''
        }
        onClose={() => setCardPendingDelete(null)}
        onConfirm={() => {
          if (cardPendingDelete) deleteCard.mutate(cardPendingDelete.id)
        }}
        title="Delete this card?"
        visible={cardPendingDelete !== null}
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
  collectionCaption: {
    marginBottom: 3,
    color: iteraColors.muted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
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
  cardsSection: {
    marginTop: 22,
    borderTopColor: iteraColors.border,
    borderTopWidth: 1,
    paddingTop: 18,
  },
  cardsHeading: {
    color: iteraColors.inkBrand,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
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
  addCard: {
    marginTop: 11,
  },
  deckActions: {
    width: 40,
    height: 40,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardRowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: iteraColors.border,
    borderRadius: iteraRadii.card,
    borderWidth: 1,
    backgroundColor: iteraColors.surface,
    paddingRight: 2,
    ...cardShadow,
  },
  cardActions: {
    width: 40,
    minHeight: 44,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardRow: {
    minWidth: 0,
    flex: 1,
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    paddingLeft: 10,
    paddingRight: 4,
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
  pressed: {
    opacity: 0.65,
  },
})
