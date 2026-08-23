import { useState } from 'react'

import { TodayScreen } from '@/src/components/today/TodayScreen'
import { createMobileTodayFixture } from '@/src/fixtures/today'

export default function TodayRoute() {
  const [viewModel] = useState(createMobileTodayFixture)

  return <TodayScreen viewModel={viewModel} />
}
