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
    '/review': due.data?.length ?? 0,
    '/drafts': drafts.data?.length ?? 0,
  }
}
