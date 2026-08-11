import { isSupabaseConfigured } from '@/data/supabase/client'
import { PlaceholderSection } from './SectionShell'

// The sections the reference mockup draws but this product does not have yet.
// Each states what it is meant to hold, so the page is a readable plan rather
// than a set of dead links.

export function EmailPasswordSection() {
  return (
    <PlaceholderSection
      title="Email & password"
      description="Change the address you sign in with, and manage your password."
      note={
        isSupabaseConfigured
          ? 'Not available yet. Sign-in uses Supabase magic links, so there is no password to change; email changes are not wired up here.'
          : 'Not available yet. This install runs in local mode with no account, so there is nothing to sign in with.'
      }
      planned={['Change email address', 'Set or change a password', 'Active sessions']}
    />
  )
}

export function AppearanceSection() {
  return (
    <PlaceholderSection
      title="Appearance"
      description="How Itera looks."
      note="Not available yet. Itera is light-only for now — its palette has no dark variant, so a theme control would have nothing to switch to. The toggle returns once one exists."
      planned={['Light / dark / system theme', 'Interface density', 'Code font and size']}
    />
  )
}

export function NotificationsSection() {
  return (
    <PlaceholderSection
      title="Notifications"
      description="When and how Itera reminds you to study."
      note="Not available yet. Itera never sends anything — there is no reminder scheduler and no push registration."
      planned={['Daily study reminder', 'Streak-at-risk alerts', 'Email digests']}
    />
  )
}

export function PrivacySection() {
  return (
    <PlaceholderSection
      title="Privacy"
      description="What Itera stores and who can see it."
      note="Not available yet. Nothing is collected: your data is in this browser's IndexedDB, or in your own Supabase project if you configured one. There is no analytics or telemetry to opt out of."
      planned={['Public profile visibility', 'Data collection controls', 'Download all data']}
    />
  )
}

export function ConnectedDevicesSection() {
  return (
    <PlaceholderSection
      title="Connected devices"
      description="Where you're signed in, and what has synced."
      note="Not available yet. There is no device registry — moving data between machines is done through Import / Export, or through Supabase sync if it's configured."
      planned={['Signed-in devices', 'Last sync per device', 'Revoke a device']}
    />
  )
}
