import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { fliptapColors, fliptapRadii, type DeckSortKey } from '@fliptap/core'
import { useRouter } from 'expo-router'
import type { ComponentProps } from 'react'
import { useMemo, useState } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { FlipTapButton } from '@/src/components/ui/FlipTapButton'
import { SearchField } from '@/src/components/ui/SearchField'
import { MobileHeader } from '@/src/components/today/MobileHeader'
import type {
  MobileLibraryCollectionViewModel,
  MobileLibraryViewModel,
} from '@/src/types/library'
import { deckSortLabel, filterAndSortDeckViewModels } from './deckSorting'
import { LibraryDeckRow } from './LibraryDeckRow'
import { SortSheet } from './SortSheet'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

function CollectionPill({
  collection,
  onPress,
}: {
  collection: MobileLibraryCollectionViewModel
  onPress?: () => void
}) {
  const selected = collection.kind === 'all'
  const disabled = selected || !onPress
  const icon: IconName =
    collection.kind === 'all'
      ? 'layers-outline'
      : collection.kind === 'unfiled'
        ? 'archive-outline'
        : 'folder-outline'

  return (
    <Pressable
      // The pill read as bare text to a screen reader, with nothing to say
      // whether it was the scope already open or somewhere to go.
      accessibilityLabel={
        selected ? collection.name + ', current scope' : 'Open ' + collection.name
      }
      accessibilityRole="button"
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.collectionPill,
        selected && styles.collectionPillSelected,
        pressed && styles.pressed,
      ]}
    >
      <MaterialCommunityIcons
        color={selected ? fliptapColors.inkBrand : fliptapColors.muted}
        name={icon}
        size={18}
      />
      <Text style={[styles.collectionPillText, selected && styles.collectionPillTextSelected]}>
        {collection.name}
      </Text>
    </Pressable>
  )
}

export function LibraryAllDecksScreen({ viewModel }: { viewModel: MobileLibraryViewModel }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [dueOnly, setDueOnly] = useState(false)
  // Web's All Decks default. A Collection defaults to 'name' instead.
  const [sort, setSort] = useState<DeckSortKey>('lastStudied')
  const [sortOpen, setSortOpen] = useState(false)

  const visibleDecks = useMemo(
    () => filterAndSortDeckViewModels(viewModel.decks, { query, dueOnly, sort }),
    [dueOnly, query, sort, viewModel.decks],
  )

  function openDeck(deckId: string) {
    router.push({ pathname: '/deck/[deckId]', params: { deckId } })
  }

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
        <MobileHeader />

        <View style={styles.intro}>
          <Text style={styles.title}>All Decks</Text>
          <Text style={styles.subtitle}>View and manage all your decks.</Text>
        </View>

        {/*
          New Deck creates a top-level deck, which is the same hierarchy
          semantics web's All Decks action has: no parentId. Creating inside a
          collection is the Collection screen's own action, because a collection
          IS a deck and the only thing that differs is the parentId the new deck
          is given.
        */}
        <FlipTapButton
          accessibilityHint="Creates a new top-level deck"
          label="New Deck"
          onPress={() => router.push('/deck/new')}
          style={styles.newDeck}
        />

        <Text style={styles.sectionLabel}>Collections</Text>
        <ScrollView
          contentContainerStyle={styles.collectionRailContent}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.collectionRail}
        >
          {viewModel.collections.map((collection) => (
            <CollectionPill
              key={collection.id}
              collection={collection}
              onPress={
                collection.kind === 'all'
                  ? undefined
                  : () =>
                      router.push({
                        pathname: '/library/[collectionId]',
                        params: { collectionId: collection.id },
                      })
              }
            />
          ))}
        </ScrollView>

        <SearchField
          accessibilityLabel="Search decks"
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
            style={({ pressed }) => [styles.control, pressed && styles.pressed]}
          >
            <MaterialCommunityIcons color={fliptapColors.inkBrand} name="sort" size={20} />
            <Text numberOfLines={1} style={styles.controlText}>
              Sort: {deckSortLabel(sort)}
            </Text>
            <MaterialCommunityIcons color={fliptapColors.inkBrand} name="chevron-down" size={18} />
          </Pressable>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: dueOnly }}
            onPress={() => setDueOnly((value) => !value)}
            style={({ pressed }) => [styles.dueControl, pressed && styles.pressed]}
          >
            <View style={[styles.checkbox, dueOnly && styles.checkboxChecked]}>
              {dueOnly ? (
                <MaterialCommunityIcons color={fliptapColors.surface} name="check" size={15} />
              ) : null}
            </View>
            <Text numberOfLines={1} style={styles.controlText}>
              Due only
            </Text>
          </Pressable>
        </View>

        <View style={styles.deckList}>
          {visibleDecks.map((deck) => (
            <LibraryDeckRow key={deck.id} deck={deck} onPress={() => openDeck(deck.id)} />
          ))}
        </View>

        {visibleDecks.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons color={fliptapColors.mutedLight} name="cards-outline" size={28} />
            <Text style={styles.emptyTitle}>No matching decks</Text>
            <Text style={styles.emptyText}>Try another search or turn off Due only.</Text>
          </View>
        ) : null}
      </ScrollView>

      <SortSheet
        onChange={setSort}
        onClose={() => setSortOpen(false)}
        sort={sort}
        visible={sortOpen}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: fliptapColors.canvas,
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
    paddingBottom: 44,
  },
  decorativeField: {
    position: 'absolute',
    zIndex: 0,
    top: 72,
    right: 0,
    left: 0,
    height: 270,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  decorativeShapeLarge: {
    position: 'absolute',
    top: 0,
    right: -105,
    width: 290,
    height: 165,
    borderRadius: 88,
    backgroundColor: fliptapColors.accentSofter,
    transform: [{ rotate: '-13deg' }],
  },
  decorativeShapeSmall: {
    position: 'absolute',
    top: 58,
    right: -80,
    width: 240,
    height: 108,
    borderRadius: 65,
    backgroundColor: fliptapColors.accentSoft,
    opacity: 0.7,
    transform: [{ rotate: '-8deg' }],
  },
  newDeck: {
    marginTop: 14,
  },
  intro: {
    marginTop: 20,
  },
  title: {
    color: fliptapColors.inkBrand,
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.8,
    lineHeight: 36,
  },
  subtitle: {
    marginTop: 5,
    color: fliptapColors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  sectionLabel: {
    marginTop: 24,
    color: fliptapColors.inkBrand,
    fontSize: 16,
    fontWeight: '700',
  },
  collectionRail: {
    marginTop: 10,
    marginHorizontal: -18,
  },
  collectionRailContent: {
    gap: 8,
    paddingHorizontal: 18,
    paddingRight: 34,
  },
  collectionPill: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderColor: fliptapColors.borderStrong,
    borderRadius: fliptapRadii.pill,
    borderWidth: 1,
    backgroundColor: fliptapColors.surface,
    paddingHorizontal: 14,
  },
  collectionPillSelected: {
    borderColor: fliptapColors.accent,
    backgroundColor: fliptapColors.accentSoft,
  },
  collectionPillText: {
    color: fliptapColors.muted,
    fontSize: 13,
    fontWeight: '500',
  },
  collectionPillTextSelected: {
    color: fliptapColors.inkBrand,
    fontWeight: '700',
  },
  // Only what this screen adds; the field itself is SearchField's.
  searchWrap: {
    marginTop: 18,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  control: {
    minWidth: 0,
    minHeight: 48,
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 5,
    borderColor: fliptapColors.borderStrong,
    borderRadius: fliptapRadii.control,
    borderWidth: 1,
    backgroundColor: fliptapColors.surface,
    paddingHorizontal: 10,
  },
  dueControl: {
    minWidth: 0,
    minHeight: 48,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderColor: fliptapColors.borderStrong,
    borderRadius: fliptapRadii.control,
    borderWidth: 1,
    backgroundColor: fliptapColors.surface,
    paddingHorizontal: 8,
  },
  controlText: {
    minWidth: 0,
    color: fliptapColors.inkBrand,
    fontSize: 12,
    fontWeight: '500',
  },
  checkbox: {
    width: 19,
    height: 19,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: fliptapColors.muted,
    borderRadius: 4,
    borderWidth: 1.4,
    backgroundColor: fliptapColors.surface,
  },
  checkboxChecked: {
    borderColor: fliptapColors.accent,
    backgroundColor: fliptapColors.accent,
  },
  deckList: {
    gap: 10,
    marginTop: 16,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 16,
    borderColor: fliptapColors.border,
    borderRadius: fliptapRadii.card,
    borderWidth: 1,
    backgroundColor: fliptapColors.surface,
    padding: 24,
  },
  emptyTitle: {
    marginTop: 9,
    color: fliptapColors.inkBrand,
    fontSize: 16,
    fontWeight: '700',
  },
  emptyText: {
    marginTop: 4,
    color: fliptapColors.muted,
    fontSize: 13,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.65,
  },
})
