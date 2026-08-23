import { useMemo } from 'react'
import { useDueCards } from '@/hooks/useCards'

// Live counts shown as nav badges, keyed by route. Keys must match a
// primaryNavLinks `to`, since TopNav is the only consumer and looks badges up
// by link target — a key with no matching link is dead weight.
export function useNavBadges(): Record<string, number> {
  const now = useMemo(() => Date.now(), [])
  const due = useDueCards({ now })

  return {
    // Studying now happens from Today (its hero/"Continue learning" list) and
    // from Library's per-deck "Study now", not a dedicated /review nav entry,
    // so the due count surfaces on the Today link instead.
    '/': due.data?.length ?? 0,
  }
}
