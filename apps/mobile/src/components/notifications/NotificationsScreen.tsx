import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { iteraColors, iteraRadii } from '@itera/core'
import { useRouter } from 'expo-router'
import type { ComponentProps } from 'react'
import { useMemo, useState } from 'react'
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import type {
  MobileNotificationItem,
  MobileNotificationsViewModel,
} from '@/src/types/notifications'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']
type Filter = 'all' | 'unread'

const notificationVisuals: Record<
  Exclude<MobileNotificationItem['kind'], 'deck'>,
  { icon: IconName; color: string; background: string }
> = {
  session: { icon: 'calendar-check-outline', color: iteraColors.accent, background: iteraColors.accentSoft },
  streak: { icon: 'fire', color: iteraColors.accent, background: iteraColors.accentSoft },
  retention: { icon: 'sync', color: iteraColors.success, background: iteraColors.successSoft },
  warning: { icon: 'alert-outline', color: iteraColors.accent, background: iteraColors.accentSoft },
  import: { icon: 'clipboard-check-outline', color: '#2563eb', background: '#eff6ff' },
  cards: { icon: 'school-outline', color: '#7c3aed', background: '#f5f3ff' },
}

function NotificationMark({ item }: { item: MobileNotificationItem }) {
  if (item.kind === 'deck') {
    return (
      <View style={[styles.deckMark, !item.unread && styles.readMark]}>
        <Text style={[styles.deckMarkText, !item.unread && styles.readMarkText]}>
          {item.deckMark}
        </Text>
        <View style={styles.deckStripeDark} />
        <View style={styles.deckStripeAccent} />
      </View>
    )
  }

  const visual = notificationVisuals[item.kind]
  return (
    <View
      style={[
        styles.iconMark,
        { backgroundColor: item.unread ? visual.background : iteraColors.navySoft },
      ]}
    >
      <MaterialCommunityIcons
        color={item.unread ? visual.color : iteraColors.mutedLight}
        name={visual.icon}
        size={28}
      />
    </View>
  )
}

function notificationHint(item: MobileNotificationItem): string {
  // Two honest destinations, described differently. A notification that names a
  // deck in the workspace opens it; one that refers to something the product
  // does not have yet only marks itself read, and says so rather than implying
  // a destination that does not exist.
  if (item.deckId) {
    return item.unread ? 'Marks this as read and opens the deck' : 'Opens the deck'
  }
  return item.unread ? 'Marks this notification as read' : 'No further action'
}

function NotificationRow({
  item,
  onPress,
}: {
  item: MobileNotificationItem
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityHint={notificationHint(item)}
      accessibilityLabel={`${item.unread ? 'Unread. ' : ''}${item.title}. ${item.body}. ${item.timeLabel}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.notificationCard,
        !item.unread && styles.notificationCardRead,
        pressed && styles.pressed,
      ]}
    >
      <NotificationMark item={item} />
      <View style={styles.notificationCopy}>
        <Text style={[styles.notificationTitle, !item.unread && styles.notificationTitleRead]}>
          {item.title}
        </Text>
        <Text style={[styles.notificationBody, !item.unread && styles.notificationBodyRead]}>
          {item.body}
        </Text>
      </View>
      <View style={styles.notificationMeta}>
        <Text
          numberOfLines={2}
          style={[styles.notificationTime, !item.unread && styles.notificationTimeRead]}
        >
          {item.timeLabel}
        </Text>
        {item.unread ? (
          <View style={styles.unreadLabel}>
            <View style={styles.unreadDot} />
            <Text style={styles.unreadText}>Unread</Text>
          </View>
        ) : (
          <View style={styles.readLabel}>
            <MaterialCommunityIcons color="#596273" name="check" size={12} />
            <Text style={styles.readText}>Read</Text>
          </View>
        )}
      </View>
      {!item.unread ? <View style={styles.readOverlay} /> : null}
    </Pressable>
  )
}

function FilterControl({ filter, onChange }: { filter: Filter; onChange: (filter: Filter) => void }) {
  return (
    <View accessibilityRole="tablist" style={styles.segmentedControl}>
      {(['all', 'unread'] as const).map((option) => {
        const selected = option === filter
        return (
          <Pressable
            key={option}
            // "Unread" is also what every unread row's badge says, so the tab
            // says what it does rather than repeating a word.
            accessibilityLabel={option === 'all' ? 'Show all notifications' : 'Show unread only'}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option)}
            style={({ pressed }) => [
              styles.segment,
              selected && styles.segmentSelected,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>
              {option === 'all' ? 'All' : 'Unread'}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

export function NotificationsScreen({
  viewModel,
  onMarkRead,
  onMarkAllRead,
}: {
  viewModel: MobileNotificationsViewModel
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
}) {
  const router = useRouter()
  const [filter, setFilter] = useState<Filter>('all')
  const items = viewModel.items
  const visibleItems = useMemo(
    () => (filter === 'unread' ? items.filter((item) => item.unread) : items),
    [filter, items],
  )

  const groupedItems = (['today', 'earlier'] as const).map((group) => ({
    group,
    items: visibleItems.filter((item) => item.group === group),
  }))

  // "Mark all as read" used to live in the Today heading unconditionally, so it
  // was unreachable whenever the only unread items were under Earlier. It now
  // appears on the first visible group that has any, which is the same single
  // affordance in the same place, just never missing.
  const markAllGroup = groupedItems.find(
    (entry) => entry.items.some((item) => item.unread),
  )?.group

  function goBack() {
    if (router.canGoBack()) router.back()
    else router.replace('/today')
  }

  function openNotification(item: MobileNotificationItem) {
    if (item.unread) onMarkRead(item.id)
    if (item.deckId) {
      router.push({ pathname: '/library/deck/[deckId]', params: { deckId: item.deckId } })
    }
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
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          accessibilityLabel="Back"
          accessibilityRole="button"
          hitSlop={8}
          onPress={goBack}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <MaterialCommunityIcons color={iteraColors.inkBrand} name="chevron-left" size={28} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <View style={styles.headingRow}>
          <View style={styles.headingIcon}>
            <MaterialCommunityIcons color={iteraColors.inkBrand} name="bell-outline" size={31} />
          </View>
          <View style={styles.headingCopy}>
            <Text style={styles.title}>{viewModel.title}</Text>
            <Text style={styles.subtitle}>{viewModel.subtitle}</Text>
          </View>
        </View>

        <View style={styles.controls}>
          <FilterControl filter={filter} onChange={setFilter} />
          <Pressable
            accessibilityLabel="Open notification settings"
            accessibilityRole="button"
            onPress={() => router.push('/profile?section=notifications')}
            style={({ pressed }) => [styles.settingsButton, pressed && styles.pressed]}
          >
            <MaterialCommunityIcons color={iteraColors.inkBrand} name="cog-outline" size={21} />
            <Text style={styles.settingsText}>Settings</Text>
          </Pressable>
        </View>

        {visibleItems.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <MaterialCommunityIcons color={iteraColors.success} name="check" size={28} />
            </View>
            <Text style={styles.emptyTitle}>You’re all caught up</Text>
            <Text style={styles.emptyText}>There are no unread updates right now.</Text>
          </View>
        ) : (
          groupedItems.map(({ group, items: groupItems }) =>
            groupItems.length > 0 ? (
              <View key={group} style={styles.section}>
                <View style={styles.sectionHeading}>
                  <Text style={styles.sectionTitle}>{group === 'today' ? 'Today' : 'Earlier'}</Text>
                  {group === markAllGroup ? (
                    <Pressable
                      accessibilityRole="button"
                      hitSlop={8}
                      onPress={onMarkAllRead}
                      style={({ pressed }) => pressed && styles.pressed}
                    >
                      <Text style={styles.markAllText}>Mark all as read</Text>
                    </Pressable>
                  ) : null}
                </View>
                <View style={styles.notificationList}>
                  {groupItems.map((item) => (
                    <NotificationRow
                      key={item.id}
                      item={item}
                      onPress={() => openNotification(item)}
                    />
                  ))}
                </View>
              </View>
            ) : null,
          )
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const cardShadow = Platform.select({
  ios: {
    shadowColor: iteraColors.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.055,
    shadowRadius: 11,
  },
  android: { elevation: 2 },
  web: { boxShadow: '0 4px 11px rgba(30,41,59,0.055)' },
})

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: iteraColors.canvas },
  decorativeField: { position: 'absolute', top: 0, right: 0, left: 0, height: 240, overflow: 'hidden', pointerEvents: 'none' },
  decorativeShapeLarge: { position: 'absolute', top: 14, right: -92, width: 260, height: 135, borderRadius: 78, backgroundColor: iteraColors.accentSofter, transform: [{ rotate: '-12deg' }] },
  decorativeShapeSmall: { position: 'absolute', top: 65, right: -78, width: 225, height: 91, borderRadius: 56, backgroundColor: iteraColors.accentSoft, opacity: 0.72, transform: [{ rotate: '-7deg' }] },
  scrollContent: { width: '100%', maxWidth: 600, alignSelf: 'center', paddingHorizontal: 18, paddingTop: 8, paddingBottom: 38 },
  backButton: { minWidth: 72, minHeight: 44, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', marginLeft: -7 },
  backText: { color: iteraColors.inkBrand, fontSize: 16, fontWeight: '600' },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 15, marginTop: 5 },
  headingIcon: { width: 58, height: 58, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderColor: iteraColors.border, borderRadius: iteraRadii.card, borderWidth: 1, backgroundColor: iteraColors.surface },
  headingCopy: { minWidth: 0, flex: 1 },
  title: { color: iteraColors.inkBrand, fontSize: 31, fontWeight: '700', letterSpacing: -0.8, lineHeight: 37 },
  subtitle: { maxWidth: 340, marginTop: 3, color: iteraColors.muted, fontSize: 15, lineHeight: 21 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 28 },
  segmentedControl: { minWidth: 180, flex: 1, flexDirection: 'row', overflow: 'hidden', borderColor: iteraColors.border, borderRadius: iteraRadii.control, borderWidth: 1, backgroundColor: iteraColors.surfaceSubtle },
  segment: { minHeight: 46, flex: 1, alignItems: 'center', justifyContent: 'center' },
  segmentSelected: { borderColor: iteraColors.accent, borderRadius: iteraRadii.control, borderWidth: 1, backgroundColor: iteraColors.surface },
  segmentText: { color: iteraColors.muted, fontSize: 15, fontWeight: '600' },
  segmentTextSelected: { color: iteraColors.accent },
  settingsButton: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 7, borderColor: iteraColors.borderStrong, borderRadius: iteraRadii.control, borderWidth: 1, backgroundColor: iteraColors.surface, paddingHorizontal: 13 },
  settingsText: { color: iteraColors.inkBrand, fontSize: 15, fontWeight: '600' },
  section: { marginTop: 25 },
  sectionHeading: { minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: iteraColors.inkBrand, fontSize: 18, fontWeight: '700' },
  markAllText: { color: iteraColors.accent, fontSize: 14, fontWeight: '600' },
  notificationList: { gap: 11, marginTop: 6 },
  notificationCard: { minHeight: 114, flexDirection: 'row', alignItems: 'center', overflow: 'hidden', borderColor: iteraColors.border, borderRadius: iteraRadii.card, borderWidth: 1, backgroundColor: iteraColors.surface, padding: 13, ...cardShadow },
  notificationCardRead: {
    borderColor: '#cbd0d8',
    backgroundColor: '#e2e5e9',
    shadowOpacity: 0,
  },
  iconMark: { width: 52, height: 52, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: 26 },
  deckMark: { width: 52, height: 52, flexShrink: 0, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 13, backgroundColor: iteraColors.navy },
  deckMarkText: { zIndex: 2, color: iteraColors.surface, fontSize: 18, fontWeight: '700' },
  readMark: { backgroundColor: '#667085', opacity: 0.72 },
  readMarkText: { color: '#eef0f4' },
  deckStripeDark: { position: 'absolute', right: -9, bottom: 0, width: 38, height: 8, backgroundColor: '#344967', transform: [{ rotate: '-34deg' }] },
  deckStripeAccent: { position: 'absolute', right: -7, bottom: -2, width: 32, height: 7, backgroundColor: iteraColors.accent, transform: [{ rotate: '-34deg' }] },
  notificationCopy: { minWidth: 0, flex: 1, marginHorizontal: 13 },
  notificationTitle: { color: iteraColors.inkBrand, fontSize: 15, fontWeight: '700', lineHeight: 20 },
  notificationTitleRead: { color: '#697386' },
  notificationBody: { marginTop: 4, color: iteraColors.muted, fontSize: 13, lineHeight: 18 },
  notificationBodyRead: { color: iteraColors.mutedLight },
  notificationMeta: { zIndex: 2, width: 72, alignSelf: 'stretch', alignItems: 'flex-end', justifyContent: 'space-between' },
  notificationTime: { color: iteraColors.muted, fontSize: 11, lineHeight: 15, textAlign: 'right' },
  notificationTimeRead: { color: iteraColors.mutedLight },
  unreadLabel: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: iteraColors.accent },
  unreadText: { color: iteraColors.accent, fontSize: 10, fontWeight: '700' },
  readLabel: { zIndex: 2, flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: iteraRadii.pill, backgroundColor: '#d4d8df', paddingHorizontal: 6, paddingVertical: 3 },
  readText: { color: '#4f596a', fontSize: 10, fontWeight: '700' },
  readOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 1, borderRadius: iteraRadii.card, backgroundColor: 'rgba(148, 156, 170, 0.38)', pointerEvents: 'none' },
  emptyState: { alignItems: 'center', marginTop: 32, borderColor: iteraColors.border, borderRadius: iteraRadii.dialog, borderWidth: 1, backgroundColor: iteraColors.surface, paddingHorizontal: 20, paddingVertical: 40, ...cardShadow },
  emptyIcon: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 26, backgroundColor: iteraColors.successSoft },
  emptyTitle: { marginTop: 14, color: iteraColors.inkBrand, fontSize: 19, fontWeight: '700' },
  emptyText: { marginTop: 5, color: iteraColors.muted, fontSize: 14, textAlign: 'center' },
  pressed: { opacity: 0.68 },
})
