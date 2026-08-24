import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { iteraColors, iteraRadii } from '@itera/core'
import { useRouter } from 'expo-router'
import type { ComponentProps } from 'react'
import { useMemo, useState } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { MobileHeader } from '@/src/components/today/MobileHeader'
import type {
  MobileLibraryCollectionViewModel,
  MobileLibraryViewModel,
} from '@/src/types/library'
import { LibraryDeckRow } from './LibraryDeckRow'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

function DisabledAction({
  icon,
  label,
  primary = false,
}: {
  icon: IconName
  label: string
  primary?: boolean
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: true }}
      disabled
      style={[styles.actionButton, primary ? styles.actionPrimary : styles.actionSecondary]}
    >
      <MaterialCommunityIcons
        color={primary ? iteraColors.surface : iteraColors.inkBrand}
        name={icon}
        size={22}
      />
      <Text style={[styles.actionLabel, primary && styles.actionLabelPrimary]}>{label}</Text>
    </Pressable>
  )
}

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
        color={selected ? iteraColors.inkBrand : iteraColors.muted}
        name={icon}
        size={18}
      />
      <Text style={[styles.collectionPillText, selected && styles.collectionPillTextSelected]}>
        {collection.name}
      </Text>
    </Pressable>
  )
}

function DisabledControl({
  icon,
  label,
  flex = 1,
}: {
  icon?: IconName
  label: string
  flex?: number
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: true }}
      disabled
      style={[styles.control, { flex }]}
    >
      {icon ? (
        <MaterialCommunityIcons color={iteraColors.inkBrand} name={icon} size={20} />
      ) : null}
      <Text numberOfLines={1} style={styles.controlText}>
        {label}
      </Text>
      <MaterialCommunityIcons color={iteraColors.inkBrand} name="chevron-down" size={18} />
    </Pressable>
  )
}

export function LibraryAllDecksScreen({ viewModel }: { viewModel: MobileLibraryViewModel }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [dueOnly, setDueOnly] = useState(false)

  const visibleDecks = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    return viewModel.decks.filter((deck) => {
      if (dueOnly && deck.dueCount === 0) return false
      if (!normalizedQuery) return true
      return `${deck.name} ${deck.description}`.toLocaleLowerCase().includes(normalizedQuery)
    })
  }, [dueOnly, query, viewModel.decks])

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

        <View style={styles.actionsRow}>
          <DisabledAction icon="plus" label="New Deck" primary />
          <DisabledAction icon="upload-outline" label="Import" />
        </View>

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
                collection.id === 'fixture-interview-core'
                  ? () =>
                      router.push({
                        pathname: '/library/[collectionId]',
                        params: { collectionId: collection.id },
                      })
                  : undefined
              }
            />
          ))}
          <Pressable
            accessibilityLabel="All collections unavailable"
            accessibilityRole="button"
            accessibilityState={{ disabled: true }}
            disabled
            style={styles.allCollectionsButton}
          >
            <MaterialCommunityIcons color={iteraColors.muted} name="view-grid-outline" size={20} />
          </Pressable>
        </ScrollView>

        <View style={styles.searchWrap}>
          <MaterialCommunityIcons color={iteraColors.mutedLight} name="magnify" size={23} />
          <TextInput
            accessibilityLabel="Search decks"
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            onChangeText={setQuery}
            placeholder="Search decks..."
            placeholderTextColor={iteraColors.mutedLight}
            returnKeyType="search"
            style={styles.searchInput}
            value={query}
          />
        </View>

        <View style={styles.controlsRow}>
          <DisabledControl flex={0.85} icon="filter-outline" label="Filter" />
          <DisabledControl flex={1.25} label="Sort: Last studied" />
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
            <Text numberOfLines={1} style={styles.controlText}>
              Due only
            </Text>
          </Pressable>
        </View>

        <View style={styles.deckList}>
          {visibleDecks.map((deck) => (
            <LibraryDeckRow key={deck.id} deck={deck} />
          ))}
        </View>

        {visibleDecks.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons color={iteraColors.mutedLight} name="cards-outline" size={28} />
            <Text style={styles.emptyTitle}>No matching decks</Text>
            <Text style={styles.emptyText}>Try another search or turn off Due only.</Text>
          </View>
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
    backgroundColor: iteraColors.accentSofter,
    transform: [{ rotate: '-13deg' }],
  },
  decorativeShapeSmall: {
    position: 'absolute',
    top: 58,
    right: -80,
    width: 240,
    height: 108,
    borderRadius: 65,
    backgroundColor: iteraColors.accentSoft,
    opacity: 0.7,
    transform: [{ rotate: '-8deg' }],
  },
  intro: {
    marginTop: 20,
  },
  title: {
    color: iteraColors.inkBrand,
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.8,
    lineHeight: 36,
  },
  subtitle: {
    marginTop: 5,
    color: iteraColors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  actionButton: {
    minHeight: 50,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    borderRadius: iteraRadii.control,
    borderWidth: 1,
  },
  actionPrimary: {
    borderColor: iteraColors.accent,
    backgroundColor: iteraColors.accent,
    opacity: 0.82,
  },
  actionSecondary: {
    borderColor: iteraColors.borderStrong,
    backgroundColor: iteraColors.surface,
    opacity: 0.7,
  },
  actionLabel: {
    color: iteraColors.inkBrand,
    fontSize: 15,
    fontWeight: '600',
  },
  actionLabelPrimary: {
    color: iteraColors.surface,
  },
  sectionLabel: {
    marginTop: 20,
    color: iteraColors.inkBrand,
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
    borderColor: iteraColors.borderStrong,
    borderRadius: iteraRadii.pill,
    borderWidth: 1,
    backgroundColor: iteraColors.surface,
    paddingHorizontal: 14,
  },
  collectionPillSelected: {
    borderColor: iteraColors.accent,
    backgroundColor: iteraColors.accentSoft,
  },
  collectionPillText: {
    color: iteraColors.muted,
    fontSize: 13,
    fontWeight: '500',
  },
  collectionPillTextSelected: {
    color: iteraColors.inkBrand,
    fontWeight: '700',
  },
  allCollectionsButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: iteraColors.borderStrong,
    borderRadius: 21,
    borderWidth: 1,
    backgroundColor: iteraColors.surface,
  },
  searchWrap: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
    borderColor: iteraColors.borderStrong,
    borderRadius: iteraRadii.control,
    borderWidth: 1,
    backgroundColor: iteraColors.surface,
    paddingHorizontal: 14,
  },
  searchInput: {
    minWidth: 0,
    flex: 1,
    color: iteraColors.inkBrand,
    fontSize: 15,
    paddingVertical: 0,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  control: {
    minWidth: 0,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 5,
    borderColor: iteraColors.borderStrong,
    borderRadius: iteraRadii.control,
    borderWidth: 1,
    backgroundColor: iteraColors.surface,
    opacity: 0.72,
    paddingHorizontal: 10,
  },
  dueControl: {
    minWidth: 0,
    minHeight: 48,
    flex: 0.9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderColor: iteraColors.borderStrong,
    borderRadius: iteraRadii.control,
    borderWidth: 1,
    backgroundColor: iteraColors.surface,
    paddingHorizontal: 8,
  },
  controlText: {
    minWidth: 0,
    color: iteraColors.inkBrand,
    fontSize: 12,
    fontWeight: '500',
  },
  checkbox: {
    width: 19,
    height: 19,
    flexShrink: 0,
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
    marginTop: 9,
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
