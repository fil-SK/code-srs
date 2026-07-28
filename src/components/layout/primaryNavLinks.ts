export interface PrimaryNavLink {
  to: string
  label: string
  end?: boolean
}

// Single source of truth for the top nav's primary destinations (locked IA:
// Today / Library / Progress). Roadmaps is deliberately excluded (see
// docs/itera-decisions.md D11/D17); Settings is reached via ProfileMenu, not
// here. "Progress" now points at the real /progress route (Progress page
// milestone) instead of the legacy /stats it briefly aliased to during the
// label-only rename — /stats itself is left mounted and unmodified as a
// direct-URL safety net, it's just no longer linked from primary nav.
export const primaryNavLinks: PrimaryNavLink[] = [
  { to: '/', label: 'Today', end: true },
  { to: '/decks', label: 'Library' },
  { to: '/progress', label: 'Progress' },
]
