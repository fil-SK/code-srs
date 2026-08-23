import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { settingsSections } from './settingsSections'

// The page's own local section navigation, styled with the same selected-row
// language the Library's CollectionNav uses (soft-accent fill plus a left
// accent bar via border-l-2) so the two in-page sidebars read as one system.
export function SettingsNav({ active }: { active: string }) {
  const group1 = settingsSections.filter((s) => s.group === 1)
  const group2 = settingsSections.filter((s) => s.group === 2)

  return (
    <nav aria-label="Account settings sections" className="flex flex-col gap-1">
      {group1.map((section) => (
        <SettingsNavLink key={section.slug} section={section} active={active} />
      ))}
      <div className="my-2 border-t border-itera-border" />
      {group2.map((section) => (
        <SettingsNavLink key={section.slug} section={section} active={active} />
      ))}
    </nav>
  )
}

function SettingsNavLink({
  section,
  active,
}: {
  section: (typeof settingsSections)[number]
  active: string
}) {
  const isActive = section.slug === active
  const Icon = section.icon
  return (
    <NavLink
      to={`/settings/${section.slug}`}
      className={cn(
        'flex items-center gap-2.5 rounded-r-[9px] border-l-2 py-2 pl-2.5 pr-2 text-sm',
        isActive
          ? 'border-itera-accent bg-itera-accent-soft font-semibold text-itera-ink-brand'
          : 'border-transparent text-itera-ink hover:bg-itera-surface-subtle hover:text-itera-ink-brand',
      )}
    >
      <Icon
        size={16}
        aria-hidden="true"
        className={cn('flex-none', isActive ? 'text-itera-accent' : 'text-itera-muted')}
      />
      <span className="min-w-0 truncate">{section.label}</span>
    </NavLink>
  )
}
