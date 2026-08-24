import { LibraryAllDecksScreen } from '@/src/components/library/LibraryAllDecksScreen'
import { createMobileLibraryFixture } from '@/src/fixtures/library'

export default function LibraryRoute() {
  return <LibraryAllDecksScreen viewModel={createMobileLibraryFixture()} />
}
