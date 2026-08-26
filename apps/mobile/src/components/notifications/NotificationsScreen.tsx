import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { iteraColors, iteraRadii } from '@itera/core'
import { useRouter } from 'expo-router'
import type { ComponentProps } from 'react'
import { useMemo, useState } from 'react'
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { mobileRuntimeMode } from '@/src/config/mobileRuntimeMode'
import type {
  MobileNotificationDestination,
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
        { backgroundColor: item.unread ? visual.background : iteraColors.surface },
      ]}
    >
      <MaterialCommunityIcons
        color={item.unread ? visual.color : iteraColors.muted}
        name={visual.icon}
        size={28}
      />
    </View>
  )
}

// What opening the row will actually do, named for the surface it lands on.
//
// A row without a destination marks itself read and says only that, rather than
// implying navigation the app cannot perform. Every notification in the demo
// workspace has one, but the case is kept because the field is optional and a
// silent, dead-end row would be exactly the defect this copy exists to prevent.
const DESTINATION_NAMES: Record<MobileNotificationDestination['kind'], string> = {
  deck: 'the deck',
  collection: 'the collection',
  review: 'your review session',
  progress: 'your progress',
}

function notificationHint(item: MobileNotificationItem): string {
  if (!item.destination) {
    return item.unread ? 'Marks this notification as read' : 'No further action'
  }
  const name = DESTINATION_NAMES[item.destination.kind]
  return item.unread ? `Marks this as read and opens ${name}` : `Opens ${name}`
}

function NotificationRow({
  item,
  onPress,
  onMarkRead,
  onMarkUnread,
}: {
  item: MobileNotificationItem
  onPress: () => void
  onMarkRead: () => void
  onMarkUnread: () => void
}) {
  return (
    <View
      style={[
        styles.notificationCard,
        !item.unread && styles.notificationCardRead,
      ]}
    >
      <Pressable
        accessibilityHint={notificationHint(item)}
        accessibilityLabel={`${item.unread ? 'Unread. ' : ''}${item.title}. ${item.body}. ${item.timeLabel}`}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.notificationOpen, pressed && styles.pressed]}
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
      </Pressable>
      <View style={styles.notificationMeta}>
        <Text
          numberOfLines={2}
          style={[styles.notificationTime, !item.unread && styles.notificationTimeRead]}
        >
          {item.timeLabel}
        </Text>
        <Pressable
          accessibilityHint="Changes the status without opening the notification"
          accessibilityLabel={`Mark ${item.title} as ${item.unread ? 'read' : 'unread'}`}
          accessibilityRole="button"
          onPress={item.unread ? onMarkRead : onMarkUnread}
          style={({ pressed }) => [styles.statusToggle, pressed && styles.pressed]}
        >
          {item.unread ? (
            <View style={styles.unreadLabel}>
              <View style={styles.unreadDot} />
              <Text style={styles.unreadText}>Unread</Text>
            </View>
          ) : (
            <View style={styles.readLabel}>
              <MaterialCommunityIcons color={iteraColors.muted} name="check" size={12} />
              <Text style={styles.readText}>Read</Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
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
  onMarkUnread,
  onMarkAllRead,
}: {
  viewModel: MobileNotificationsViewModel
  onMarkRead: (id: string) => void
  onMarkUnread: (id: string) => void
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
    const destination = item.destination
    if (!destination) return
    switch (destination.kind) {
      case 'deck':
        router.push({
          pathname: '/library/deck/[deckId]',
          params: { deckId: destination.deckId },
        })
        return
      case 'collection':
        router.push({
          pathname: '/library/[collectionId]',
          params: { collectionId: destination.collectionId },
        })
        return
      case 'review':
        router.push('/review')
        return
      case 'progress':
        router.push('/progress')
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
          {/* The notification settings section is a cloud-mode surface; demo
              mode does not render it, so the shortcut to it would land on a
              Profile screen with nothing to show. */}
          {mobileRuntimeMode === 'demo' ? null : (
            <Pressable
              accessibilityLabel="Open notification settings"
              accessibilityRole="button"
              onPress={() => router.push('/profile?section=notifications')}
              style={({ pressed }) => [styles.settingsButton, pressed && styles.pressed]}
            >
              <MaterialCommunityIcons color={iteraColors.inkBrand} name="cog-outline" size={21} />
              <Text style={styles.settingsText}>Settings</Text>
            </Pressable>
          )}
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
                      style={({ pressed }) => [styles.markAll, pressed && styles.pressed]}
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
                      onMarkRead={() => onMarkRead(item.id)}
                      onMarkUnread={() => onMarkUnread(item.id)}
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
  markAll: { minHeight: 44, justifyContent: 'center', paddingLeft: 12 },
  markAllText: { color: iteraColors.accent, fontSize: 14, fontWeight: '600' },
  notificationList: { gap: 11, marginTop: 6 },
  notificationCard: { minHeight: 114, flexDirection: 'row', alignItems: 'stretch', overflow: 'hidden', borderColor: iteraColors.border, borderRadius: iteraRadii.card, borderWidth: 1, backgroundColor: iteraColors.surface, padding: 13, ...cardShadow },
  notificationCardRead: {
    borderColor: iteraColors.border,
    backgroundColor: iteraColors.navySoft,
    shadowOpacity: 0.025,
  },
  notificationOpen: { minWidth: 0, flex: 1, flexDirection: 'row', alignItems: 'center' },
  iconMark: { width: 52, height: 52, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: 26 },
  deckMark: { width: 52, height: 52, flexShrink: 0, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 13, backgroundColor: iteraColors.navy },
  deckMarkText: { zIndex: 2, color: iteraColors.surface, fontSize: 18, fontWeight: '700' },
  readMark: { backgroundColor: iteraColors.muted, opacity: 0.82 },
  readMarkText: { color: iteraColors.surface },
  deckStripeDark: { position: 'absolute', right: -9, bottom: 0, width: 38, height: 8, backgroundColor: '#344967', transform: [{ rotate: '-34deg' }] },
  deckStripeAccent: { position: 'absolute', right: -7, bottom: -2, width: 32, height: 7, backgroundColor: iteraColors.accent, transform: [{ rotate: '-34deg' }] },
  notificationCopy: { minWidth: 0, flex: 1, marginLeft: 13, marginRight: 8 },
  notificationTitle: { color: iteraColors.inkBrand, fontSize: 15, fontWeight: '700', lineHeight: 20 },
  notificationTitleRead: { color: iteraColors.muted },
  notificationBody: { marginTop: 4, color: iteraColors.muted, fontSize: 13, lineHeight: 18 },
  notificationBodyRead: { color: iteraColors.muted },
  notificationMeta: { width: 82, alignItems: 'flex-end', justifyContent: 'space-between' },
  notificationTime: { color: iteraColors.muted, fontSize: 11, lineHeight: 15, textAlign: 'right' },
  notificationTimeRead: { color: iteraColors.muted },
  statusToggle: { minWidth: 72, minHeight: 44, alignItems: 'flex-end', justifyContent: 'flex-end' },
  unreadLabel: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: iteraColors.accent },
  unreadText: { color: iteraColors.accent, fontSize: 10, fontWeight: '700' },
  readLabel: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: iteraRadii.pill, backgroundColor: iteraColors.border, paddingHorizontal: 6, paddingVertical: 3 },
  readText: { color: iteraColors.muted, fontSize: 10, fontWeight: '700' },
  emptyState: { alignItems: 'center', marginTop: 32, borderColor: iteraColors.border, borderRadius: iteraRadii.dialog, borderWidth: 1, backgroundColor: iteraColors.surface, paddingHorizontal: 20, paddingVertical: 40, ...cardShadow },
  emptyIcon: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 26, backgroundColor: iteraColors.successSoft },
  emptyTitle: { marginTop: 14, color: iteraColors.inkBrand, fontSize: 19, fontWeight: '700' },
  emptyText: { marginTop: 5, color: iteraColors.muted, fontSize: 14, textAlign: 'center' },
  pressed: { opacity: 0.68 },
})
