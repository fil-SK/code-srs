import {
  ArrowUpDown,
  Bell,
  Lock,
  Mail,
  Monitor,
  Palette,
  User,
  type LucideIcon,
} from 'lucide-react'

export interface SettingsSection {
  slug: string
  label: string
  icon: LucideIcon
  /** Sections in the same group sit together above a divider. */
  group: 1 | 2
}

// The Account settings page's own internal navigation. Deliberately NOT
// mirrored into the avatar popover — that menu is quick navigation, and this
// is where the full surface lives.
//
// Billing and Plan & usage appear in the reference mockup and are omitted on
// purpose: this product has no billing concept anywhere, and a settings page
// should not advertise a feature that will never have a backing. Everything
// listed here is at least a real intended destination.
export const settingsSections: SettingsSection[] = [
  { slug: 'profile', label: 'Profile', icon: User, group: 1 },
  { slug: 'email', label: 'Email & password', icon: Mail, group: 1 },
  { slug: 'appearance', label: 'Appearance', icon: Palette, group: 1 },
  { slug: 'notifications', label: 'Notifications', icon: Bell, group: 1 },
  { slug: 'privacy', label: 'Privacy', icon: Lock, group: 1 },
  { slug: 'devices', label: 'Connected devices', icon: Monitor, group: 1 },
  { slug: 'import-export', label: 'Import / Export', icon: ArrowUpDown, group: 2 },
]

export const DEFAULT_SECTION = 'profile'

export function resolveSection(slug: string | undefined): string {
  return settingsSections.some((s) => s.slug === slug) ? slug! : DEFAULT_SECTION
}
