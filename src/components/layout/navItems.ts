import {
  LayoutDashboard,
  FolderTree,
  Play,
  LayoutGrid,
  Inbox,
  BarChart3,
  Settings,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string // sidebar label
  short: string // mobile bottom-nav label
  icon: LucideIcon
  badge?: number // placeholder counts until wired to data (M2+)
  title: string // topbar heading
  sub: string // topbar subtitle
}

// Single source of truth for navigation, shared by Sidebar, BottomNav, and the
// topbar title lookup. Badge numbers are placeholders for now.
export const navItems: NavItem[] = [
  {
    to: '/',
    label: 'Dashboard',
    short: 'Home',
    icon: LayoutDashboard,
    title: 'Dashboard',
    sub: 'An overview of what is due',
  },
  {
    to: '/decks',
    label: 'Decks',
    short: 'Decks',
    icon: FolderTree,
    title: 'Decks',
    sub: 'Organize decks and their cards',
  },
  {
    to: '/review',
    label: 'Review',
    short: 'Review',
    icon: Play,
    badge: 24,
    title: 'Review',
    sub: 'Self-grade or auto-grade · FSRS scheduling',
  },
  {
    to: '/browse',
    label: 'Browse',
    short: 'Browse',
    icon: LayoutGrid,
    title: 'Browse',
    sub: 'Search and filter across all decks',
  },
  {
    to: '/drafts',
    label: 'Drafts',
    short: 'Drafts',
    icon: Inbox,
    badge: 3,
    title: 'Drafts',
    sub: 'Capture now, shape into cards later',
  },
  {
    to: '/stats',
    label: 'Stats',
    short: 'Stats',
    icon: BarChart3,
    title: 'Stats',
    sub: 'Progress, retention, and forecast',
  },
  {
    to: '/settings',
    label: 'Settings',
    short: 'Settings',
    icon: Settings,
    title: 'Settings',
    sub: 'Appearance, scheduler, and data',
  },
]

export function findActiveItem(pathname: string): NavItem {
  return (
    navItems.find((item) =>
      item.to === '/' ? pathname === '/' : pathname.startsWith(item.to),
    ) ?? navItems[0]
  )
}
