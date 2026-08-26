import { useFocusEffect } from 'expo-router'
import { useCallback } from 'react'

import { useDemoEntities, type DemoEntities } from './demoEntities'
import { useDemoWorkspace } from './demoWorkspaceContext'

// What every demo route needs: the canonical entities, and the instant to judge
// them against.
//
// It exists so the clock rule lives in one place. A phone keeps its screens
// mounted for as long as the app runs, so web's per-mount snapshot would leave
// Today reporting a due count from whenever the tab was first opened, possibly
// hours earlier. Bumping on focus is the smallest correct mechanism: it costs
// nothing while a screen is not being looked at, it makes no timer, and it
// re-reads at the exact moment a learner is about to read a number. The
// provider ignores a same-millisecond bump, so returning to an already-current
// screen is not a re-render.
//
// The seeded history is untouched by any of this - it was generated once, at
// composition, and lives in the repository. Only due-ness is recomputed.

export interface DemoScreen {
  entities: DemoEntities
  now: number
  isLoading: boolean
}

export function useDemoScreen(): DemoScreen {
  const { now, refreshDemoNow } = useDemoWorkspace()
  const { decks, cards, reviewLogs, isLoading } = useDemoEntities()

  useFocusEffect(
    useCallback(() => {
      refreshDemoNow()
    }, [refreshDemoNow]),
  )

  return { entities: { decks, cards, reviewLogs }, now, isLoading }
}
