import { pickDashboardMessage } from '@itera/core'
import { useMemo, useState } from 'react'

import { TodayScreen } from '@/src/components/today/TodayScreen'
import { demoTodayViewModel } from '@/src/demo/demoSelectors'
import { useDemoWorkspace } from '@/src/demo/demoWorkspaceContext'

export default function TodayRoute() {
  const { workspace, now } = useDemoWorkspace()
  // The one random value on this screen, picked once for the life of the mount.
  // Everything else about the demo workspace is deterministic.
  const [greeting] = useState(pickDashboardMessage)
  const viewModel = useMemo(
    () => demoTodayViewModel(workspace, greeting, now),
    [workspace, greeting, now],
  )

  return <TodayScreen viewModel={viewModel} />
}
