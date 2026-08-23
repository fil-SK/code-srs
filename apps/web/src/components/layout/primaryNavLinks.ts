export interface PrimaryNavLink {
  to: string
  label: string
  end?: boolean
}

// Single source of truth for the top nav's primary destinations (locked IA:
// Today / Library / Progress). Roadmaps is deliberately excluded (see
// docs/itera-decisions.md D11/D17); Settings is reached from the account menu
// (AccountMenu/AccountMenuContent), not here. "Progress" points at the real
// /progress route; the legacy /stats page it briefly aliased to during the
// label-only rename has since been deleted.
export const primaryNavLinks: PrimaryNavLink[] = [
  { to: '/', label: 'Today', end: true },
  { to: '/decks', label: 'Library' },
  { to: '/progress', label: 'Progress' },
]
