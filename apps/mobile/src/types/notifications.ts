export type MobileNotificationGroup = 'today' | 'earlier'

export type MobileNotificationKind =
  | 'session'
  | 'deck'
  | 'streak'
  | 'retention'
  | 'warning'
  | 'import'
  | 'cards'

export interface MobileNotificationItem {
  id: string
  group: MobileNotificationGroup
  kind: MobileNotificationKind
  title: string
  body: string
  timeLabel: string
  unread: boolean
  deckMark?: string
}

export interface MobileNotificationsViewModel {
  title: string
  subtitle: string
  items: MobileNotificationItem[]
}
