import { useParams } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { useIsWideLibrary } from '@/features/library/shared/useIsWideLibrary'
import { SettingsNav } from './SettingsNav'
import { resolveSection } from './settingsSections'
import { ProfileSection } from './sections/ProfileSection'
import {
  AppearanceSection,
  ConnectedDevicesSection,
  EmailPasswordSection,
  NotificationsSection,
  PrivacySection,
} from './sections/PlaceholderSections'
import { ImportExportSection } from './sections/ImportExportSection'
import { CardSchedulingSection } from './sections/CardSchedulingSection'

// The full Account settings page the avatar menu's first row opens. Its own
// internal navigation lives here (as the mockup draws it) rather than in the
// popover, which stays a compact quick-navigation menu.
//
// Section is addressable as /settings/:section so a section can be linked and
// the browser's back button steps between them; a bare /settings, or a slug
// that does not exist, falls back to Profile.
export function AccountSettingsPage() {
  const { section } = useParams()
  const active = resolveSection(section)
  const isWide = useIsWideLibrary()
  const { identity } = useAuth()
  // The demo workspace's synthetic address would read as a real account here,
  // so it says what it actually is instead.
  const subtitle =
    identity === null
      ? 'Local account — everything is stored in this browser.'
      : identity.kind === 'demo'
        ? 'Demo workspace — everything is stored in this browser.'
        : identity.email

  const body = <SectionBody slug={active} />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-itera-display text-3xl font-extrabold tracking-tight text-itera-ink-brand">
          Account settings
        </h1>
        <p className="mt-1 text-sm text-itera-muted">
          {subtitle}
        </p>
      </div>

      {isWide ? (
        <div className="grid grid-cols-[240px_1fr] items-stretch gap-8">
          <div className="border-r border-itera-border pr-6">
            <SettingsNav active={active} />
          </div>
          <div className="min-w-0">{body}</div>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <SettingsNav active={active} />
          <div className="min-w-0">{body}</div>
        </div>
      )}
    </div>
  )
}

function SectionBody({ slug }: { slug: string }) {
  switch (slug) {
    case 'email':
      return <EmailPasswordSection />
    case 'appearance':
      return <AppearanceSection />
    case 'notifications':
      return <NotificationsSection />
    case 'privacy':
      return <PrivacySection />
    case 'devices':
      return <ConnectedDevicesSection />
    case 'import-export':
      return <ImportExportSection />
    case 'card-scheduling':
      return <CardSchedulingSection />
    default:
      return <ProfileSection />
  }
}
