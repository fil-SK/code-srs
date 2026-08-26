import { pickDashboardMessage } from '@itera/core'
import { useMemo, useState } from 'react'

import { TodayScreen } from '@/src/components/today/TodayScreen'
import { demoTodayViewModel } from '@/src/demo/demoSelectors'
import { useDemoScreen } from '@/src/demo/useDemoScreen'

export default function TodayRoute() {
  const { entities, now } = useDemoScreen()
  // The one random value on this screen, picked once for the life of the mount.
  // Everything else about the demo dataset is deterministic.
  const [greeting] = useState(pickDashboardMessage)
  const viewModel = useMemo(
    () => demoTodayViewModel(entities, greeting, now),
    [entities, greeting, now],
  )

  return <TodayScreen viewModel={viewModel} />
}
