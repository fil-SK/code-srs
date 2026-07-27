export interface PrimaryNavLink {
  to: string
  label: string
  end?: boolean
}

// Single source of truth for the top nav's primary destinations (locked IA:
// Today / Library / Progress). Roadmaps is deliberately excluded (see
// docs/itera-decisions.md D11/D17); Settings is reached via ProfileMenu, not
// here. Paths are unchanged from the old sidebar (/decks, /stats) — only the
// nav *label* changed ("Decks" -> "Library"), so every existing deep link
// and redirect elsewhere in the app keeps working untouched.
export const primaryNavLinks: PrimaryNavLink[] = [
  { to: '/', label: 'Today', end: true },
  { to: '/decks', label: 'Library' },
  { to: '/stats', label: 'Progress' },
]
