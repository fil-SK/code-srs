import type { DateRangePreset } from '@itera/core'
import { useMemo, useState } from 'react'

import { ProgressScreen } from '@/src/components/progress/ProgressScreen'
import { demoProgressViewModel } from '@/src/demo/demoSelectors'
import { useDemoScreen } from '@/src/demo/useDemoScreen'

// The reported window is the route's state, not the screen's, because it is the
// input to the one selector call that produces everything on the page: the KPI
// block, its period-over-period deltas, the activity grid and the retention
// buckets all move together or the page contradicts its own date line.
export default function ProgressRoute() {
  const { entities, now } = useDemoScreen()
  const [preset, setPreset] = useState<DateRangePreset>('30d')
  const viewModel = useMemo(
    () => demoProgressViewModel(entities, now, preset),
    [entities, now, preset],
  )

  return (
    <ProgressScreen
      onRangePresetChange={setPreset}
      rangePreset={preset}
      viewModel={viewModel}
    />
  )
}
