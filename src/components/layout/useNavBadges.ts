import { useMemo } from 'react'
import { useDueCards } from '@/hooks/useCards'
import { useDrafts } from '@/hooks/useDrafts'

// Live counts shown as nav badges, keyed by route. Queries are cached/shared by
// TanStack Query, so calling this in both the sidebar and bottom nav is cheap.
export function useNavBadges(): Record<string, number> {
  const now = useMemo(() => Date.now(), [])
  const due = useDueCards({ now })
  const drafts = useDrafts()

  return {
    // Studying now happens from Today (its hero/"Continue learning" list) and
    // from Library's per-deck "Study now", not a dedicated /review nav entry,
    // so the due count surfaces on the Today link instead.
    '/': due.data?.length ?? 0,
    '/drafts': drafts.data?.length ?? 0,
  }
}
