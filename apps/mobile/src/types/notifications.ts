export type MobileNotificationGroup = 'today' | 'earlier'

export type MobileNotificationKind =
  | 'session'
  | 'deck'
  | 'streak'
  | 'retention'
  | 'warning'
  | 'import'
  | 'cards'

export type MobileNotificationDestination =
  | { kind: 'deck'; deckId: string }
  | { kind: 'collection'; collectionId: string }
  | { kind: 'review' }
  | { kind: 'progress' }

export interface MobileNotificationItem {
  id: string
  group: MobileNotificationGroup
  kind: MobileNotificationKind
  title: string
  body: string
  timeLabel: string
  unread: boolean
  deckMark?: string
  /** Omitted only when nothing in the app answers the notification. */
  destination?: MobileNotificationDestination
}

export interface MobileNotificationsViewModel {
  title: string
  subtitle: string
  items: MobileNotificationItem[]
}
